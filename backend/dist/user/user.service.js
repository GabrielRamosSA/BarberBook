"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const plano_config_1 = require("../plano/plano.config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let UserService = class UserService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                tipo: true,
                plano: true,
                avatar: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        return user;
    }
    async update(id, dto) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: dto,
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                tipo: true,
                plano: true,
                avatar: true,
            },
        });
        return {
            message: 'Usuário atualizado com sucesso',
            user: updatedUser,
        };
    }
    async updateAvatar(id, avatarUrl) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        this.removeLocalAvatar(user.avatar);
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: { avatar: avatarUrl },
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                tipo: true,
                plano: true,
                avatar: true,
            },
        });
        return {
            message: 'Avatar atualizado com sucesso',
            user: updatedUser,
        };
    }
    async deleteAvatar(id) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        this.removeLocalAvatar(user.avatar);
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: { avatar: null },
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                tipo: true,
                plano: true,
                avatar: true,
            },
        });
        return {
            message: 'Avatar removido com sucesso',
            user: updatedUser,
        };
    }
    removeLocalAvatar(avatarUrl) {
        if (!avatarUrl || !avatarUrl.includes('/uploads/avatars/'))
            return;
        try {
            const filename = avatarUrl.split('/uploads/avatars/').pop();
            if (filename) {
                const filePath = path.join(process.cwd(), 'uploads', 'avatars', filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }
        catch {
        }
    }
    async delete(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException('Usuário não encontrado');
        }
        this.removeLocalAvatar(user.avatar);
        await this.prisma.user.delete({
            where: { id },
        });
        return { message: 'Usuário deletado com sucesso' };
    }
    async updatePlano(id, plano) {
        const validPlanos = ['BASICO', 'PROFISSIONAL', 'PREMIUM'];
        if (!validPlanos.includes(plano)) {
            throw new common_1.BadRequestException('Plano inválido.');
        }
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado');
        if (plano === 'BASICO' &&
            user.plano !== 'BASICO' &&
            user.subscriptionStatus === 'cancelled' &&
            user.planoExpiraEm &&
            user.planoExpiraEm > new Date()) {
            throw new common_1.BadRequestException(`Seu plano permanece ativo até ${user.planoExpiraEm.toLocaleDateString('pt-BR')}.`);
        }
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: { plano: plano },
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                tipo: true,
                plano: true,
                avatar: true,
            },
        });
        return { message: `Plano atualizado para ${plano}!`, user: updatedUser };
    }
    getPlanoLimites(plano) {
        const validPlano = (plano || 'BASICO');
        return plano_config_1.PLANO_LIMITES[validPlano] || plano_config_1.PLANO_LIMITES.BASICO;
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserService);
//# sourceMappingURL=user.service.js.map