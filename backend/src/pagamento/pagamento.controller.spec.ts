import { PagamentoController } from './pagamento.controller';
import { PagamentoService } from './pagamento.service';

describe('PagamentoController', () => {
  const pagamentoService = {
    obterConfiguracaoPublica: jest.fn(),
    processarWebhook: jest.fn(),
  } as unknown as PagamentoService & {
    obterConfiguracaoPublica: jest.Mock;
    processarWebhook: jest.Mock;
  };
  const controller = new PagamentoController(pagamentoService);

  beforeEach(() => {
    pagamentoService.obterConfiguracaoPublica.mockReset();
    pagamentoService.processarWebhook.mockReset();
  });

  it('returns only the Mercado Pago public configuration to the browser', () => {
    pagamentoService.obterConfiguracaoPublica.mockReturnValue({
      publicKey: 'APP_USR_public_key',
    });

    expect(controller.configuracaoPublica()).toEqual({
      publicKey: 'APP_USR_public_key',
    });
    expect(pagamentoService.obterConfiguracaoPublica).toHaveBeenCalledTimes(1);
  });

  it('forwards the signed webhook headers and authoritative query data.id', async () => {
    pagamentoService.processarWebhook.mockResolvedValue({ ok: true });

    await expect(
      controller.webhook(
        { type: 'subscription_authorized_payment' },
        'ts=123,v1=signature',
        'request-1',
        'invoice-1',
      ),
    ).resolves.toEqual({ ok: true });

    expect(pagamentoService.processarWebhook).toHaveBeenCalledWith(
      { type: 'subscription_authorized_payment' },
      {
        xSignature: 'ts=123,v1=signature',
        xRequestId: 'request-1',
        dataId: 'invoice-1',
      },
    );
  });

  it('does not replace the signed query identifier with a body value', async () => {
    pagamentoService.processarWebhook.mockResolvedValue({ ok: true });

    await controller.webhook(
      {
        type: 'subscription_preapproval',
        data: { id: 'untrusted-body-id' },
      },
      'ts=123,v1=signature',
      'request-1',
      'preapproval-1',
    );

    expect(pagamentoService.processarWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'subscription_preapproval' }),
      expect.objectContaining({ dataId: 'preapproval-1' }),
    );
  });
});
