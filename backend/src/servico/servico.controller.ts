import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ServicoService } from './servico.service';
import type { Request } from 'express';

@Controller('barbearias/:barbeariaId/servicos')
export class ServicoController {
  constructor(private servicoService: ServicoService) {}

  @Get()
  async findAll(@Param('barbeariaId') barbeariaId: string) {
    return this.servicoService.findByBarbearia(barbeariaId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Param('barbeariaId') barbeariaId: string,
    @Body() body: { nome: string; preco: number; duracao: number; barbeiroId?: string },
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.servicoService.create(barbeariaId, user.id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { nome?: string; preco?: number; duracao?: number; ativo?: boolean; barbeiroId?: string },
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.servicoService.update(id, user.id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.servicoService.delete(id, user.id);
  }
}
