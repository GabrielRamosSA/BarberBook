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
exports.HorarioController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const horario_service_1 = require("./horario.service");
let HorarioController = class HorarioController {
    horarioService;
    constructor(horarioService) {
        this.horarioService = horarioService;
    }
    async findAll(barbeiroId) {
        return this.horarioService.findByBarbeiro(barbeiroId);
    }
    async setHorarios(barbeiroId, body, req) {
        const user = req.user;
        return this.horarioService.setHorarios(barbeiroId, user.id, body.horarios);
    }
};
exports.HorarioController = HorarioController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('barbeiroId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HorarioController.prototype, "findAll", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Put)(),
    __param(0, (0, common_1.Param)('barbeiroId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], HorarioController.prototype, "setHorarios", null);
exports.HorarioController = HorarioController = __decorate([
    (0, common_1.Controller)('barbeiros/:barbeiroId/horarios'),
    __metadata("design:paramtypes", [horario_service_1.HorarioService])
], HorarioController);
//# sourceMappingURL=horario.controller.js.map