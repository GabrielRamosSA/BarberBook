import {
  Injectable,
  BadRequestException,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  InvalidWebhookSignatureError,
  Invoice,
  MercadoPagoConfig,
  PreApproval,
  WebhookSignatureValidator,
} from 'mercadopago';

type MercadoPagoWebhook = {
  type?: string;
};

type MercadoPagoWebhookSignature = {
  xSignature: string | string[] | undefined;
  xRequestId: string | string[] | undefined;
  dataId: string | string[] | undefined;
};

type PlanoPago = 'PROFISSIONAL' | 'PREMIUM';

type DadosAssinatura = {
  plano: string;
  card_token_id: string;
};

@Injectable()
export class PagamentoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PagamentoService.name);
  private client: MercadoPagoConfig;
  private preApproval: PreApproval;
  private invoice: Invoice;
  private expiracaoTimer: NodeJS.Timeout | null = null;

  private planosPreco: Record<string, number> = {
    PROFISSIONAL: 29.9,
    PREMIUM: 59.9,
  };

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const accessToken =
      this.configService.get<string>('MERCADO_PAGO_ACCESS_TOKEN') || '';
    this.client = new MercadoPagoConfig({ accessToken });
    this.preApproval = new PreApproval(this.client);
    this.invoice = new Invoice(this.client);
  }

  obterConfiguracaoPublica() {
    const publicKey = this.configService
      .get<string>('MERCADO_PAGO_PUBLIC_KEY')
      ?.trim();

    if (!publicKey) {
      throw new ServiceUnavailableException(
        'O pagamento está temporariamente indisponível.',
      );
    }

    return { publicKey };
  }

  private validarConfiguracaoPrivada() {
    const accessToken = this.configService
      .get<string>('MERCADO_PAGO_ACCESS_TOKEN')
      ?.trim();

    if (!accessToken) {
      throw new ServiceUnavailableException(
        'O pagamento está temporariamente indisponível.',
      );
    }
  }

  private obterUrlRetorno() {
    const backendUrl = this.configService.get<string>('BACKEND_URL')?.trim();

    if (!backendUrl) {
      throw new ServiceUnavailableException(
        'A URL de retorno do pagamento não foi configurada.',
      );
    }

    try {
      return new URL('/api/pagamento/retorno', backendUrl).toString();
    } catch {
      throw new ServiceUnavailableException(
        'A URL de retorno do pagamento é inválida.',
      );
    }
  }

  private obterPlanoDaAssinatura(reason?: string): PlanoPago | null {
    const descricao = reason?.toUpperCase() || '';

    if (descricao.includes('PREMIUM')) return 'PREMIUM';
    if (descricao.includes('PROFISSIONAL')) return 'PROFISSIONAL';

    return null;
  }

  private calcularFimDoPeriodo(planoExpiraEm?: Date | null) {
    if (planoExpiraEm && planoExpiraEm > new Date()) {
      return planoExpiraEm;
    }

    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
  }

  private obterDataValida(valor?: string | null) {
    if (!valor) return null;

    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  private obterMensagemErro(error: unknown) {
    return error instanceof Error ? error.message : 'Erro desconhecido.';
  }

  async onModuleInit() {
    await this.executarVerificacaoExpirados('startup');
    this.agendarProximaVerificacao();
  }

  onModuleDestroy() {
    if (this.expiracaoTimer) {
      clearTimeout(this.expiracaoTimer);
      this.expiracaoTimer = null;
    }
  }

  private agendarProximaVerificacao() {
    if (this.expiracaoTimer) {
      clearTimeout(this.expiracaoTimer);
      this.expiracaoTimer = null;
    }

    const agora = new Date();
    const proxima = new Date(agora);
    proxima.setDate(proxima.getDate() + 1);
    proxima.setHours(0, 5, 0, 0);

    const msAteProxima = Math.max(10_000, proxima.getTime() - agora.getTime());

    this.expiracaoTimer = setTimeout(() => {
      void this.executarVerificacaoAgendada();
    }, msAteProxima);

    this.logger.log(
      `Proxima verificacao de planos expirados agendada para ${proxima.toISOString()}.`,
    );
  }

  private async executarVerificacaoExpirados(origem: 'startup' | 'diaria') {
    try {
      const resultado = await this.verificarPlanosExpirados();
      if (resultado.downgraded > 0) {
        this.logger.log(
          `[${origem}] ${resultado.downgraded} usuario(s) tiveram downgrade para BASICO por expiracao.`,
        );
      } else {
        this.logger.log(`[${origem}] Nenhum plano expirado para downgrade.`);
      }
    } catch (error: unknown) {
      this.logger.error(
        `[${origem}] Falha ao verificar planos expirados: ${this.obterMensagemErro(error)}`,
      );
    }
  }

  private async executarVerificacaoAgendada() {
    await this.executarVerificacaoExpirados('diaria');
    this.agendarProximaVerificacao();
  }

  // ============================
  // Criar assinatura recorrente
  // ============================
  async criarAssinatura(userId: string, data: DadosAssinatura) {
    const preco = this.planosPreco[data.plano];
    if (!preco) {
      throw new BadRequestException('Plano inválido.');
    }

    if (!data.card_token_id) {
      throw new BadRequestException('Token do cartão é obrigatório.');
    }

    // Verificar se já tem assinatura ativa
    this.validarConfiguracaoPrivada();
    const backUrl = this.obterUrlRetorno();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    if (
      user.subscriptionId &&
      ['authorized', 'pending'].includes(user.subscriptionStatus || '')
    ) {
      throw new BadRequestException(
        'Você já possui uma assinatura ativa. Cancele a atual antes de assinar outro plano.',
      );
    }

    try {
      const resultado = await this.preApproval.create({
        body: {
          reason: `CortaAí - Plano ${data.plano}`,
          external_reference: userId,
          // O e-mail é obtido da conta autenticada, não do corpo que pode ser alterado no navegador.
          payer_email: user.email,
          card_token_id: data.card_token_id,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: preco,
            currency_id: 'BRL',
          },
          back_url: backUrl,
          status: 'authorized',
        },
      });

      // Com card_token_id, a assinatura é criada diretamente
      if (!resultado.id) {
        throw new BadRequestException(
          'O Mercado Pago não retornou o identificador da assinatura.',
        );
      }

      const statusMercadoPago = resultado.status || 'pending';
      const statusInterno =
        statusMercadoPago === 'authorized' ? 'pending' : statusMercadoPago;

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionId: resultado.id,
          // "authorized" confirma a autorização da recorrência. O plano só
          // é liberado após o webhook da cobrança aprovada.
          subscriptionStatus: statusInterno,
        },
      });

      return {
        status: statusInterno,
        mercadoPagoStatus: statusMercadoPago,
        subscriptionId: resultado.id,
        message:
          statusMercadoPago === 'authorized'
            ? 'Assinatura autorizada. Seu plano será liberado após a confirmação do primeiro pagamento.'
            : 'Assinatura pendente de aprovação.',
      };
    } catch (error: unknown) {
      this.logger.error(
        `Falha ao criar assinatura: ${this.obterMensagemErro(error)}`,
      );
      throw new BadRequestException(
        'Erro ao criar assinatura. Tente novamente.',
      );
    }
  }

  // ============================
  // Cancelar assinatura
  // ============================
  async cancelarAssinatura(userId: string) {
    this.validarConfiguracaoPrivada();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user?.subscriptionId) {
      throw new BadRequestException('Nenhuma assinatura encontrada.');
    }

    try {
      await this.preApproval.update({
        id: user.subscriptionId,
        body: { status: 'cancelled' },
      });

      // Manter plano até o vencimento (fim do período pago)
      const fimPeriodo =
        user.plano === 'BASICO'
          ? null
          : this.calcularFimDoPeriodo(user.planoExpiraEm);

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'cancelled',
          planoExpiraEm: fimPeriodo,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          plano: true,
          avatar: true,
          telefone: true,
        },
      });

      return {
        status: 'cancelled',
        message: fimPeriodo
          ? `Assinatura cancelada. Seu plano ${user.plano} ficará ativo até ${fimPeriodo.toLocaleDateString('pt-BR')}.`
          : 'Assinatura cancelada.',
        planoExpiraEm: fimPeriodo,
        planoAtual: user.plano,
        user: updatedUser,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Falha ao cancelar assinatura: ${this.obterMensagemErro(error)}`,
      );
      throw new BadRequestException('Erro ao cancelar assinatura.');
    }
  }

  // ============================
  // Consultar status da assinatura
  // ============================
  async consultarAssinatura(userId: string) {
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        plano: true,
        subscriptionId: true,
        subscriptionStatus: true,
        planoExpiraEm: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    const agora = new Date();
    const expirou = !!user.planoExpiraEm && user.planoExpiraEm <= agora;

    // Garante consistência imediata quando a data de expiração já passou,
    // sem depender apenas da rotina diária de verificação.
    if (expirou && user.subscriptionStatus !== 'authorized') {
      user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          plano: 'BASICO',
          subscriptionId: null,
          subscriptionStatus: null,
          planoExpiraEm: null,
        },
        select: {
          plano: true,
          subscriptionId: true,
          subscriptionStatus: true,
          planoExpiraEm: true,
        },
      });
    }

    return {
      plano: user.plano,
      subscriptionId: user.subscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      planoExpiraEm: user.planoExpiraEm,
      assinaturaAtiva: Boolean(
        user.subscriptionId &&
        ['authorized', 'pending'].includes(user.subscriptionStatus || ''),
      ),
    };
  }

  // ============================
  // Webhook - MP notifica status
  // ============================
  async processarWebhook(
    data: MercadoPagoWebhook,
    signature: MercadoPagoWebhookSignature,
  ) {
    const dataId = this.obterDataId(signature.dataId);
    this.validarAssinaturaWebhook({ ...signature, dataId });
    this.validarConfiguracaoPrivada();

    if (data.type === 'subscription_authorized_payment') {
      return this.processarCobrancaAutorizada(dataId);
    }

    if (data.type !== 'subscription_preapproval') return { ok: true };

    try {
      const subscription = await this.preApproval.get({ id: dataId });

      if (!subscription.external_reference) return { ok: true };

      const userId = subscription.external_reference;

      if (
        subscription.status === 'cancelled' ||
        subscription.status === 'paused'
      ) {
        // Assinatura cancelada/pausada - agendar downgrade
        const usuario = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { plano: true, planoExpiraEm: true },
        });
        const fimPeriodo =
          usuario?.plano === 'BASICO'
            ? null
            : this.calcularFimDoPeriodo(usuario?.planoExpiraEm);

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionId: subscription.id || dataId,
            subscriptionStatus: subscription.status,
            planoExpiraEm: fimPeriodo,
          },
        });
      } else if (subscription.status === 'pending') {
        // A autorização ainda aguarda a confirmação da primeira cobrança.
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionId: subscription.id || dataId,
            subscriptionStatus: 'pending',
          },
        });
      } else {
        await this.prisma.user.update({
          where: { id: userId },
          data: { subscriptionId: subscription.id || dataId },
        });
      }

      return { ok: true };
    } catch (error: unknown) {
      this.logger.error(
        `Falha ao processar webhook: ${this.obterMensagemErro(error)}`,
      );
      throw error;
    }
  }

  private obterDataId(dataId: string | string[] | undefined) {
    const id = Array.isArray(dataId) ? dataId[0] : dataId;

    if (!id?.trim()) {
      throw new BadRequestException('Notificação do Mercado Pago sem data.id.');
    }

    return id;
  }

  private validarAssinaturaWebhook(signature: MercadoPagoWebhookSignature) {
    const secret = this.configService
      .get<string>('MERCADO_PAGO_WEBHOOK_SECRET')
      ?.trim();

    if (!secret) {
      this.logger.error(
        'Webhook do Mercado Pago recebido sem MERCADO_PAGO_WEBHOOK_SECRET configurado.',
      );
      throw new ServiceUnavailableException(
        'Webhook de pagamento temporariamente indisponível.',
      );
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature: signature.xSignature,
        xRequestId: signature.xRequestId,
        dataId: signature.dataId,
        secret,
        toleranceSeconds: 300,
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        this.logger.warn(
          `Assinatura de webhook inválida: ${error.reason}; requestId=${error.requestId || 'ausente'}.`,
        );
        throw new UnauthorizedException('Assinatura de webhook inválida.');
      }

      throw error;
    }
  }

  private async processarCobrancaAutorizada(dataId: string) {
    try {
      const invoice = await this.invoice.get({ id: dataId });
      const statusPagamento = invoice.payment?.status;

      if (statusPagamento !== 'approved') {
        this.logger.warn(
          `Cobrança recorrente ${dataId} não aprovada (${statusPagamento || 'sem status'}).`,
        );
        return { ok: true };
      }

      if (!invoice.preapproval_id) {
        throw new Error(`Cobrança recorrente ${dataId} sem preapproval_id.`);
      }

      const subscription = await this.preApproval.get({
        id: invoice.preapproval_id,
      });

      if (subscription.status !== 'authorized') {
        throw new Error(
          `Cobrança recorrente ${dataId} recebida antes da assinatura ficar autorizada.`,
        );
      }

      if (!subscription.external_reference) {
        throw new Error(
          `Assinatura ${invoice.preapproval_id} sem external_reference.`,
        );
      }

      const plano = this.obterPlanoDaAssinatura(subscription.reason);
      if (!plano) {
        throw new Error(
          `Assinatura ${invoice.preapproval_id} com plano não reconhecido.`,
        );
      }

      await this.prisma.user.update({
        where: { id: subscription.external_reference },
        data: {
          subscriptionId: subscription.id || invoice.preapproval_id,
          subscriptionStatus: 'authorized',
          plano,
          planoExpiraEm: this.obterDataValida(subscription.next_payment_date),
        },
      });

      this.logger.log(
        `Cobrança recorrente ${dataId} aprovada e plano ${plano} ativado.`,
      );
      return { ok: true };
    } catch (error: unknown) {
      this.logger.error(
        `Falha ao processar cobrança recorrente: ${this.obterMensagemErro(error)}`,
      );
      throw error;
    }
  }

  // ============================
  // Verificar planos expirados
  // ============================
  async verificarPlanosExpirados() {
    const agora = new Date();

    const expirados = await this.prisma.user.findMany({
      where: {
        planoExpiraEm: { lte: agora },
        plano: { not: 'BASICO' },
        subscriptionStatus: { in: ['cancelled', 'paused'] },
      },
    });

    for (const user of expirados) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          plano: 'BASICO',
          subscriptionId: null,
          subscriptionStatus: null,
          planoExpiraEm: null,
        },
      });
    }

    return { downgraded: expirados.length };
  }
}
