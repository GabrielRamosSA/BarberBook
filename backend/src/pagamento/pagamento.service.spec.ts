import { BadRequestException } from '@nestjs/common';
import { ServiceUnavailableException } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  PreApproval: jest.fn(),
  Invoice: jest.fn(),
  WebhookSignatureValidator: { validate: jest.fn() },
  InvalidWebhookSignatureError: class InvalidWebhookSignatureError extends Error {},
}));

import {
  InvalidWebhookSignatureError,
  Invoice,
  MercadoPagoConfig,
  PreApproval,
  WebhookSignatureValidator,
} from 'mercadopago';
import { PagamentoService } from './pagamento.service';

const mockMercadoPagoConfig = MercadoPagoConfig as unknown as jest.Mock;
const mockPreApproval = PreApproval as unknown as jest.Mock;
const mockInvoice = Invoice as unknown as jest.Mock;
const mockWebhookSignatureValidator = WebhookSignatureValidator as unknown as {
  validate: jest.Mock;
};

const mockPreApprovalClient = {
  create: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
};
const mockInvoiceClient = { get: jest.fn() };

describe('PagamentoService', () => {
  beforeEach(() => {
    mockMercadoPagoConfig.mockReset();
    mockPreApproval.mockReset();
    mockInvoice.mockReset();
    mockPreApprovalClient.create.mockReset();
    mockPreApprovalClient.get.mockReset();
    mockPreApprovalClient.update.mockReset();
    mockInvoiceClient.get.mockReset();
    mockWebhookSignatureValidator.validate.mockReset();

    mockMercadoPagoConfig.mockImplementation(() => ({}));
    mockPreApproval.mockImplementation(() => mockPreApprovalClient);
    mockInvoice.mockImplementation(() => mockInvoiceClient);
  });

  it('configures Mercado Pago with the server-only access token', () => {
    createService({ MERCADO_PAGO_ACCESS_TOKEN: 'APP_USR_server_secret' });

    expect(mockMercadoPagoConfig).toHaveBeenCalledWith({
      accessToken: 'APP_USR_server_secret',
    });
  });

  it('exposes only the public key required by MercadoPago.js', () => {
    const { service } = createService({
      MERCADO_PAGO_ACCESS_TOKEN: 'APP_USR_server_secret',
      MERCADO_PAGO_PUBLIC_KEY: 'APP_USR_public_key',
    });

    expect(service.obterConfiguracaoPublica()).toEqual({
      publicKey: 'APP_USR_public_key',
    });
    expect(service.obterConfiguracaoPublica()).not.toHaveProperty(
      'accessToken',
    );
  });

  it('does not expose payment configuration without a public key', () => {
    const { service } = createService();

    expect(() => service.obterConfiguracaoPublica()).toThrow(
      ServiceUnavailableException,
    );
  });

  it('rejects an unknown plan before contacting Mercado Pago', async () => {
    const { service, prisma } = createService();

    await expect(
      service.criarAssinatura('user-1', {
        plano: 'GRATIS',
        card_token_id: 'card-token',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPreApprovalClient.create).not.toHaveBeenCalled();
  });

  it('creates a monthly subscription with a backend return URL', async () => {
    const { service, prisma } = createService({
      MERCADO_PAGO_ACCESS_TOKEN: 'APP_USR_server_secret',
      BACKEND_URL: 'https://barberbook-awgp.onrender.com/',
    });
    prisma.user.findUnique.mockResolvedValue({
      email: 'cliente@example.com',
      subscriptionId: null,
      subscriptionStatus: null,
    });
    mockPreApprovalClient.create.mockResolvedValue({
      id: 'preapproval-1',
      status: 'authorized',
    });
    prisma.user.update.mockResolvedValue({});

    const resposta = await service.criarAssinatura('user-1', {
      plano: 'PREMIUM',
      card_token_id: 'card-token',
    });

    expect(resposta.status).toBe('pending');
    expect(resposta.mercadoPagoStatus).toBe('authorized');
    expect(resposta.subscriptionId).toBe('preapproval-1');
    expect(resposta.message).toContain('Assinatura autorizada');

    const chamadasCriacao = mockPreApprovalClient.create.mock
      .calls as unknown as [unknown][];
    const requestCriacao = chamadasCriacao[0]?.[0] as {
      body: {
        external_reference: string;
        payer_email: string;
        card_token_id: string;
        back_url: string;
        auto_recurring: {
          frequency: number;
          frequency_type: string;
          transaction_amount: number;
          currency_id: string;
        };
      };
    };
    expect(requestCriacao.body.external_reference).toBe('user-1');
    expect(requestCriacao.body.payer_email).toBe('cliente@example.com');
    expect(requestCriacao.body.card_token_id).toBe('card-token');
    expect(requestCriacao.body.back_url).toBe(
      'https://barberbook-awgp.onrender.com/api/pagamento/retorno',
    );
    expect(requestCriacao.body.auto_recurring).toEqual({
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: 59.9,
      currency_id: 'BRL',
    });

    const chamadasAtualizacao = prisma.user.update.mock.calls as unknown as [
      unknown,
    ][];
    const atualizacao = chamadasAtualizacao[0]?.[0] as {
      where: { id: string };
      data: { subscriptionId: string; subscriptionStatus: string };
    };
    expect(atualizacao.where.id).toBe('user-1');
    expect(atualizacao.data.subscriptionId).toBe('preapproval-1');
    expect(atualizacao.data.subscriptionStatus).toBe('pending');
  });

  it('downgrades an expired non-authorized subscription immediately on status lookup', async () => {
    const { service, prisma } = createService();
    prisma.user.findUnique.mockResolvedValue({
      plano: 'PROFISSIONAL',
      subscriptionId: 'preapproval-1',
      subscriptionStatus: 'cancelled',
      planoExpiraEm: new Date(Date.now() - 60_000),
    });
    prisma.user.update.mockResolvedValue({
      plano: 'BASICO',
      subscriptionId: null,
      subscriptionStatus: null,
      planoExpiraEm: null,
    });

    await expect(service.consultarAssinatura('user-1')).resolves.toEqual({
      plano: 'BASICO',
      subscriptionId: null,
      subscriptionStatus: null,
      planoExpiraEm: null,
      assinaturaAtiva: false,
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: {
          plano: 'BASICO',
          subscriptionId: null,
          subscriptionStatus: null,
          planoExpiraEm: null,
        },
      }),
    );
  });

  it('activates the paid plan only after a signed approved recurring charge', async () => {
    const { service, prisma } = createService({
      MERCADO_PAGO_ACCESS_TOKEN: 'APP_USR_server_secret',
      MERCADO_PAGO_WEBHOOK_SECRET: 'webhook-secret',
    });
    mockWebhookSignatureValidator.validate.mockImplementation(() => undefined);
    mockInvoiceClient.get.mockResolvedValue({
      payment: { status: 'approved' },
      preapproval_id: 'preapproval-1',
    });
    mockPreApprovalClient.get.mockResolvedValue({
      id: 'preapproval-1',
      status: 'authorized',
      external_reference: 'user-1',
      reason: 'CortaAi - Plano PREMIUM',
      next_payment_date: '2027-01-15T12:00:00.000Z',
    });
    prisma.user.update.mockResolvedValue({});

    await expect(
      service.processarWebhook(
        { type: 'subscription_authorized_payment' },
        {
          xSignature: 'ts=123,v1=signature',
          xRequestId: 'request-1',
          dataId: 'invoice-1',
        },
      ),
    ).resolves.toEqual({ ok: true });

    expect(mockWebhookSignatureValidator.validate).toHaveBeenCalledWith({
      xSignature: 'ts=123,v1=signature',
      xRequestId: 'request-1',
      dataId: 'invoice-1',
      secret: 'webhook-secret',
      toleranceSeconds: 300,
    });
    expect(mockInvoiceClient.get).toHaveBeenCalledWith({ id: 'invoice-1' });
    expect(mockPreApprovalClient.get).toHaveBeenCalledWith({
      id: 'preapproval-1',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        subscriptionId: 'preapproval-1',
        subscriptionStatus: 'authorized',
        plano: 'PREMIUM',
        planoExpiraEm: new Date('2027-01-15T12:00:00.000Z'),
      },
    });
  });

  it('asks Mercado Pago to retry an approved charge received before subscription authorization', async () => {
    const { service, prisma } = createService({
      MERCADO_PAGO_ACCESS_TOKEN: 'APP_USR_server_secret',
      MERCADO_PAGO_WEBHOOK_SECRET: 'webhook-secret',
    });
    mockWebhookSignatureValidator.validate.mockImplementation(() => undefined);
    mockInvoiceClient.get.mockResolvedValue({
      payment: { status: 'approved' },
      preapproval_id: 'preapproval-1',
    });
    mockPreApprovalClient.get.mockResolvedValue({
      id: 'preapproval-1',
      status: 'pending',
      external_reference: 'user-1',
      reason: 'CortaAí - Plano PREMIUM',
    });

    await expect(
      service.processarWebhook(
        { type: 'subscription_authorized_payment' },
        {
          xSignature: 'ts=123,v1=signature',
          xRequestId: 'request-1',
          dataId: 'invoice-1',
        },
      ),
    ).rejects.toThrow('antes da assinatura ficar autorizada');

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a webhook with an invalid signature before calling Mercado Pago', async () => {
    const { service } = createService({
      MERCADO_PAGO_ACCESS_TOKEN: 'APP_USR_server_secret',
      MERCADO_PAGO_WEBHOOK_SECRET: 'webhook-secret',
    });
    const invalidSignatureError =
      new (InvalidWebhookSignatureError as unknown as new () => Error)();
    mockWebhookSignatureValidator.validate.mockImplementation(() => {
      throw invalidSignatureError;
    });

    await expect(
      service.processarWebhook(
        { type: 'subscription_preapproval' },
        {
          xSignature: 'invalid',
          xRequestId: 'request-1',
          dataId: 'preapproval-1',
        },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(mockPreApprovalClient.get).not.toHaveBeenCalled();
    expect(mockInvoiceClient.get).not.toHaveBeenCalled();
  });

  it('rejects a webhook before processing when its signing secret is not configured', async () => {
    const { service } = createService({
      MERCADO_PAGO_ACCESS_TOKEN: 'APP_USR_server_secret',
    });

    await expect(
      service.processarWebhook(
        { type: 'subscription_preapproval' },
        {
          xSignature: 'ts=123,v1=signature',
          xRequestId: 'request-1',
          dataId: 'preapproval-1',
        },
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(mockWebhookSignatureValidator.validate).not.toHaveBeenCalled();
  });

  it('downgrades every paid account whose paid period has expired', async () => {
    const { service, prisma } = createService();
    prisma.user.findMany.mockResolvedValue([
      { id: 'user-1' },
      { id: 'user-2' },
    ]);
    prisma.user.update.mockResolvedValue({});

    await expect(service.verificarPlanosExpirados()).resolves.toEqual({
      downgraded: 2,
    });

    const chamadasBusca = prisma.user.findMany.mock.calls as unknown as [
      unknown,
    ][];
    const consultaExpirados = chamadasBusca[0]?.[0] as {
      where: {
        planoExpiraEm: { lte: Date };
        plano: { not: string };
        subscriptionStatus: { in: string[] };
      };
    };
    expect(consultaExpirados.where.planoExpiraEm.lte).toBeInstanceOf(Date);
    expect(consultaExpirados.where.plano.not).toBe('BASICO');
    expect(consultaExpirados.where.subscriptionStatus.in).toEqual([
      'cancelled',
      'paused',
    ]);
    expect(prisma.user.update).toHaveBeenCalledTimes(2);
    expect(prisma.user.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'user-1' },
      data: {
        plano: 'BASICO',
        subscriptionId: null,
        subscriptionStatus: null,
        planoExpiraEm: null,
      },
    });
  });
});

function createService(values: Record<string, string | undefined> = {}) {
  const config = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService & {
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  return {
    service: new PagamentoService(config, prisma),
    prisma,
  };
}
