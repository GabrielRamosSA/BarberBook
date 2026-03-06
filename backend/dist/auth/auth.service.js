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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const email_service_1 = require("./email.service");
const dns_1 = require("dns");
let AuthService = class AuthService {
    prisma;
    jwtService;
    emailService;
    constructor(prisma, jwtService, emailService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }
    async checkEmailExists(email) {
        const domain = email.split('@')[1];
        if (!domain) {
            return { exists: false, valid: false, reason: 'E-mail inválido.' };
        }
        try {
            const mxRecords = await dns_1.promises.resolveMx(domain);
            if (!mxRecords || mxRecords.length === 0) {
                return { exists: false, valid: false, reason: 'Este domínio de e-mail não existe.' };
            }
        }
        catch {
            return { exists: false, valid: false, reason: 'Este domínio de e-mail não existe.' };
        }
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (user && user.emailVerified) {
            return { exists: true, valid: true, reason: 'Este e-mail já está cadastrado.' };
        }
        return { exists: false, valid: true, reason: null };
    }
    async register(dto) {
        const domain = dto.email.split('@')[1];
        if (domain) {
            try {
                const mxRecords = await dns_1.promises.resolveMx(domain);
                if (!mxRecords || mxRecords.length === 0) {
                    throw new common_1.ConflictException('Este domínio de e-mail não existe.');
                }
            }
            catch (err) {
                if (err instanceof common_1.ConflictException)
                    throw err;
                throw new common_1.ConflictException('Este domínio de e-mail não existe.');
            }
        }
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existingUser) {
            if (!existingUser.emailVerified) {
                const code = this.emailService.generateCode();
                await this.prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        nome: dto.nome,
                        senha: await bcrypt.hash(dto.senha, 10),
                        telefone: dto.telefone,
                        verificationCode: code,
                        verificationExpires: new Date(Date.now() + 15 * 60 * 1000),
                    },
                });
                await this.emailService.sendVerificationCode(dto.email, code, dto.nome);
                return {
                    message: 'Código de verificação reenviado para o e-mail.',
                    requiresVerification: true,
                    email: dto.email,
                };
            }
            throw new common_1.ConflictException('Email já cadastrado');
        }
        const hashedPassword = await bcrypt.hash(dto.senha, 10);
        const code = this.emailService.generateCode();
        await this.prisma.user.create({
            data: {
                nome: dto.nome,
                email: dto.email,
                senha: hashedPassword,
                telefone: dto.telefone,
                tipo: dto.tipo || 'CLIENTE',
                emailVerified: false,
                verificationCode: code,
                verificationExpires: new Date(Date.now() + 15 * 60 * 1000),
            },
        });
        await this.emailService.sendVerificationCode(dto.email, code, dto.nome);
        return {
            message: 'Conta criada! Verifique seu e-mail para ativar.',
            requiresVerification: true,
            email: dto.email,
        };
    }
    async verifyEmail(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            throw new common_1.BadRequestException('Usuário não encontrado.');
        }
        if (user.emailVerified) {
            throw new common_1.BadRequestException('E-mail já verificado.');
        }
        if (!user.verificationCode || !user.verificationExpires) {
            throw new common_1.BadRequestException('Nenhum código de verificação encontrado. Solicite um novo.');
        }
        if (new Date() > user.verificationExpires) {
            throw new common_1.BadRequestException('Código expirado. Solicite um novo.');
        }
        if (user.verificationCode !== dto.code) {
            throw new common_1.BadRequestException('Código incorreto.');
        }
        const verifiedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationCode: null,
                verificationExpires: null,
            },
        });
        const token = this.generateToken(verifiedUser.id, verifiedUser.email, verifiedUser.tipo);
        return {
            message: 'E-mail verificado com sucesso!',
            user: {
                id: verifiedUser.id,
                nome: verifiedUser.nome,
                email: verifiedUser.email,
                telefone: verifiedUser.telefone,
                tipo: verifiedUser.tipo,
                plano: verifiedUser.plano,
                avatar: verifiedUser.avatar,
            },
            access_token: token,
        };
    }
    async resendCode(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            throw new common_1.BadRequestException('Usuário não encontrado.');
        }
        if (user.emailVerified) {
            throw new common_1.BadRequestException('E-mail já verificado.');
        }
        const code = this.emailService.generateCode();
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                verificationCode: code,
                verificationExpires: new Date(Date.now() + 15 * 60 * 1000),
            },
        });
        await this.emailService.sendVerificationCode(dto.email, code, user.nome);
        return {
            message: 'Novo código enviado para o e-mail.',
        };
    }
    async login(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user || !user.senha) {
            throw new common_1.UnauthorizedException('Email ou senha incorretos');
        }
        const passwordValid = await bcrypt.compare(dto.senha, user.senha);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('Email ou senha incorretos');
        }
        if (!user.emailVerified) {
            const code = this.emailService.generateCode();
            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    verificationCode: code,
                    verificationExpires: new Date(Date.now() + 15 * 60 * 1000),
                },
            });
            await this.emailService.sendVerificationCode(dto.email, code, user.nome);
            return {
                message: 'E-mail não verificado. Um novo código foi enviado.',
                requiresVerification: true,
                email: dto.email,
            };
        }
        const token = this.generateToken(user.id, user.email, user.tipo);
        return {
            message: 'Login realizado com sucesso',
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                telefone: user.telefone,
                tipo: user.tipo,
                plano: user.plano,
                avatar: user.avatar,
            },
            access_token: token,
        };
    }
    async forgotPassword(dto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user || !user.emailVerified) {
            return { message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' };
        }
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: token,
                resetPasswordExpires: new Date(Date.now() + 30 * 60 * 1000),
            },
        });
        const enviado = await this.emailService.sendPasswordResetEmail(dto.email, token, user.nome);
        if (!enviado) {
            console.error(`❌ Falha ao enviar e-mail de redefinição para: ${dto.email}`);
        }
        return { message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' };
    }
    async resetPassword(dto) {
        const user = await this.prisma.user.findFirst({
            where: {
                resetPasswordToken: dto.token,
                resetPasswordExpires: { gt: new Date() },
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Token inválido ou expirado. Solicite um novo link.');
        }
        const hashedPassword = await bcrypt.hash(dto.novaSenha, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                senha: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
        });
        return { message: 'Senha redefinida com sucesso! Faça login com sua nova senha.' };
    }
    async googleLogin(googleUser) {
        let user = await this.prisma.user.findUnique({
            where: { googleId: googleUser.googleId },
        });
        if (!user) {
            user = await this.prisma.user.findUnique({
                where: { email: googleUser.email },
            });
            if (user) {
                user = await this.prisma.user.update({
                    where: { id: user.id },
                    data: {
                        googleId: googleUser.googleId,
                        avatar: googleUser.avatar || user.avatar,
                    },
                });
            }
            else {
                user = await this.prisma.user.create({
                    data: {
                        nome: googleUser.nome,
                        email: googleUser.email,
                        googleId: googleUser.googleId,
                        avatar: googleUser.avatar,
                        tipo: 'CLIENTE',
                    },
                });
            }
        }
        const token = this.generateToken(user.id, user.email, user.tipo);
        return {
            message: 'Login com Google realizado com sucesso',
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                telefone: user.telefone,
                tipo: user.tipo,
                plano: user.plano,
                avatar: user.avatar,
            },
            access_token: token,
        };
    }
    generateToken(userId, email, tipo) {
        return this.jwtService.sign({
            sub: userId,
            email,
            tipo,
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map