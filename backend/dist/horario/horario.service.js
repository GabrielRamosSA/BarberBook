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
exports.HorarioService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let HorarioService = class HorarioService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async verificarDonoBarbeiro(barbeiroId, ownerId) {
        const barbeiro = await this.prisma.barbeiro.findUnique({
            where: { id: barbeiroId },
            include: { barbearia: true },
        });
        if (!barbeiro)
            throw new common_1.NotFoundException('Barbeiro não encontrado.');
        if (barbeiro.barbearia.ownerId !== ownerId)
            throw new common_1.ForbiddenException('Sem permissão.');
        return barbeiro;
    }
    async setHorarios(barbeiroId, ownerId, horarios) {
        await this.verificarDonoBarbeiro(barbeiroId, ownerId);
        await this.prisma.horarioDisponivel.deleteMany({
            where: { barbeiroId },
        });
        const created = await this.prisma.horarioDisponivel.createMany({
            data: horarios.map((h) => ({
                barbeiroId,
                diaSemana: h.diaSemana,
                horaInicio: h.horaInicio,
                horaFim: h.horaFim,
                almocoInicio: h.almocoInicio || null,
                almocoFim: h.almocoFim || null,
            })),
        });
        const result = await this.prisma.horarioDisponivel.findMany({
            where: { barbeiroId },
            orderBy: { diaSemana: 'asc' },
        });
        return { message: 'Horários atualizados!', horarios: result };
    }
    async findByBarbeiro(barbeiroId) {
        return this.prisma.horarioDisponivel.findMany({
            where: { barbeiroId },
            orderBy: { diaSemana: 'asc' },
        });
    }
};
exports.HorarioService = HorarioService;
exports.HorarioService = HorarioService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HorarioService);
//# sourceMappingURL=horario.service.js.map