import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../auth/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { SuporteService } from './suporte.service';

describe('SuporteService', () => {
  const mockFindUnique = jest.fn();
  const mockSendEmail = jest.fn();

  beforeEach(() => {
    mockFindUnique.mockReset();
    mockSendEmail.mockReset();
    mockFindUnique.mockResolvedValue({
      id: 'barbeiro-id',
      nome: 'Barbeiro',
      email: 'barbeiro@example.com',
      plano: 'PROFISSIONAL',
      tipo: 'BARBEIRO',
    });
  });

  it('sends the human-support fallback through EmailService', async () => {
    mockSendEmail.mockResolvedValue(true);
    const service = makeService({ SUPORTE_EMAIL: 'suporte@example.com' });

    await expect(
      service.enviarFallbackEmail('barbeiro-id', 'Dúvida', 'Preciso de ajuda.'),
    ).resolves.toEqual({
      ok: true,
      message: 'Mensagem enviada para o suporte humano por e-mail.',
    });

    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'suporte@example.com',
      replyTo: 'barbeiro@example.com',
      subject: '[Suporte Humano] Dúvida',
      text: 'Canal: Suporte Humano por e-mail\nUsuario: Barbeiro (barbeiro@example.com)\nPlano: PROFISSIONAL\n\nMensagem:\nPreciso de ajuda.',
    });
  });

  it('returns a clear 503 when the provider cannot send the support request', async () => {
    mockSendEmail.mockResolvedValue(false);
    const service = makeService({ SUPORTE_EMAIL: 'suporte@example.com' });

    await expect(
      service.enviarFallbackEmail('barbeiro-id', 'Dúvida', 'Preciso de ajuda.'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  function makeService(values: Record<string, string>): SuporteService {
    const prisma = {
      user: { findUnique: mockFindUnique },
    } as unknown as PrismaService;
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    const emailService = {
      sendEmail: mockSendEmail,
    } as unknown as EmailService;

    return new SuporteService(prisma, config, emailService);
  }
});
