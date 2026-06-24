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
exports.AdminDevService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../prisma/prisma.service");
let AdminDevService = class AdminDevService {
    configService;
    jwtService;
    prisma;
    loginAttempts = new Map();
    constructor(configService, jwtService, prisma) {
        this.configService = configService;
        this.jwtService = jwtService;
        this.prisma = prisma;
    }
    getEnvList(key) {
        const raw = this.configService.get(key) || '';
        return raw
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
    }
    normalizeIp(value) {
        if (!value)
            return '';
        return value.replace('::ffff:', '').trim();
    }
    resolveClientIp(request) {
        const forwarded = request?.headers?.['x-forwarded-for'];
        const fromForwarded = typeof forwarded === 'string' && forwarded.length > 0
            ? forwarded.split(',')[0]
            : '';
        const ip = fromForwarded || request?.ip || request?.socket?.remoteAddress || '';
        return this.normalizeIp(ip);
    }
    ensureIpAllowed(request) {
        const ip = this.resolveClientIp(request);
        const blocked = this.getEnvList('DEV_ADMIN_BLOCKED_IPS').map((item) => this.normalizeIp(item));
        if (blocked.includes(ip)) {
            throw new common_1.ForbiddenException('Acesso bloqueado para este IP.');
        }
        const configuredAllowed = this.getEnvList('DEV_ADMIN_ALLOWED_IPS').map((item) => this.normalizeIp(item));
        const defaultAllowed = ['127.0.0.1', '::1', 'localhost'].map((item) => this.normalizeIp(item));
        const allowed = configuredAllowed.length > 0 ? configuredAllowed : defaultAllowed;
        if (!allowed.includes(ip)) {
            throw new common_1.ForbiddenException('Acesso permitido apenas por IP autorizado.');
        }
    }
    checkRateLimit(ip) {
        const windowMs = Number(this.configService.get('DEV_ADMIN_RATE_LIMIT_WINDOW_MS') || 600000);
        const maxAttempts = Number(this.configService.get('DEV_ADMIN_RATE_LIMIT_MAX_ATTEMPTS') || 5);
        const blockMs = Number(this.configService.get('DEV_ADMIN_RATE_LIMIT_BLOCK_MS') || 900000);
        const now = Date.now();
        const current = this.loginAttempts.get(ip);
        if (current?.blockedUntil && current.blockedUntil > now) {
            const waitSeconds = Math.ceil((current.blockedUntil - now) / 1000);
            throw new common_1.HttpException(`Muitas tentativas de login. Tente novamente em ${waitSeconds}s.`, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (!current || now - current.startedAt > windowMs) {
            this.loginAttempts.set(ip, { count: 1, startedAt: now });
            return;
        }
        current.count += 1;
        if (current.count > maxAttempts) {
            current.blockedUntil = now + blockMs;
            this.loginAttempts.set(ip, current);
            throw new common_1.HttpException('Limite de tentativas atingido para este IP.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        this.loginAttempts.set(ip, current);
    }
    login(username, password, request) {
        this.ensureIpAllowed(request);
        const ip = this.resolveClientIp(request);
        this.checkRateLimit(ip);
        const user = (username || '').trim();
        const pass = (password || '').trim();
        const configuredUser = this.configService.get('DEV_ADMIN_USERNAME') || 'admin123';
        const configuredPass = this.configService.get('DEV_ADMIN_PASSWORD') || '72003131Aq@';
        if (user !== configuredUser || pass !== configuredPass) {
            throw new common_1.UnauthorizedException('Credenciais invalidas.');
        }
        this.loginAttempts.delete(ip);
        const secret = this.configService.get('DEV_ADMIN_JWT_SECRET') || 'dev-admin-secret-change-me';
        const expiresIn = (this.configService.get('DEV_ADMIN_JWT_EXPIRES_IN') || '12h');
        const accessToken = this.jwtService.sign({
            role: 'DEV_ADMIN',
            username: configuredUser,
        }, { secret, expiresIn });
        return {
            accessToken,
            expiresIn,
        };
    }
    async listarContas(tipo = 'TODOS') {
        const filtro = (tipo || 'TODOS').toUpperCase();
        if (!['TODOS', 'CLIENTE', 'BARBEIRO'].includes(filtro)) {
            throw new common_1.BadRequestException('Filtro invalido. Use TODOS, CLIENTE ou BARBEIRO.');
        }
        const where = {};
        if (filtro === 'TODOS') {
            where.tipo = { in: ['CLIENTE', 'BARBEIRO'] };
        }
        else {
            where.tipo = filtro;
        }
        const contas = await this.prisma.user.findMany({
            where,
            select: {
                id: true,
                nome: true,
                email: true,
                telefone: true,
                tipo: true,
                plano: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return { contas };
    }
    async atualizarPlanoBarbeiro(userId, plano) {
        const planoNovo = (plano || '').toUpperCase();
        if (!['BASICO', 'PROFISSIONAL', 'PREMIUM'].includes(planoNovo)) {
            throw new common_1.BadRequestException('Plano invalido.');
        }
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.BadRequestException('Conta nao encontrada.');
        }
        if (user.tipo !== 'BARBEIRO') {
            throw new common_1.BadRequestException('Apenas contas de barbeiro podem ter plano alterado aqui.');
        }
        const atualizado = await this.prisma.user.update({
            where: { id: userId },
            data: { plano: planoNovo },
            select: {
                id: true,
                nome: true,
                email: true,
                tipo: true,
                plano: true,
            },
        });
        return {
            message: 'Plano atualizado com sucesso.',
            conta: atualizado,
        };
    }
};
exports.AdminDevService = AdminDevService;
exports.AdminDevService = AdminDevService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        jwt_1.JwtService,
        prisma_service_1.PrismaService])
], AdminDevService);
//# sourceMappingURL=admin-dev.service.js.map