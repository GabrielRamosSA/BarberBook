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
exports.BarbeariaController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const barbearia_service_1 = require("./barbearia.service");
const barbearia_dto_1 = require("./dto/barbearia.dto");
let BarbeariaController = class BarbeariaController {
    barbeariaService;
    constructor(barbeariaService) {
        this.barbeariaService = barbeariaService;
    }
    async search(estado, cidade) {
        return this.barbeariaService.search(estado, cidade);
    }
    async findById(id) {
        return this.barbeariaService.findById(id);
    }
    async myBarbearias(req) {
        const user = req.user;
        return this.barbeariaService.findAllByOwner(user.id);
    }
    async create(req, dto) {
        const user = req.user;
        return this.barbeariaService.create(user.id, dto);
    }
    async update(req, id, dto) {
        const user = req.user;
        return this.barbeariaService.update(id, user.id, dto);
    }
    async uploadFoto(req, id, file) {
        if (!file) {
            throw new common_1.BadRequestException('Nenhum arquivo enviado');
        }
        const user = req.user;
        const fotoUrl = `http://localhost:3000/uploads/barbearias/${file.filename}`;
        return this.barbeariaService.updateFoto(id, user.id, fotoUrl);
    }
    async uploadFotos(req, id, files) {
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('Nenhum arquivo enviado');
        }
        const user = req.user;
        const fotosUrls = files.map((file) => `http://localhost:3000/uploads/barbearias/${file.filename}`);
        return this.barbeariaService.addFotos(id, user.id, fotosUrls);
    }
    async removeFoto(req, id, fotoUrl) {
        const user = req.user;
        return this.barbeariaService.removeFoto(id, user.id, fotoUrl);
    }
    async delete(req, id) {
        const user = req.user;
        return this.barbeariaService.delete(id, user.id);
    }
};
exports.BarbeariaController = BarbeariaController;
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('estado')),
    __param(1, (0, common_1.Query)('cidade')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BarbeariaController.prototype, "search", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BarbeariaController.prototype, "findById", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('owner/me'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BarbeariaController.prototype, "myBarbearias", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, barbearia_dto_1.CreateBarbeariaDto]),
    __metadata("design:returntype", Promise)
], BarbeariaController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, barbearia_dto_1.UpdateBarbeariaDto]),
    __metadata("design:returntype", Promise)
], BarbeariaController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':id/foto'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('foto', {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads/barbearias',
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
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], BarbeariaController.prototype, "uploadFoto", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(':id/fotos'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('fotos', 10, {
        storage: (0, multer_1.diskStorage)({
            destination: './uploads/barbearias',
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
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Array]),
    __metadata("design:returntype", Promise)
], BarbeariaController.prototype, "uploadFotos", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)(':id/fotos'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)('fotoUrl')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BarbeariaController.prototype, "removeFoto", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BarbeariaController.prototype, "delete", null);
exports.BarbeariaController = BarbeariaController = __decorate([
    (0, common_1.Controller)('barbearias'),
    __metadata("design:paramtypes", [barbearia_service_1.BarbeariaService])
], BarbeariaController);
//# sourceMappingURL=barbearia.controller.js.map