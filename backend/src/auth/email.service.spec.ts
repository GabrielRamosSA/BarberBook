import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

const mockCreateTransport = jest.mocked(nodemailer.createTransport);
type SmtpTransporter = ReturnType<typeof nodemailer.createTransport>;

describe('EmailService', () => {
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockCreateTransport.mockReset();
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fails immediately when SMTP credentials are absent', async () => {
    const sendMail = jest.fn();
    mockCreateTransport.mockReturnValue({
      sendMail,
    } as unknown as SmtpTransporter);
    const config = makeConfig({});
    const service = new EmailService(config);

    await expect(
      service.sendVerificationCode('cliente@example.com', '123456', 'Cliente'),
    ).resolves.toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionTimeout: 8_000,
        greetingTimeout: 8_000,
        socketTimeout: 15_000,
        dnsTimeout: 5_000,
      }),
    );
    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('uses STARTTLS settings for SMTP port 587 and sends through the configured transport', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'message-id' });
    mockCreateTransport.mockReturnValue({
      sendMail,
    } as unknown as SmtpTransporter);
    const config = makeConfig({
      SMTP_USER: 'mailer@example.com',
      SMTP_PASS: 'app-password',
      SMTP_PORT: '587',
    });
    const service = new EmailService(config);

    await expect(
      service.sendVerificationCode('cliente@example.com', '123456', 'Cliente'),
    ).resolves.toBe(true);
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 587,
        secure: false,
        auth: { user: 'mailer@example.com', pass: 'app-password' },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'cliente@example.com',
        from: '"CortaAí" <mailer@example.com>',
      }),
    );
  });
});

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}
