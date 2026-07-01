import { Controller, Post, Get, Body, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PagamentoService } from './pagamento.service';
import type { Request, Response } from 'express';

@Controller('pagamento')
export class PagamentoController {
  constructor(private pagamentoService: PagamentoService) {}

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
    @Req() req: Request,
    @Body() body: { plano: string; email: string; card_token_id: string },
  ) {
    const user = req.user as any;
    return this.pagamentoService.criarAssinatura(user.id, body);
  }

  // Cancelar assinatura
  @UseGuards(AuthGuard('jwt'))
  @Post('cancelar')
  async cancelar(@Req() req: Request) {
    const user = req.user as any;
    return this.pagamentoService.cancelarAssinatura(user.id);
  }

  // Consultar status da assinatura
  @UseGuards(AuthGuard('jwt'))
  @Get('status')
  async status(@Req() req: Request) {
    const user = req.user as any;
    return this.pagamentoService.consultarAssinatura(user.id);
  }

  // Webhook do Mercado Pago (sem autenticação)
  @Post('webhook')
  async webhook(@Body() body: { type: string; data: { id: string } }) {
    return this.pagamentoService.processarWebhook(body);
  }
}
