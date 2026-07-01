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
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const user_service_1 = require("./user.service");
const update_user_dto_1 = require("./dto/update-user.dto");
let UserController = class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    async getProfile(req) {
        const user = req.user;
        return this.userService.findById(user.id);
    }
    async updateProfile(req, dto) {
        const user = req.user;
        return this.userService.update(user.id, dto);
    }
    async uploadAvatar(req, file) {
        if (!file) {
            throw new common_1.BadRequestException('Nenhum arquivo enviado');
        }
        const user = req.user;
        const avatarUrl = `https://barberbook-awgp.onrender.com/uploads/avatars/${file.filename}`;
        return this.userService.updateAvatar(user.id, avatarUrl);
    }
    async deleteAvatar(req) {
        const user = req.user;
        return this.userService.deleteAvatar(user.id);
    }
    async deleteProfile(req) {
        const user = req.user;
        return this.userService.delete(user.id);
    }
    async updatePlano(req, plano) {
        const user = req.user;
        return this.userService.updatePlano(user.id, plano);
    }
    async getPlanoLimites(req) {
        const user = req.user;
        const userData = await this.userService.findById(user.id);
        return {
            plano: userData.plano || 'BASICO',
            limites: this.userService.getPlanoLimites(userData.plano),
        };
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Get)('profile'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Put)('profile'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('avatar'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('avatar', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads/avatars',
            filename: (_req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, uniqueSuffix + (0, path_1.extname)(file.originalname));
            },
        }),
        fileFilter: (_req, file, cb) => {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                cb(new common_1.BadRequestException('Apenas imagens são permitidas'), false);
            }
            else {
                cb(null, true);
            }
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "uploadAvatar", null);
__decorate([
    (0, common_1.Delete)('avatar'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteAvatar", null);
__decorate([
    (0, common_1.Delete)('profile'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "deleteProfile", null);
__decorate([
    (0, common_1.Put)('plano'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)('plano')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updatePlano", null);
__decorate([
    (0, common_1.Get)('plano/limites'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getPlanoLimites", null);
exports.UserController = UserController = __decorate([
    (0, common_1.Controller)('user'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map