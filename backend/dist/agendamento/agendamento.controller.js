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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgendamentoController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const jwt_1 = require("@nestjs/jwt");
const agendamento_service_1 = require("./agendamento.service");
let AgendamentoController = class AgendamentoController {
    agendamentoService;
    jwtService;
    constructor(agendamentoService, jwtService) {
        this.agendamentoService = agendamentoService;
        this.jwtService = jwtService;
    }
    async create(body, req, authHeader) {
        let userId;
        const bearerToken = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.split(' ')[1]
            : undefined;
        const cookieToken = req?.cookies?.token;
        const token = bearerToken || cookieToken;
        if (token) {
            try {
                const decoded = this.jwtService.verify(token);
                userId = decoded.sub;
            }
            catch {
            }
        }
        return this.agendamentoService.create({ ...body, userId });
    }
    async meus(req) {
        const user = req.user;
        return this.agendamentoService.findByUser(user.id);
    }
    async usoMensal(req) {
        const user = req.user;
        return this.agendamentoService.contarAgendamentosMes(user.id);
    }
    async agenda(req, params) {
        const user = req.user;
        const data = req.query.data;
        return this.agendamentoService.findByOwner(user.id, data);
    }
    async consultarPorTelefone(req) {
        const telefone = req.query.telefone;
        if (!telefone)
            return [];
        return this.agendamentoService.findByTelefone(telefone);
    }
    async cancelarPorTelefone(id, telefone) {
        return this.agendamentoService.cancelarPorTelefone(id, telefone);
    }
    async horariosOcupados(barbeiroId, req) {
        const data = req.query.data;
        if (!data)
            return [];
        return this.agendamentoService.horariosOcupados(barbeiroId, data);
    }
    async porBarbearia(barbeariaId) {
        return this.agendamentoService.findByBarbearia(barbeariaId);
    }
    async updateStatus(id, status, req) {
        const user = req.user;
        return this.agendamentoService.updateStatus(id, user.id, status);
    }
    async cancelar(id, req) {
        const user = req.user;
        return this.agendamentoService.cancelar(id, user.id);
    }
    async lembretesPendentes(req) {
        const user = req.user;
        return this.agendamentoService.findLembretesPendentes(user.id);
    }
    async clientes(req) {
        const user = req.user;
        return this.agendamentoService.findClientesByOwner(user.id);
    }
    async marcarLembreteEnviado(id, req) {
        const user = req.user;
        return this.agendamentoService.marcarLembreteEnviado(id, user.id);
    }
};
exports.AgendamentoController = AgendamentoController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('meus'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "meus", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('uso-mensal'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "usoMensal", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('agenda'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "agenda", null);
__decorate([
    (0, common_1.Get)('consultar'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "consultarPorTelefone", null);
__decorate([
    (0, common_1.Put)(':id/cancelar-telefone'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('telefone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "cancelarPorTelefone", null);
__decorate([
    (0, common_1.Get)('ocupados/:barbeiroId'),
    __param(0, (0, common_1.Param)('barbeiroId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "horariosOcupados", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('barbearia/:barbeariaId'),
    __param(0, (0, common_1.Param)('barbeariaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "porBarbearia", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Put)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Put)(':id/cancelar'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "cancelar", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('lembretes/pendentes'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "lembretesPendentes", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('clientes'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "clientes", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Put)(':id/lembrete-enviado'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgendamentoController.prototype, "marcarLembreteEnviado", null);
exports.AgendamentoController = AgendamentoController = __decorate([
    (0, common_1.Controller)('agendamentos'),
    __metadata("design:paramtypes", [agendamento_service_1.AgendamentoService,
        jwt_1.JwtService])
], AgendamentoController);
//# sourceMappingURL=agendamento.controller.js.map