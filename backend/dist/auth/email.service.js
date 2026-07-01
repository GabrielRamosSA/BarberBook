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
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = class EmailService {
    transporter;
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        this.transporter.verify()
            .then(() => console.log('📧 Email service ready (Gmail SMTP)'))
            .catch((err) => console.error('❌ Erro ao conectar SMTP:', err));
    }
    async sendVerificationCode(to, code, nome) {
        try {
            const info = await this.transporter.sendMail({
                from: `"CortaAí" <${process.env.SMTP_USER}>`,
                to,
                subject: 'Código de verificação - CortaAí',
                html: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #f5f5f5;">
            <div style="background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #071522; font-size: 1.5rem; margin: 0 0 8px;">✂️ CortaAí</h1>
                <p style="color: #666; margin: 0;">Confirme seu e-mail</p>
              </div>

              <p style="color: #333; font-size: 0.95rem;">Olá <strong>${nome}</strong>,</p>
              <p style="color: #333; font-size: 0.95rem;">Use o código abaixo para verificar seu e-mail:</p>

              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background: linear-gradient(135deg, #071522, #2c3e50); color: #fff; padding: 16px 32px; border-radius: 12px; font-size: 2rem; font-weight: 700; letter-spacing: 8px;">
                  ${code}
                </div>
              </div>

              <p style="color: #999; font-size: 0.8rem; text-align: center;">
                Este código expira em <strong>15 minutos</strong>.<br/>
                Se você não criou esta conta, ignore este e-mail.
              </p>
            </div>
          </div>
        `,
            });
            console.log(`📧 E-mail de verificação enviado para: ${to}`);
            return true;
        }
        catch (err) {
            console.error('Erro ao enviar e-mail:', err);
            return false;
        }
    }
    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async sendPasswordResetEmail(to, token, nome) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
        const resetUrl = `${frontendUrl}/redefinir-senha?token=${token}`;
        try {
            await this.transporter.sendMail({
                from: `"CortaAí" <${process.env.SMTP_USER}>`,
                to,
                subject: 'Redefinir senha - CortaAí',
                html: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #f5f5f5;">
            <div style="background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #071522; font-size: 1.5rem; margin: 0 0 8px;">✂️ CortaAí</h1>
                <p style="color: #666; margin: 0;">Redefinição de senha</p>
              </div>

              <p style="color: #333; font-size: 0.95rem;">Olá <strong>${nome}</strong>,</p>
              <p style="color: #333; font-size: 0.95rem;">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4a373, #c4935f); color: #fff; padding: 14px 32px; border-radius: 10px; font-size: 1rem; font-weight: 600; text-decoration: none;">
                  Redefinir minha senha
                </a>
              </div>

              <p style="color: #999; font-size: 0.8rem; text-align: center;">
                Este link expira em <strong>30 minutos</strong>.<br/>
                Se você não solicitou a redefinição, ignore este e-mail.
              </p>
            </div>
          </div>
        `,
            });
            console.log(`📧 E-mail de redefinição de senha enviado para: ${to}`);
            return true;
        }
        catch (err) {
            console.error('Erro ao enviar e-mail de redefinição:', err);
            return false;
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmailService);
//# sourceMappingURL=email.service.js.map