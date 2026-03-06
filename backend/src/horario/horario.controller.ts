import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HorarioService } from './horario.service';
import type { Request } from 'express';

@Controller('barbeiros/:barbeiroId/horarios')
export class HorarioController {
  constructor(private horarioService: HorarioService) {}

  @Get()
  async findAll(@Param('barbeiroId') barbeiroId: string) {
    return this.horarioService.findByBarbeiro(barbeiroId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put()
  async setHorarios(
    @Param('barbeiroId') barbeiroId: string,
    @Body() body: { horarios: { diaSemana: number; horaInicio: string; horaFim: string; almocoInicio?: string; almocoFim?: string }[] },
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.horarioService.setHorarios(barbeiroId, user.id, body.horarios);
  }
}
