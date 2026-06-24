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
exports.BarbeariaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const plano_config_1 = require("../plano/plano.config");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let BarbeariaService = class BarbeariaService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    normalizarTexto(valor) {
        if (!valor)
            return undefined;
        return valor.trim();
    }
    normalizarUf(valor) {
        if (!valor)
            return undefined;
        return valor.trim().toUpperCase();
    }
    gerarSlug(nome) {
        return nome
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }
    async gerarSlugUnico(nome, excludeId) {
        let slug = this.gerarSlug(nome);
        let counter = 0;
        let candidato = slug;
        while (true) {
            const existing = await this.prisma.barbearia.findUnique({ where: { slug: candidato } });
            if (!existing || existing.id === excludeId)
                return candidato;
            counter++;
            candidato = `${slug}-${counter}`;
        }
    }
    async create(ownerId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
        const limites = plano_config_1.PLANO_LIMITES[user?.plano || 'BASICO'];
        if (limites.maxBarbearias !== -1) {
            const count = await this.prisma.barbearia.count({ where: { ownerId } });
            if (count >= limites.maxBarbearias) {
                throw new common_1.BadRequestException(`Seu plano ${user?.plano || 'BASICO'} permite no máximo ${limites.maxBarbearias} barbearia(s). Faça upgrade para adicionar mais.`);
            }
        }
        if (limites.lembreteWhatsapp === false && (dto.lembreteAtivo || dto.mensagemLembrete)) {
            dto.lembreteAtivo = false;
            dto.mensagemLembrete = undefined;
        }
        const slug = await this.gerarSlugUnico(dto.nome);
        const barbearia = await this.prisma.barbearia.create({
            data: {
                ...dto,
                cidade: this.normalizarTexto(dto.cidade) || dto.cidade,
                estado: this.normalizarUf(dto.estado) || dto.estado,
                slug,
                ownerId,
            },
        });
        return {
            message: 'Barbearia criada com sucesso!',
            barbearia,
        };
    }
    async findAllByOwner(ownerId) {
        return this.prisma.barbearia.findMany({
            where: { ownerId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(idOrSlug) {
        let barbearia = await this.prisma.barbearia.findUnique({
            where: { slug: idOrSlug },
            include: {
                owner: {
                    select: {
                        id: true,
                        nome: true,
                        avatar: true,
                    },
                },
                barbeiros: {
                    where: { ativo: true },
                    include: {
                        horarios: {
                            orderBy: { diaSemana: 'asc' },
                        },
                        servicos: {
                            where: { ativo: true },
                            orderBy: { createdAt: 'asc' },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                servicos: {
                    where: { ativo: true },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });
        if (!barbearia) {
            barbearia = await this.prisma.barbearia.findUnique({
                where: { id: idOrSlug },
                include: {
                    owner: {
                        select: {
                            id: true,
                            nome: true,
                            avatar: true,
                        },
                    },
                    barbeiros: {
                        where: { ativo: true },
                        include: {
                            horarios: {
                                orderBy: { diaSemana: 'asc' },
                            },
                            servicos: {
                                where: { ativo: true },
                                orderBy: { createdAt: 'asc' },
                            },
                        },
                        orderBy: { createdAt: 'asc' },
                    },
                    servicos: {
                        where: { ativo: true },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            });
        }
        if (!barbearia) {
            throw new common_1.NotFoundException('Barbearia não encontrada.');
        }
        return barbearia;
    }
    async update(id, ownerId, dto) {
        const barbearia = await this.prisma.barbearia.findUnique({
            where: { id },
        });
        if (!barbearia) {
            throw new common_1.NotFoundException('Barbearia não encontrada.');
        }
        if (barbearia.ownerId !== ownerId) {
            throw new common_1.ForbiddenException('Você não tem permissão para editar esta barbearia.');
        }
        const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
        const limites = plano_config_1.PLANO_LIMITES[user?.plano || 'BASICO'];
        if (limites.maxBarbearias !== -1) {
            const todasBarbearias = await this.prisma.barbearia.findMany({
                where: { ownerId },
                orderBy: { createdAt: 'asc' },
                select: { id: true },
            });
            const dentroDoLimite = todasBarbearias.slice(0, limites.maxBarbearias).map((b) => b.id);
            if (!dentroDoLimite.includes(id)) {
                throw new common_1.ForbiddenException(`Esta barbearia excede o limite do seu plano ${user?.plano || 'BASICO'}. Exclua barbearias extras ou faça upgrade.`);
            }
        }
        if (limites.lembreteWhatsapp === false && (dto.lembreteAtivo || dto.mensagemLembrete)) {
            dto.lembreteAtivo = false;
            dto.mensagemLembrete = undefined;
        }
        const updated = await this.prisma.barbearia.update({
            where: { id },
            data: {
                ...dto,
                cidade: dto.cidade !== undefined ? (this.normalizarTexto(dto.cidade) || dto.cidade) : undefined,
                estado: dto.estado !== undefined ? (this.normalizarUf(dto.estado) || dto.estado) : undefined,
                slug: dto.nome ? await this.gerarSlugUnico(dto.nome, id) : undefined,
            },
        });
        return {
            message: 'Barbearia atualizada com sucesso!',
            barbearia: updated,
        };
    }
    async updateFoto(id, ownerId, fotoUrl) {
        const barbearia = await this.prisma.barbearia.findUnique({
            where: { id },
        });
        if (!barbearia) {
            throw new common_1.NotFoundException('Barbearia não encontrada.');
        }
        if (barbearia.ownerId !== ownerId) {
            throw new common_1.ForbiddenException('Sem permissão.');
        }
        if (barbearia.foto && barbearia.foto.includes('/uploads/')) {
            const filename = barbearia.foto.split('/').pop();
            if (filename) {
                const filepath = path.join(process.cwd(), 'uploads', 'barbearias', filename);
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                }
            }
        }
        const updated = await this.prisma.barbearia.update({
            where: { id },
            data: { foto: fotoUrl },
        });
        return {
            message: 'Foto atualizada com sucesso!',
            barbearia: updated,
        };
    }
    async addFotos(id, ownerId, fotosUrls) {
        const barbearia = await this.prisma.barbearia.findUnique({
            where: { id },
        });
        if (!barbearia) {
            throw new common_1.NotFoundException('Barbearia não encontrada.');
        }
        if (barbearia.ownerId !== ownerId) {
            throw new common_1.ForbiddenException('Sem permissão.');
        }
        const updated = await this.prisma.barbearia.update({
            where: { id },
            data: {
                fotos: {
                    push: fotosUrls,
                },
            },
        });
        return {
            message: 'Fotos adicionadas com sucesso!',
            barbearia: updated,
        };
    }
    async removeFoto(id, ownerId, fotoUrl) {
        const barbearia = await this.prisma.barbearia.findUnique({
            where: { id },
        });
        if (!barbearia) {
            throw new common_1.NotFoundException('Barbearia não encontrada.');
        }
        if (barbearia.ownerId !== ownerId) {
            throw new common_1.ForbiddenException('Sem permissão.');
        }
        if (fotoUrl.includes('/uploads/')) {
            const filename = fotoUrl.split('/').pop();
            if (filename) {
                const filepath = path.join(process.cwd(), 'uploads', 'barbearias', filename);
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                }
            }
        }
        const updated = await this.prisma.barbearia.update({
            where: { id },
            data: {
                fotos: barbearia.fotos.filter((f) => f !== fotoUrl),
            },
        });
        return {
            message: 'Foto removida com sucesso!',
            barbearia: updated,
        };
    }
    async delete(id, ownerId) {
        const barbearia = await this.prisma.barbearia.findUnique({
            where: { id },
        });
        if (!barbearia) {
            throw new common_1.NotFoundException('Barbearia não encontrada.');
        }
        if (barbearia.ownerId !== ownerId) {
            throw new common_1.ForbiddenException('Sem permissão.');
        }
        const todasFotos = [...(barbearia.fotos || [])];
        if (barbearia.foto)
            todasFotos.push(barbearia.foto);
        for (const fotoUrl of todasFotos) {
            if (fotoUrl.includes('/uploads/')) {
                const filename = fotoUrl.split('/').pop();
                if (filename) {
                    const filepath = path.join(process.cwd(), 'uploads', 'barbearias', filename);
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath);
                    }
                }
            }
        }
        await this.prisma.barbearia.delete({ where: { id } });
        return { message: 'Barbearia excluída com sucesso.' };
    }
    async search(estado, cidade) {
        const where = { ativa: true };
        if (estado?.trim()) {
            where.estado = { equals: estado.trim(), mode: 'insensitive' };
        }
        if (cidade?.trim()) {
            where.cidade = { equals: cidade.trim(), mode: 'insensitive' };
        }
        return this.prisma.barbearia.findMany({
            where,
            include: {
                owner: {
                    select: { id: true, nome: true, avatar: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.BarbeariaService = BarbeariaService;
exports.BarbeariaService = BarbeariaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BarbeariaService);
//# sourceMappingURL=barbearia.service.js.map