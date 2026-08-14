import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../auth/email.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuporteService {
  private readonly logger = new Logger(SuporteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
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
      throw new BadRequestException(
        'Suporte humano disponivel apenas para usuarios barbeiros.',
      );
    }

    return user;
  }

  async getStatus(userId: string) {
    const user = await this.getDadosUsuario(userId);

    return {
      plano: user.plano,
      suporteIaDisponivel: false,
      canal: 'HUMANO_EMAIL',
      fallbackEmail: this.getSupportEmail(),
    };
  }

  async enviarFallbackEmail(userId: string, assunto: string, mensagem: string) {
    const subject = assunto.trim();
    const content = mensagem.trim();

    if (!subject || !content) {
      throw new BadRequestException(
        'Assunto e mensagem sao obrigatorios para o fallback por e-mail.',
      );
    }

    const user = await this.getDadosUsuario(userId);
    const destino = this.getSupportEmail();

    if (!destino) {
      throw new ServiceUnavailableException(
        'O canal de suporte por e-mail não está configurado.',
      );
    }

    const enviado = await this.emailService.sendEmail({
      to: destino,
      replyTo: user.email,
      subject: `[Suporte Humano] ${subject}`,
      text: `Canal: Suporte Humano por e-mail\nUsuario: ${user.nome} (${user.email})\nPlano: ${user.plano}\n\nMensagem:\n${content}`,
    });

    if (!enviado) {
      throw new ServiceUnavailableException(
        'Não foi possível enviar sua mensagem de suporte agora. Tente novamente em alguns instantes.',
      );
    }

    this.logger.log('Chamado de suporte humano enviado.');

    return {
      ok: true,
      message: 'Mensagem enviada para o suporte humano por e-mail.',
    };
  }

  private getSupportEmail(): string {
    return this.configService.get<string>('SUPORTE_EMAIL')?.trim() || '';
  }
}
