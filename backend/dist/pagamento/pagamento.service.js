"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PagamentoService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const mercadopago_1 = require("mercadopago");
let PagamentoService = class PagamentoService {
    configService;
    prisma;
    client;
    preApproval;
    planosPreco = {
        PROFISSIONAL: 29.9,
        PREMIUM: 59.9,
    };
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        const accessToken = this.configService.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
        this.client = new mercadopago_1.MercadoPagoConfig({ accessToken });
        this.preApproval = new mercadopago_1.PreApproval(this.client);
    }
    async criarAssinatura(userId, data) {
        const preco = this.planosPreco[data.plano];
        if (!preco) {
            throw new common_1.BadRequestException('Plano inválido.');
        }
        if (!data.card_token_id) {
            throw new common_1.BadRequestException('Token do cartão é obrigatório.');
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (user?.subscriptionId && user?.subscriptionStatus === 'authorized') {
            throw new common_1.BadRequestException('Você já possui uma assinatura ativa. Cancele a atual antes de assinar outro plano.');
        }
        try {
            const backUrl = this.configService.get('FRONTEND_URL') || 'https://cortaai.com.br';
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
            const status = resultado.status || 'pending';
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    subscriptionId: resultado.id,
                    subscriptionStatus: status,
                    plano: status === 'authorized' ? data.plano : undefined,
                },
            });
            return {
                status,
                subscriptionId: resultado.id,
                message: status === 'authorized'
                    ? 'Assinatura realizada com sucesso!'
                    : 'Assinatura pendente de aprovação.',
            };
        }
        catch (error) {
            console.error('Erro Mercado Pago Assinatura:', error?.message || error);
            console.error('Detalhes:', JSON.stringify(error?.cause || error, null, 2));
            const msg = error?.cause?.[0]?.description
                || error?.message
                || 'Erro ao criar assinatura. Tente novamente.';
            throw new common_1.BadRequestException(msg);
        }
    }
    async cancelarAssinatura(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.subscriptionId) {
            throw new common_1.BadRequestException('Nenhuma assinatura encontrada.');
        }
        try {
            await this.preApproval.update({
                id: user.subscriptionId,
                body: { status: 'cancelled' },
            });
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
        }
        catch (error) {
            console.error('Erro ao cancelar assinatura:', error?.message || error);
            throw new common_1.BadRequestException('Erro ao cancelar assinatura.');
        }
    }
    async consultarAssinatura(userId) {
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
            throw new common_1.BadRequestException('Usuário não encontrado.');
        }
        return {
            plano: user.plano,
            subscriptionId: user.subscriptionId,
            subscriptionStatus: user.subscriptionStatus,
            planoExpiraEm: user.planoExpiraEm,
            assinaturaAtiva: user.subscriptionStatus === 'authorized',
        };
    }
    async processarWebhook(data) {
        if (data.type !== 'subscription_preapproval')
            return { ok: true };
        try {
            const subscription = await this.preApproval.get({ id: data.data.id });
            if (!subscription.external_reference)
                return { ok: true };
            const userId = subscription.external_reference;
            if (subscription.status === 'cancelled' || subscription.status === 'paused') {
                const agora = new Date();
                const fimPeriodo = new Date(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        subscriptionStatus: subscription.status,
                        planoExpiraEm: fimPeriodo,
                    },
                });
            }
            else if (subscription.status === 'authorized') {
                const planoNome = subscription.reason?.includes('PREMIUM') ? 'PREMIUM' : 'PROFISSIONAL';
                await this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        plano: planoNome,
                        subscriptionStatus: 'authorized',
                        planoExpiraEm: null,
                    },
                });
            }
            return { ok: true };
        }
        catch (error) {
            console.error('Erro webhook:', error?.message || error);
            return { ok: true };
        }
    }
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
};
exports.PagamentoService = PagamentoService;
exports.PagamentoService = PagamentoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], PagamentoService);
//# sourceMappingURL=pagamento.service.js.map