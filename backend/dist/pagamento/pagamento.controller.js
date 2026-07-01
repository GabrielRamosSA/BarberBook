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
exports.PagamentoController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const pagamento_service_1 = require("./pagamento.service");
let PagamentoController = class PagamentoController {
    pagamentoService;
    constructor(pagamentoService) {
        this.pagamentoService = pagamentoService;
    }
    retorno(res) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        res.redirect(`${frontendUrl}/dashboard/planos/retorno`);
    }
    async assinar(req, body) {
        const user = req.user;
        return this.pagamentoService.criarAssinatura(user.id, body);
    }
    async cancelar(req) {
        const user = req.user;
        return this.pagamentoService.cancelarAssinatura(user.id);
    }
    async status(req) {
        const user = req.user;
        return this.pagamentoService.consultarAssinatura(user.id);
    }
    async webhook(body) {
        return this.pagamentoService.processarWebhook(body);
    }
};
exports.PagamentoController = PagamentoController;
__decorate([
    (0, common_1.Get)('retorno'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PagamentoController.prototype, "retorno", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('assinar'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PagamentoController.prototype, "assinar", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('cancelar'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PagamentoController.prototype, "cancelar", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('status'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PagamentoController.prototype, "status", null);
__decorate([
    (0, common_1.Post)('webhook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PagamentoController.prototype, "webhook", null);
exports.PagamentoController = PagamentoController = __decorate([
    (0, common_1.Controller)('pagamento'),
    __metadata("design:paramtypes", [pagamento_service_1.PagamentoService])
], PagamentoController);
//# sourceMappingURL=pagamento.controller.js.map