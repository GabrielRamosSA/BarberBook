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
exports.AdminDevController = void 0;
const common_1 = require("@nestjs/common");
const admin_dev_service_1 = require("./admin-dev.service");
const admin_dev_guard_1 = require("./admin-dev.guard");
let AdminDevController = class AdminDevController {
    adminDevService;
    constructor(adminDevService) {
        this.adminDevService = adminDevService;
    }
    login(req, body) {
        return this.adminDevService.login(body?.username || '', body?.password || '', req);
    }
    listarContas(tipo) {
        return this.adminDevService.listarContas(tipo || 'TODOS');
    }
    atualizarPlanoBarbeiro(id, body) {
        return this.adminDevService.atualizarPlanoBarbeiro(id, body?.plano || '');
    }
};
exports.AdminDevController = AdminDevController;
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminDevController.prototype, "login", null);
__decorate([
    (0, common_1.UseGuards)(admin_dev_guard_1.AdminDevGuard),
    (0, common_1.Get)('contas'),
    __param(0, (0, common_1.Query)('tipo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminDevController.prototype, "listarContas", null);
__decorate([
    (0, common_1.UseGuards)(admin_dev_guard_1.AdminDevGuard),
    (0, common_1.Patch)('barbeiros/:id/plano'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminDevController.prototype, "atualizarPlanoBarbeiro", null);
exports.AdminDevController = AdminDevController = __decorate([
    (0, common_1.Controller)('admin-dev'),
    __metadata("design:paramtypes", [admin_dev_service_1.AdminDevService])
], AdminDevController);
//# sourceMappingURL=admin-dev.controller.js.map