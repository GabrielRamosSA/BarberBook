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
exports.ServicoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const plano_config_1 = require("../plano/plano.config");
let ServicoService = class ServicoService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async verificarDono(barbeariaId, ownerId) {
        const barbearia = await this.prisma.barbearia.findUnique({
            where: { id: barbeariaId },
        });
        if (!barbearia)
            throw new common_1.NotFoundException('Barbearia não encontrada.');
        if (barbearia.ownerId !== ownerId)
            throw new common_1.ForbiddenException('Sem permissão.');
        return barbearia;
    }
    async create(barbeariaId, ownerId, data) {
        await this.verificarDono(barbeariaId, ownerId);
        const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
        const limites = plano_config_1.PLANO_LIMITES[user?.plano || 'BASICO'];
        if (limites.maxServicosPorBarbeiro !== -1 && data.barbeiroId) {
            const count = await this.prisma.servico.count({
                where: { barbeiroId: data.barbeiroId, ativo: true },
            });
            if (count >= limites.maxServicosPorBarbeiro) {
                throw new common_1.BadRequestException(`Seu plano ${user?.plano || 'BASICO'} permite no máximo ${limites.maxServicosPorBarbeiro} serviço(s) por barbeiro. Faça upgrade para adicionar mais.`);
            }
        }
        const servico = await this.prisma.servico.create({
            data: {
                nome: data.nome,
                preco: data.preco,
                duracao: data.duracao,
                barbeariaId,
                barbeiroId: data.barbeiroId || null,
            },
        });
        return { message: 'Serviço adicionado!', servico };
    }
    async findByBarbearia(barbeariaId) {
        return this.prisma.servico.findMany({
            where: { barbeariaId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async update(id, ownerId, data) {
        const servico = await this.prisma.servico.findUnique({
            where: { id },
            include: { barbearia: true },
        });
        if (!servico)
            throw new common_1.NotFoundException('Serviço não encontrado.');
        if (servico.barbearia.ownerId !== ownerId)
            throw new common_1.ForbiddenException('Sem permissão.');
        const updated = await this.prisma.servico.update({
            where: { id },
            data,
        });
        return { message: 'Serviço atualizado!', servico: updated };
    }
    async delete(id, ownerId) {
        const servico = await this.prisma.servico.findUnique({
            where: { id },
            include: { barbearia: true },
        });
        if (!servico)
            throw new common_1.NotFoundException('Serviço não encontrado.');
        if (servico.barbearia.ownerId !== ownerId)
            throw new common_1.ForbiddenException('Sem permissão.');
        await this.prisma.servico.delete({ where: { id } });
        return { message: 'Serviço removido!' };
    }
};
exports.ServicoService = ServicoService;
exports.ServicoService = ServicoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ServicoService);
//# sourceMappingURL=servico.service.js.map