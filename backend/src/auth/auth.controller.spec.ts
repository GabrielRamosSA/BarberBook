import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  it('keeps the pending-verification fields returned by login', async () => {
    const pendingVerification = {
      message: 'E-mail não verificado. Um novo código foi enviado.',
      requiresVerification: true,
      email: 'cliente@example.com',
      verificationToken: 'pending-token',
    };
    const authService = {
      login: jest.fn().mockResolvedValue(pendingVerification),
    } as unknown as AuthService;
    const controller = new AuthController(authService);
    const response = { cookie: jest.fn() };

    const result = await controller.login(
      { email: 'cliente@example.com', senha: 'senha-segura' },
      response as unknown as Response,
    );

    expect(result).toEqual(pendingVerification);
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('sets the authentication cookie only when login returns an access token', async () => {
    const user = {
      id: 'user-id',
      nome: 'Cliente',
      email: 'cliente@example.com',
      telefone: null,
      tipo: 'CLIENTE',
      plano: 'BASICO',
      avatar: null,
    };
    const authService = {
      login: jest.fn().mockResolvedValue({
        message: 'Login realizado com sucesso',
        user,
        access_token: 'jwt-token',
      }),
    } as unknown as AuthService;
    const controller = new AuthController(authService);
    const response = { cookie: jest.fn() };

    const result = await controller.login(
      { email: 'cliente@example.com', senha: 'senha-segura' },
      response as unknown as Response,
    );

    expect(result).toEqual({ message: 'Login realizado com sucesso', user });
    expect(response.cookie).toHaveBeenCalledWith(
      'token',
      'jwt-token',
      expect.any(Object),
    );
  });
});
