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
exports.AgendamentoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const plano_config_1 = require("../plano/plano.config");
let AgendamentoService = class AgendamentoService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async contarAgendamentosMes(ownerId) {
        const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
        const plano = user?.plano || 'BASICO';
        const limites = plano_config_1.PLANO_LIMITES[plano];
        const barbearias = await this.prisma.barbearia.findMany({
            where: { ownerId },
            select: { id: true },
        });
        const mesAtual = new Date().toISOString().substring(0, 7);
        const count = await this.prisma.agendamento.count({
            where: {
                barbeariaId: { in: barbearias.map(b => b.id) },
                data: { startsWith: mesAtual },
                status: { not: 'CANCELADO' },
            },
        });
        return {
            usado: count,
            limite: limites.maxAgendamentosMes,
            plano,
        };
    }
    async create(data) {
        const telDigits = data.telefoneCliente.replace(/\D/g, '');
        if (telDigits.length < 10 || telDigits.length > 11) {
            throw new common_1.BadRequestException('Telefone inválido. Informe DDD + número (10 ou 11 dígitos).');
        }
        const barbearia = await this.prisma.barbearia.findUnique({
            where: { id: data.barbeariaId },
            include: { owner: { select: { id: true, plano: true } } },
        });
        if (barbearia) {
            const limites = plano_config_1.PLANO_LIMITES[barbearia.owner.plano || 'BASICO'];
            if (limites.maxAgendamentosMes !== -1) {
                const barbearias = await this.prisma.barbearia.findMany({
                    where: { ownerId: barbearia.ownerId },
                    select: { id: true },
                });
                const mesAtual = data.data.substring(0, 7);
                const count = await this.prisma.agendamento.count({
                    where: {
                        barbeariaId: { in: barbearias.map(b => b.id) },
                        data: { startsWith: mesAtual },
                        status: { not: 'CANCELADO' },
                    },
                });
                if (count >= limites.maxAgendamentosMes) {
                    throw new common_1.BadRequestException(`A barbearia atingiu o limite de ${limites.maxAgendamentosMes} agendamentos/mês do plano ${barbearia.owner.plano}. O dono precisa fazer upgrade.`);
                }
            }
        }
        const agendamento = await this.prisma.agendamento.create({
            data: {
                data: data.data,
                horario: data.horario,
                nomeCliente: data.nomeCliente,
                telefoneCliente: data.telefoneCliente,
                barbeariaId: data.barbeariaId,
                barbeiroId: data.barbeiroId,
                servicoId: data.servicoId,
                userId: data.userId || null,
            },
            include: {
                barbearia: { select: { id: true, nome: true, endereco: true, telefone: true } },
                barbeiro: { select: { id: true, nome: true, foto: true } },
                servico: { select: { id: true, nome: true, preco: true, duracao: true } },
            },
        });
        return { message: 'Agendamento realizado com sucesso!', agendamento };
    }
    async findByUser(userId) {
        return this.prisma.agendamento.findMany({
            where: { userId },
            include: {
                barbearia: { select: { id: true, nome: true, endereco: true, telefone: true, slug: true } },
                barbeiro: { select: { id: true, nome: true, foto: true } },
                servico: { select: { id: true, nome: true, preco: true, duracao: true } },
            },
            orderBy: [{ data: 'desc' }, { horario: 'desc' }],
        });
    }
    async findByBarbearia(barbeariaId) {
        return this.prisma.agendamento.findMany({
            where: { barbeariaId },
            include: {
                barbeiro: { select: { id: true, nome: true, foto: true } },
                servico: { select: { id: true, nome: true, preco: true, duracao: true } },
            },
            orderBy: [{ data: 'asc' }, { horario: 'asc' }],
        });
    }
    async findByOwner(ownerId, data) {
        const barbearias = await this.prisma.barbearia.findMany({
            where: { ownerId },
            select: { id: true },
        });
        const barbeariaIds = barbearias.map((b) => b.id);
        if (barbeariaIds.length === 0)
            return [];
        const where = { barbeariaId: { in: barbeariaIds } };
        if (data)
            where.data = data;
        return this.prisma.agendamento.findMany({
            where,
            include: {
                user: { select: { id: true, nome: true, avatar: true, telefone: true } },
                barbearia: { select: { id: true, nome: true } },
                barbeiro: { select: { id: true, nome: true, foto: true } },
                servico: { select: { id: true, nome: true, preco: true, duracao: true } },
            },
            orderBy: [{ data: 'asc' }, { horario: 'asc' }],
        });
    }
    async updateStatus(id, ownerId, status) {
        const agendamento = await this.prisma.agendamento.findUnique({
            where: { id },
            include: { barbearia: { select: { ownerId: true } } },
        });
        if (!agendamento)
            throw new common_1.NotFoundException('Agendamento não encontrado.');
        if (agendamento.barbearia.ownerId !== ownerId)
            throw new common_1.ForbiddenException('Sem permissão.');
        const updated = await this.prisma.agendamento.update({
            where: { id },
            data: { status },
        });
        return { message: 'Status atualizado.', agendamento: updated };
    }
    async cancelar(id, userId) {
        const agendamento = await this.prisma.agendamento.findUnique({
            where: { id },
        });
        if (!agendamento)
            throw new common_1.NotFoundException('Agendamento não encontrado.');
        if (agendamento.userId !== userId)
            throw new common_1.ForbiddenException('Sem permissão.');
        const updated = await this.prisma.agendamento.update({
            where: { id },
            data: { status: 'CANCELADO' },
        });
        return { message: 'Agendamento cancelado.', agendamento: updated };
    }
    async findByTelefone(telefone) {
        const tel = telefone.replace(/\D/g, '');
        return this.prisma.agendamento.findMany({
            where: {
                telefoneCliente: { contains: tel },
                userId: null,
            },
            include: {
                barbearia: { select: { id: true, nome: true, endereco: true, telefone: true, slug: true } },
                barbeiro: { select: { id: true, nome: true, foto: true } },
                servico: { select: { id: true, nome: true, preco: true, duracao: true } },
            },
            orderBy: [{ data: 'desc' }, { horario: 'desc' }],
        });
    }
    async cancelarPorTelefone(id, telefone) {
        const tel = telefone.replace(/\D/g, '');
        const agendamento = await this.prisma.agendamento.findUnique({
            where: { id },
        });
        if (!agendamento)
            throw new common_1.NotFoundException('Agendamento não encontrado.');
        if (!agendamento.telefoneCliente.replace(/\D/g, '').includes(tel)) {
            throw new common_1.ForbiddenException('Telefone não confere.');
        }
        if (agendamento.userId) {
            throw new common_1.ForbiddenException('Este agendamento pertence a um usuário cadastrado.');
        }
        const updated = await this.prisma.agendamento.update({
            where: { id },
            data: { status: 'CANCELADO' },
        });
        return { message: 'Agendamento cancelado.', agendamento: updated };
    }
    async findClientesByOwner(ownerId) {
        const barbearias = await this.prisma.barbearia.findMany({
            where: { ownerId },
            select: { id: true },
        });
        const barbeariaIds = barbearias.map((b) => b.id);
        if (barbeariaIds.length === 0)
            return [];
        const agendamentos = await this.prisma.agendamento.findMany({
            where: { barbeariaId: { in: barbeariaIds } },
            include: {
                user: { select: { id: true, nome: true, avatar: true, email: true, telefone: true } },
                barbearia: { select: { id: true, nome: true } },
                barbeiro: { select: { id: true, nome: true } },
                servico: { select: { id: true, nome: true, preco: true, duracao: true } },
            },
            orderBy: [{ data: 'desc' }, { horario: 'desc' }],
        });
        const clientesMap = new Map();
        for (const ag of agendamentos) {
            const key = ag.userId || `tel:${ag.telefoneCliente}`;
            if (!clientesMap.has(key)) {
                clientesMap.set(key, {
                    id: key,
                    nome: ag.user?.nome || ag.nomeCliente,
                    telefone: ag.user?.telefone || ag.telefoneCliente,
                    email: ag.user?.email || null,
                    avatar: ag.user?.avatar || null,
                    cadastrado: !!ag.userId,
                    totalAgendamentos: 0,
                    totalConcluidos: 0,
                    totalCancelados: 0,
                    totalGasto: 0,
                    ultimoAgendamento: null,
                    primeiroAgendamento: null,
                    servicos: new Set(),
                    agendamentos: [],
                });
            }
            const cliente = clientesMap.get(key);
            cliente.totalAgendamentos++;
            if (ag.status === 'CONCLUIDO') {
                cliente.totalConcluidos++;
                cliente.totalGasto += ag.servico.preco;
            }
            if (ag.status === 'CANCELADO')
                cliente.totalCancelados++;
            cliente.servicos.add(ag.servico.nome);
            if (!cliente.ultimoAgendamento) {
                cliente.ultimoAgendamento = { data: ag.data, horario: ag.horario, status: ag.status };
            }
            cliente.primeiroAgendamento = { data: ag.data, horario: ag.horario };
            cliente.agendamentos.push({
                id: ag.id,
                data: ag.data,
                horario: ag.horario,
                status: ag.status,
                servico: ag.servico,
                barbeiro: ag.barbeiro,
                barbearia: ag.barbearia,
            });
        }
        return Array.from(clientesMap.values()).map((c) => ({
            ...c,
            servicos: Array.from(c.servicos),
        }));
    }
    async horariosOcupados(barbeiroId, data) {
        const agendamentos = await this.prisma.agendamento.findMany({
            where: {
                barbeiroId,
                data,
                status: { notIn: ['CANCELADO'] },
            },
            select: { horario: true },
        });
        return agendamentos.map((a) => a.horario);
    }
    async findLembretesPendentes(ownerId) {
        const barbearias = await this.prisma.barbearia.findMany({
            where: { ownerId, lembreteAtivo: true, mensagemLembrete: { not: null } },
            select: { id: true, nome: true, mensagemLembrete: true },
        });
        if (barbearias.length === 0)
            return [];
        const barbeariaIds = barbearias.map((b) => b.id);
        const barbeariaMap = new Map(barbearias.map((b) => [b.id, b]));
        const agora = new Date();
        const hoje = agora.toISOString().split('T')[0];
        const agoraMinutos = agora.getHours() * 60 + agora.getMinutes();
        const limiteMinutos = agoraMinutos + 30;
        const agendamentos = await this.prisma.agendamento.findMany({
            where: {
                barbeariaId: { in: barbeariaIds },
                data: hoje,
                status: { notIn: ['CANCELADO', 'CONCLUIDO'] },
                lembreteEnviado: false,
            },
            include: {
                barbearia: { select: { id: true, nome: true, mensagemLembrete: true } },
                barbeiro: { select: { id: true, nome: true } },
                servico: { select: { id: true, nome: true, preco: true, duracao: true } },
            },
            orderBy: { horario: 'asc' },
        });
        return agendamentos.filter((ag) => {
            const [h, m] = ag.horario.split(':').map(Number);
            const agMinutos = h * 60 + m;
            return agMinutos > agoraMinutos && agMinutos <= limiteMinutos;
        }).map((ag) => {
            const barbearia = barbeariaMap.get(ag.barbeariaId);
            let mensagem = barbearia?.mensagemLembrete || '';
            mensagem = mensagem
                .replace(/{nome}/g, ag.nomeCliente)
                .replace(/{servico}/g, ag.servico.nome)
                .replace(/{horario}/g, ag.horario)
                .replace(/{data}/g, ag.data.split('-').reverse().join('/'))
                .replace(/{barbearia}/g, ag.barbearia.nome)
                .replace(/{barbeiro}/g, ag.barbeiro.nome);
            return {
                ...ag,
                mensagemFormatada: mensagem,
            };
        });
    }
    async marcarLembreteEnviado(id, ownerId) {
        const agendamento = await this.prisma.agendamento.findUnique({
            where: { id },
            include: { barbearia: { select: { ownerId: true } } },
        });
        if (!agendamento)
            throw new common_1.NotFoundException('Agendamento não encontrado.');
        if (agendamento.barbearia.ownerId !== ownerId)
            throw new common_1.ForbiddenException('Sem permissão.');
        return this.prisma.agendamento.update({
            where: { id },
            data: { lembreteEnviado: true },
        });
    }
};
exports.AgendamentoService = AgendamentoService;
exports.AgendamentoService = AgendamentoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AgendamentoService);
//# sourceMappingURL=agendamento.service.js.map