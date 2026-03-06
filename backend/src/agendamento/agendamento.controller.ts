import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { AgendamentoService } from './agendamento.service';
import type { Request } from 'express';

@Controller('agendamentos')
export class AgendamentoController {
  constructor(
    private agendamentoService: AgendamentoService,
    private jwtService: JwtService,
  ) {}

  // Criar agendamento (pode ser autenticado ou não)
  @Post()
  async create(
    @Body()
    body: {
      data: string;
      horario: string;
      nomeCliente: string;
      telefoneCliente: string;
      barbeariaId: string;
      barbeiroId: string;
      servicoId: string;
    },
    @Headers('authorization') authHeader?: string,
  ) {
    // Extrair userId do token se existir (sem obrigar auth)
    let userId: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = this.jwtService.verify(token) as any;
        userId = decoded.sub;
      } catch {
        // Token inválido, não atribuir userId
      }
    }

    return this.agendamentoService.create({ ...body, userId });
  }

  // Listar agendamentos do usuário logado
  @UseGuards(AuthGuard('jwt'))
  @Get('meus')
  async meus(@Req() req: Request) {
    const user = req.user as any;
    return this.agendamentoService.findByUser(user.id);
  }

  // Contagem de agendamentos do mês (para exibir uso do plano)
  @UseGuards(AuthGuard('jwt'))
  @Get('uso-mensal')
  async usoMensal(@Req() req: Request) {
    const user = req.user as any;
    return this.agendamentoService.contarAgendamentosMes(user.id);
  }

  // Agenda do barbeiro (dono) - lista agendamentos das suas barbearias
  @UseGuards(AuthGuard('jwt'))
  @Get('agenda')
  async agenda(@Req() req: Request, @Param() params: any) {
    const user = req.user as any;
    const data = (req.query as any).data as string | undefined;
    return this.agendamentoService.findByOwner(user.id, data);
  }

  // Consultar agendamentos por telefone (público, para clientes sem conta)
  @Get('consultar')
  async consultarPorTelefone(@Req() req: Request) {
    const telefone = (req.query as any).telefone as string;
    if (!telefone) return [];
    return this.agendamentoService.findByTelefone(telefone);
  }

  // Cancelar agendamento por telefone (público, para clientes sem conta)
  @Put(':id/cancelar-telefone')
  async cancelarPorTelefone(
    @Param('id') id: string,
    @Body('telefone') telefone: string,
  ) {
    return this.agendamentoService.cancelarPorTelefone(id, telefone);
  }

  // Horários ocupados de um barbeiro em uma data (público)
  @Get('ocupados/:barbeiroId')
  async horariosOcupados(
    @Param('barbeiroId') barbeiroId: string,
    @Req() req: Request,
  ) {
    const data = (req.query as any).data as string;
    if (!data) return [];
    return this.agendamentoService.horariosOcupados(barbeiroId, data);
  }

  // Listar agendamentos de uma barbearia
  @UseGuards(AuthGuard('jwt'))
  @Get('barbearia/:barbeariaId')
  async porBarbearia(
    @Param('barbeariaId') barbeariaId: string,
  ) {
    return this.agendamentoService.findByBarbearia(barbeariaId);
  }

  // Atualizar status (barbeiro dono)
  @UseGuards(AuthGuard('jwt'))
  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'CONFIRMADO' | 'CANCELADO' | 'CONCLUIDO',
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.agendamentoService.updateStatus(id, user.id, status);
  }

  // Cancelar agendamento (cliente)
  @UseGuards(AuthGuard('jwt'))
  @Put(':id/cancelar')
  async cancelar(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.agendamentoService.cancelar(id, user.id);
  }

  // Buscar lembretes pendentes (barbeiro dono)
  @UseGuards(AuthGuard('jwt'))
  @Get('lembretes/pendentes')
  async lembretesPendentes(@Req() req: Request) {
    const user = req.user as any;
    return this.agendamentoService.findLembretesPendentes(user.id);
  }

  // Listar clientes do dono (agrupados por agendamentos)
  @UseGuards(AuthGuard('jwt'))
  @Get('clientes')
  async clientes(@Req() req: Request) {
    const user = req.user as any;
    return this.agendamentoService.findClientesByOwner(user.id);
  }

  // Marcar lembrete como enviado
  @UseGuards(AuthGuard('jwt'))
  @Put(':id/lembrete-enviado')
  async marcarLembreteEnviado(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.agendamentoService.marcarLembreteEnviado(id, user.id);
  }
}
