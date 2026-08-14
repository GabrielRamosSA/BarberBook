import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend, type CreateEmailOptions } from 'resend';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | string[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend?: Resend;
  private readonly from?: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY')?.trim();
    this.from = this.configService.get<string>('RESEND_FROM')?.trim();

    if (apiKey && this.from) {
      this.resend = new Resend(apiKey);
      return;
    }

    this.logger.error(
      'Resend não configurado. Defina RESEND_API_KEY e RESEND_FROM para enviar e-mails.',
    );
  }

  async sendVerificationCode(
    to: string,
    code: string,
    nome: string,
  ): Promise<boolean> {
    const safeName = this.escapeHtml(nome);

    return this.sendEmail({
      to,
      subject: 'Código de verificação - CortaAí',
      text: `Olá ${nome},\n\nUse o código ${code} para verificar seu e-mail.\n\nEste código expira em 15 minutos. Se você não criou esta conta, ignore este e-mail.`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #f5f5f5;">
          <div style="background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #071522; font-size: 1.5rem; margin: 0 0 8px;">✂️ CortaAí</h1>
              <p style="color: #666; margin: 0;">Confirme seu e-mail</p>
            </div>

            <p style="color: #333; font-size: 0.95rem;">Olá <strong>${safeName}</strong>,</p>
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
    const safeName = this.escapeHtml(nome);

    return this.sendEmail({
      to,
      subject: 'Redefinir senha - CortaAí',
      text: `Olá ${nome},\n\nRecebemos uma solicitação para redefinir sua senha. Acesse o link abaixo:\n${resetUrl}\n\nEste link expira em 30 minutos. Se você não solicitou a redefinição, ignore este e-mail.`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #f5f5f5;">
          <div style="background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #071522; font-size: 1.5rem; margin: 0 0 8px;">✂️ CortaAí</h1>
              <p style="color: #666; margin: 0;">Redefinição de senha</p>
            </div>

            <p style="color: #333; font-size: 0.95rem;">Olá <strong>${safeName}</strong>,</p>
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

  async sendEmail(message: EmailMessage): Promise<boolean> {
    const resend = this.resend;
    const from = this.from;

    if (!resend || !from) {
      return false;
    }

    const payload = this.createPayload(from, message);
    if (!payload) {
      this.logger.error(
        'E-mail sem conteúdo HTML ou texto não pode ser enviado.',
      );
      return false;
    }

    try {
      const { data, error } = await resend.emails.send(payload);

      if (error) {
        this.logger.error(
          `Falha ao enviar e-mail pelo Resend: ${this.getErrorSummary(error)}`,
        );
        return false;
      }

      this.logger.log(
        `E-mail enviado com sucesso${data?.id ? ` (${data.id})` : ''}.`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail pelo Resend: ${this.getErrorSummary(error)}`,
      );
      return false;
    }
  }

  private createPayload(
    from: string,
    message: EmailMessage,
  ): CreateEmailOptions | undefined {
    const base = {
      from,
      to: message.to,
      subject: message.subject,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    };

    if (message.html) {
      return {
        ...base,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
      };
    }

    if (message.text) {
      return { ...base, text: message.text };
    }

    return undefined;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      };

      return entities[character];
    });
  }

  private getErrorSummary(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    return 'erro desconhecido';
  }
}
