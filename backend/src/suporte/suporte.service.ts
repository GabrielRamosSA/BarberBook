import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

type Plano = 'BASICO' | 'PROFISSIONAL' | 'PREMIUM';

@Injectable()
export class SuporteService {
  private readonly logger = new Logger(SuporteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private async getDadosUsuario(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nome: true, email: true, plano: true, tipo: true },
    });

    if (!user) {
      throw new BadRequestException('Usuario nao encontrado.');
    }

    if (user.tipo !== 'BARBEIRO') {
      throw new BadRequestException('Suporte humano disponivel apenas para usuarios barbeiros.');
    }

    return user;
  }

  async getStatus(userId: string) {
    const user = await this.getDadosUsuario(userId);

    return {
      plano: user.plano,
      suporteIaDisponivel: false,
      canal: 'HUMANO_EMAIL',
      fallbackEmail: this.configService.get<string>('SUPORTE_EMAIL') || this.configService.get<string>('SMTP_USER') || '',
    };
  }

  async enviarFallbackEmail(userId: string, assunto: string, mensagem: string) {
    const subject = assunto.trim();
    const content = mensagem.trim();

    if (!subject || !content) {
      throw new BadRequestException('Assunto e mensagem sao obrigatorios para o fallback por e-mail.');
    }

    const user = await this.getDadosUsuario(userId);
    const destino =
      this.configService.get<string>('SUPORTE_EMAIL') ||
      this.configService.get<string>('SMTP_USER') ||
      '';

    if (!destino) {
      throw new BadRequestException('Configure SUPORTE_EMAIL (ou SMTP_USER) para usar fallback humano por e-mail.');
    }

    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com',
      port: Number(this.configService.get<string>('SMTP_PORT') || 465),
      secure: true,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    await transporter.sendMail({
      from: `"CortaAi Suporte" <${this.configService.get<string>('SMTP_USER') || destino}>`,
      to: destino,
      replyTo: user.email,
      subject: `[Suporte Humano] ${subject}`,
      text: `Canal: Suporte Humano por e-mail\nUsuario: ${user.nome} (${user.email})\nPlano: ${user.plano}\n\nMensagem:\n${content}`,
    });

    this.logger.log(`Chamado de suporte humano enviado por ${user.email}.`);

    return {
      ok: true,
      message: 'Mensagem enviada para o suporte humano por e-mail.',
    };
  }
}
