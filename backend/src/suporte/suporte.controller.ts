import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { SuporteService } from './suporte.service';

@Controller('suporte')
@UseGuards(AuthGuard('jwt'))
export class SuporteController {
  constructor(private readonly suporteService: SuporteService) {}

  @Get('status')
  async status(@Req() req: Request) {
    const user = req.user as any;
    return this.suporteService.getStatus(user.id);
  }

  @Post('fallback-email')
  async fallbackEmail(
    @Req() req: Request,
    @Body() body: { assunto: string; mensagem: string },
  ) {
    const user = req.user as any;
    return this.suporteService.enviarFallbackEmail(user.id, body?.assunto || '', body?.mensagem || '');
  }
}
