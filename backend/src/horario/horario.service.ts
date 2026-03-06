import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface HorarioData {
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  almocoInicio?: string;
  almocoFim?: string;
}

@Injectable()
export class HorarioService {
  constructor(private prisma: PrismaService) {}

  private async verificarDonoBarbeiro(barbeiroId: string, ownerId: string) {
    const barbeiro = await this.prisma.barbeiro.findUnique({
      where: { id: barbeiroId },
      include: { barbearia: true },
    });
    if (!barbeiro) throw new NotFoundException('Barbeiro não encontrado.');
    if (barbeiro.barbearia.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');
    return barbeiro;
  }

  async setHorarios(barbeiroId: string, ownerId: string, horarios: HorarioData[]) {
    await this.verificarDonoBarbeiro(barbeiroId, ownerId);

    // Remove horários antigos e cria novos
    await this.prisma.horarioDisponivel.deleteMany({
      where: { barbeiroId },
    });

    const created = await this.prisma.horarioDisponivel.createMany({
      data: horarios.map((h) => ({
        barbeiroId,
        diaSemana: h.diaSemana,
        horaInicio: h.horaInicio,
        horaFim: h.horaFim,
        almocoInicio: h.almocoInicio || null,
        almocoFim: h.almocoFim || null,
      })),
    });

    const result = await this.prisma.horarioDisponivel.findMany({
      where: { barbeiroId },
      orderBy: { diaSemana: 'asc' },
    });

    return { message: 'Horários atualizados!', horarios: result };
  }

  async findByBarbeiro(barbeiroId: string) {
    return this.prisma.horarioDisponivel.findMany({
      where: { barbeiroId },
      orderBy: { diaSemana: 'asc' },
    });
  }
}
