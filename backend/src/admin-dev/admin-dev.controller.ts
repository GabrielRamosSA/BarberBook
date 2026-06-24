import { Body, Controller, Get, Patch, Post, Query, UseGuards, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AdminDevService } from './admin-dev.service';
import { AdminDevGuard } from './admin-dev.guard';

@Controller('admin-dev')
export class AdminDevController {
  constructor(private readonly adminDevService: AdminDevService) {}

  @Post('login')
  login(@Req() req: Request, @Body() body: { username: string; password: string }) {
    return this.adminDevService.login(body?.username || '', body?.password || '', req);
  }

  @UseGuards(AdminDevGuard)
  @Get('contas')
  listarContas(@Query('tipo') tipo?: string) {
    return this.adminDevService.listarContas(tipo || 'TODOS');
  }

  @UseGuards(AdminDevGuard)
  @Patch('barbeiros/:id/plano')
  atualizarPlanoBarbeiro(
    @Param('id') id: string,
    @Body() body: { plano: string },
  ) {
    return this.adminDevService.atualizarPlanoBarbeiro(id, body?.plano || '');
  }
}
