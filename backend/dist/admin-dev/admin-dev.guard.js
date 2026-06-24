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
exports.AdminDevGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
let AdminDevGuard = class AdminDevGuard {
    jwtService;
    configService;
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
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
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        this.ensureIpAllowed(request);
        const authHeader = request.headers?.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Token de acesso do admin dev nao informado.');
        }
        const token = authHeader.slice(7);
        const secret = this.configService.get('DEV_ADMIN_JWT_SECRET') || 'dev-admin-secret-change-me';
        try {
            const payload = this.jwtService.verify(token, { secret });
            if (payload?.role !== 'DEV_ADMIN') {
                throw new common_1.UnauthorizedException('Token invalido para admin dev.');
            }
            request.devAdmin = payload;
            return true;
        }
        catch {
            throw new common_1.UnauthorizedException('Token invalido ou expirado.');
        }
    }
};
exports.AdminDevGuard = AdminDevGuard;
exports.AdminDevGuard = AdminDevGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], AdminDevGuard);
//# sourceMappingURL=admin-dev.guard.js.map