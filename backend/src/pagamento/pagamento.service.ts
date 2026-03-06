import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';

@Injectable()
export class PagamentoService {
  private client: MercadoPagoConfig;
  private preApproval: PreApproval;

  private planosPreco: Record<string, number> = {
    PROFISSIONAL: 29.9,
    PREMIUM: 59.9,
  };

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const accessToken = this.configService.get<string>('MERCADO_PAGO_ACCESS_TOKEN') || '';
    this.client = new MercadoPagoConfig({ accessToken });
    this.preApproval = new PreApproval(this.client);
  }

  // ============================
  // Criar assinatura recorrente
  // ============================
  async criarAssinatura(userId: string, data: {
    plano: string;
    email: string;
    card_token_id: string;
  }) {
    const preco = this.planosPreco[data.plano];
    if (!preco) {
      throw new BadRequestException('Plano inválido.');
    }

    if (!data.card_token_id) {
      throw new BadRequestException('Token do cartão é obrigatório.');
    }

    // Verificar se já tem assinatura ativa
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.subscriptionId && user?.subscriptionStatus === 'authorized') {
      throw new BadRequestException('Você já possui uma assinatura ativa. Cancele a atual antes de assinar outro plano.');
    }

    try {
      const backUrl = this.configService.get<string>('FRONTEND_URL') || 'https://cortaai.com.br';

      const resultado = await this.preApproval.create({
        body: {
          reason: `CortaAí - Plano ${data.plano}`,
          external_reference: userId,
          payer_email: data.email,
          card_token_id: data.card_token_id,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: preco,
            currency_id: 'BRL',
          },
          back_url: `${backUrl}/api/pagamento/retorno`,
          status: 'authorized',
        },
      });

      // Com card_token_id, a assinatura é criada diretamente
      const status = resultado.status || 'pending';

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionId: resultado.id,
          subscriptionStatus: status,
          plano: status === 'authorized' ? data.plano as any : undefined,
        },
      });

      return {
        status,
        subscriptionId: resultado.id,
        message: status === 'authorized'
          ? 'Assinatura realizada com sucesso!'
          : 'Assinatura pendente de aprovação.',
      };
    } catch (error: any) {
      console.error('Erro Mercado Pago Assinatura:', error?.message || error);
      console.error('Detalhes:', JSON.stringify(error?.cause || error, null, 2));
      const msg = error?.cause?.[0]?.description
        || error?.message
        || 'Erro ao criar assinatura. Tente novamente.';
      throw new BadRequestException(msg);
    }
  }

  // ============================
  // Cancelar assinatura
  // ============================
  async cancelarAssinatura(userId: string) {
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
      const agora = new Date();
      const fimPeriodo = new Date(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());

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
        message: `Assinatura cancelada. Seu plano ${user.plano} ficará ativo até ${fimPeriodo.toLocaleDateString('pt-BR')}.`,
        user: updatedUser,
      };
    } catch (error: any) {
      console.error('Erro ao cancelar assinatura:', error?.message || error);
      throw new BadRequestException('Erro ao cancelar assinatura.');
    }
  }

  // ============================
  // Consultar status da assinatura
  // ============================
  async consultarAssinatura(userId: string) {
    const user = await this.prisma.user.findUnique({
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

    return {
      plano: user.plano,
      subscriptionId: user.subscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      planoExpiraEm: user.planoExpiraEm,
      assinaturaAtiva: user.subscriptionStatus === 'authorized',
    };
  }

  // ============================
  // Webhook - MP notifica status
  // ============================
  async processarWebhook(data: { type: string; data: { id: string } }) {
    if (data.type !== 'subscription_preapproval') return { ok: true };

    try {
      const subscription = await this.preApproval.get({ id: data.data.id });

      if (!subscription.external_reference) return { ok: true };

      const userId = subscription.external_reference;

      if (subscription.status === 'cancelled' || subscription.status === 'paused') {
        // Assinatura cancelada/pausada - agendar downgrade
        const agora = new Date();
        const fimPeriodo = new Date(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: subscription.status,
            planoExpiraEm: fimPeriodo,
          },
        });
      } else if (subscription.status === 'authorized') {
        // Pagamento recorrente aprovado - manter/atualizar plano
        const planoNome = subscription.reason?.includes('PREMIUM') ? 'PREMIUM' : 'PROFISSIONAL';

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            plano: planoNome as any,
            subscriptionStatus: 'authorized',
            planoExpiraEm: null,
          },
        });
      }

      return { ok: true };
    } catch (error: any) {
      console.error('Erro webhook:', error?.message || error);
      return { ok: true }; // Retorna 200 para MP não reenviar
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
