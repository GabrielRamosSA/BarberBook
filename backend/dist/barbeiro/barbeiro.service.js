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
exports.BarbeiroService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const plano_config_1 = require("../plano/plano.config");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let BarbeiroService = class BarbeiroService {
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
        if (limites.maxBarbeirosPorBarbearia !== -1) {
            const count = await this.prisma.barbeiro.count({ where: { barbeariaId, ativo: true } });
            if (count >= limites.maxBarbeirosPorBarbearia) {
                throw new common_1.BadRequestException(`Seu plano ${user?.plano || 'BASICO'} permite no máximo ${limites.maxBarbeirosPorBarbearia} barbeiro(s) por barbearia. Faça upgrade para adicionar mais.`);
            }
        }
        const barbeiro = await this.prisma.barbeiro.create({
            data: {
                nome: data.nome,
                barbeariaId,
            },
        });
        return { message: 'Barbeiro adicionado!', barbeiro };
    }
    async findByBarbearia(barbeariaId) {
        return this.prisma.barbeiro.findMany({
            where: { barbeariaId },
            include: {
                horarios: true,
                servicos: {
                    where: { ativo: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }
    async update(id, ownerId, data) {
        const barbeiro = await this.prisma.barbeiro.findUnique({
            where: { id },
            include: { barbearia: true },
        });
        if (!barbeiro)
            throw new common_1.NotFoundException('Barbeiro não encontrado.');
        if (barbeiro.barbearia.ownerId !== ownerId)
            throw new common_1.ForbiddenException('Sem permissão.');
        const updated = await this.prisma.barbeiro.update({
            where: { id },
            data,
        });
        return { message: 'Barbeiro atualizado!', barbeiro: updated };
    }
    async updateFoto(id, ownerId, fotoUrl) {
        const barbeiro = await this.prisma.barbeiro.findUnique({
            where: { id },
            include: { barbearia: true },
        });
        if (!barbeiro)
            throw new common_1.NotFoundException('Barbeiro não encontrado.');
        if (barbeiro.barbearia.ownerId !== ownerId)
            throw new common_1.ForbiddenException('Sem permissão.');
        const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
        const limites = plano_config_1.PLANO_LIMITES[user?.plano || 'BASICO'];
        if (!limites.fotosBarbeiros) {
            throw new common_1.BadRequestException(`Seu plano ${user?.plano || 'BASICO'} não permite fotos de barbeiros. Faça upgrade para usar esta funcionalidade.`);
        }
        if (barbeiro.foto && barbeiro.foto.includes('/uploads/')) {
            const filename = barbeiro.foto.split('/').pop();
            if (filename) {
                const filepath = path.join(process.cwd(), 'uploads', 'barbeiros', filename);
                if (fs.existsSync(filepath))
                    fs.unlinkSync(filepath);
            }
        }
        const updated = await this.prisma.barbeiro.update({
            where: { id },
            data: { foto: fotoUrl },
        });
        return { message: 'Foto atualizada!', barbeiro: updated };
    }
    async delete(id, ownerId) {
        const barbeiro = await this.prisma.barbeiro.findUnique({
            where: { id },
            include: { barbearia: true },
        });
        if (!barbeiro)
            throw new common_1.NotFoundException('Barbeiro não encontrado.');
        if (barbeiro.barbearia.ownerId !== ownerId)
            throw new common_1.ForbiddenException('Sem permissão.');
        if (barbeiro.foto && barbeiro.foto.includes('/uploads/')) {
            const filename = barbeiro.foto.split('/').pop();
            if (filename) {
                const filepath = path.join(process.cwd(), 'uploads', 'barbeiros', filename);
                if (fs.existsSync(filepath))
                    fs.unlinkSync(filepath);
            }
        }
        await this.prisma.barbeiro.delete({ where: { id } });
        return { message: 'Barbeiro removido!' };
    }
};
exports.BarbeiroService = BarbeiroService;
exports.BarbeiroService = BarbeiroService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BarbeiroService);
//# sourceMappingURL=barbeiro.service.js.map