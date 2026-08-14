import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailService } from './email.service';

jest.mock('resend', () => ({
  Resend: jest.fn(),
}));

const mockResend = Resend as unknown as jest.Mock;
const mockSendEmail = jest.fn();

describe('EmailService', () => {
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSendEmail.mockReset();
    mockResend.mockClear();
    mockResend.mockImplementation(() => ({
      emails: { send: mockSendEmail },
    }));
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fails immediately when Resend is not configured', async () => {
    const service = new EmailService(makeConfig({}));

    await expect(
      service.sendVerificationCode('cliente@example.com', '123456', 'Cliente'),
    ).resolves.toBe(false);

    expect(mockResend).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('sends the verification email through Resend', async () => {
    mockSendEmail.mockResolvedValue({
      data: { id: 'email-id' },
      error: null,
    });
    const service = new EmailService(
      makeConfig({
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM: 'CortaAí <contato@example.com>',
      }),
    );

    await expect(
      service.sendVerificationCode('cliente@example.com', '123456', 'Cliente'),
    ).resolves.toBe(true);

    expect(mockResend).toHaveBeenCalledWith('re_test_key');
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'CortaAí <contato@example.com>',
        to: 'cliente@example.com',
        subject: 'Código de verificação - CortaAí',
      }),
    );
  });

  it('returns false when Resend rejects the e-mail', async () => {
    mockSendEmail.mockResolvedValue({
      data: null,
      error: { message: 'Domínio não verificado' },
    });
    const service = new EmailService(
      makeConfig({
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM: 'CortaAí <contato@example.com>',
      }),
    );

    await expect(
      service.sendVerificationCode('cliente@example.com', '123456', 'Cliente'),
    ).resolves.toBe(false);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Domínio não verificado'),
    );
  });
});

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}
