import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

const DEFAULT_SMTP_CONNECTION_TIMEOUT_MS = 8_000;
const DEFAULT_SMTP_GREETING_TIMEOUT_MS = 8_000;
const DEFAULT_SMTP_SOCKET_TIMEOUT_MS = 15_000;
const DEFAULT_SMTP_DNS_TIMEOUT_MS = 5_000;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly smtpUser?: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.smtpUser = this.configService.get<string>('SMTP_USER')?.trim();
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const port = this.getPositiveInteger('SMTP_PORT', 465);
    const secure = this.getBoolean('SMTP_SECURE', port === 465);

    this.isConfigured = Boolean(this.smtpUser && smtpPass);
    this.transporter = nodemailer.createTransport({
      host:
        this.configService.get<string>('SMTP_HOST')?.trim() || 'smtp.gmail.com',
      port,
      // Port 465 uses implicit TLS. Ports such as 587 must start unencrypted and
      // then negotiate STARTTLS, otherwise Nodemailer can wait for a response that
      // will never arrive.
      secure,
      ...(this.isConfigured
        ? {
            auth: {
              user: this.smtpUser!,
              pass: smtpPass!,
            },
          }
        : {}),
      // Nodemailer's defaults can wait as long as ten minutes. Short, explicit
      // limits keep a registration request from leaving the UI loading forever
      // when an SMTP provider is unreachable from Render.
      connectionTimeout: this.getPositiveInteger(
        'SMTP_CONNECTION_TIMEOUT_MS',
        DEFAULT_SMTP_CONNECTION_TIMEOUT_MS,
      ),
      greetingTimeout: this.getPositiveInteger(
        'SMTP_GREETING_TIMEOUT_MS',
        DEFAULT_SMTP_GREETING_TIMEOUT_MS,
      ),
      socketTimeout: this.getPositiveInteger(
        'SMTP_SOCKET_TIMEOUT_MS',
        DEFAULT_SMTP_SOCKET_TIMEOUT_MS,
      ),
      dnsTimeout: this.getPositiveInteger(
        'SMTP_DNS_TIMEOUT_MS',
        DEFAULT_SMTP_DNS_TIMEOUT_MS,
      ),
    });

    if (!this.isConfigured) {
      this.logger.error(
        'SMTP não configurado. Defina SMTP_USER e SMTP_PASS para enviar e-mails.',
      );
    }
  }

  async sendVerificationCode(
    to: string,
    code: string,
    nome: string,
  ): Promise<boolean> {
    return this.sendMail({
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
  }

  generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendPasswordResetEmail(
    to: string,
    token: string,
    nome: string,
  ): Promise<boolean> {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const resetUrl = `${frontendUrl}/redefinir-senha?token=${encodeURIComponent(token)}`;

    return this.sendMail({
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
  }

  private async sendMail(
    message: nodemailer.SendMailOptions,
  ): Promise<boolean> {
    if (!this.isConfigured || !this.smtpUser) {
      return false;
    }

    try {
      await this.transporter.sendMail({
        ...message,
        from:
          this.configService.get<string>('SMTP_FROM') ||
          `"CortaAí" <${this.smtpUser}>`,
      });

      this.logger.log('E-mail enviado com sucesso.');
      return true;
    } catch (error) {
      const code = this.getErrorCode(error);
      this.logger.error(`Falha ao enviar e-mail${code ? ` (${code})` : ''}.`);
      return false;
    }
  }

  private getPositiveInteger(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  }

  private getBoolean(key: string, fallback: boolean): boolean {
    const value = this.configService.get<string>(key)?.trim().toLowerCase();

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return fallback;
  }

  private getErrorCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as { code?: unknown }).code;
      return typeof code === 'string' ? code : undefined;
    }

    return undefined;
  }
}
