import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PagamentoService } from './pagamento.service';
import { CriarAssinaturaDto } from './dto/criar-assinatura.dto';
import type { Request, Response } from 'express';

type AuthenticatedRequest = Omit<Request, 'user'> & {
  user: { id: string };
};

@Controller('pagamento')
export class PagamentoController {
  constructor(private pagamentoService: PagamentoService) {}

  // Chave pública: pode ser consumida pelo Mercado Pago.js no navegador.
  @Get('config')
  configuracaoPublica() {
    return this.pagamentoService.obterConfiguracaoPublica();
  }

  // Retorno do Mercado Pago → redireciona para o frontend
  @Get('retorno')
  retorno(@Res() res: Response) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    res.redirect(`${frontendUrl}/dashboard/planos/retorno`);
  }

  // Criar assinatura recorrente
  @UseGuards(AuthGuard('jwt'))
  @Post('assinar')
  async assinar(
    @Req() req: AuthenticatedRequest,
    @Body() body: CriarAssinaturaDto,
  ) {
    return this.pagamentoService.criarAssinatura(req.user.id, body);
  }

  // Cancelar assinatura
  @UseGuards(AuthGuard('jwt'))
  @Post('cancelar')
  async cancelar(@Req() req: AuthenticatedRequest) {
    return this.pagamentoService.cancelarAssinatura(req.user.id);
  }

  // Consultar status da assinatura
  @UseGuards(AuthGuard('jwt'))
  @Get('status')
  async status(@Req() req: AuthenticatedRequest) {
    return this.pagamentoService.consultarAssinatura(req.user.id);
  }

  // Webhook do Mercado Pago: a assinatura HMAC é validada no serviço.
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Body() body: { type?: string },
    @Headers('x-signature') xSignature: string | string[] | undefined,
    @Headers('x-request-id') xRequestId: string | string[] | undefined,
    @Query('data.id') dataId: string | string[] | undefined,
  ) {
    return this.pagamentoService.processarWebhook(body, {
      xSignature,
      xRequestId,
      dataId,
    });
  }
}
