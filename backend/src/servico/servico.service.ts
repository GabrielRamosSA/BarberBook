import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLANO_LIMITES, PlanoType } from '../plano/plano.config';

@Injectable()
export class ServicoService {
  constructor(private prisma: PrismaService) {}

  private async verificarDono(barbeariaId: string, ownerId: string) {
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id: barbeariaId },
    });
    if (!barbearia) throw new NotFoundException('Barbearia não encontrada.');
    if (barbearia.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');
    return barbearia;
  }

  async create(barbeariaId: string, ownerId: string, data: { nome: string; preco: number; duracao: number; barbeiroId?: string }) {
    await this.verificarDono(barbeariaId, ownerId);

    // Verificar limite do plano
    const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
    const limites = PLANO_LIMITES[user?.plano as PlanoType || 'BASICO'];
    if (limites.maxServicosPorBarbeiro !== -1 && data.barbeiroId) {
      const count = await this.prisma.servico.count({
        where: { barbeiroId: data.barbeiroId, ativo: true },
      });
      if (count >= limites.maxServicosPorBarbeiro) {
        throw new BadRequestException(
          `Seu plano ${user?.plano || 'BASICO'} permite no máximo ${limites.maxServicosPorBarbeiro} serviço(s) por barbeiro. Faça upgrade para adicionar mais.`
        );
      }
    }

    const servico = await this.prisma.servico.create({
      data: {
        nome: data.nome,
        preco: data.preco,
        duracao: data.duracao,
        barbeariaId,
        barbeiroId: data.barbeiroId || null,
      },
    });

    return { message: 'Serviço adicionado!', servico };
  }

  async findByBarbearia(barbeariaId: string) {
    return this.prisma.servico.findMany({
      where: { barbeariaId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, ownerId: string, data: { nome?: string; preco?: number; duracao?: number; ativo?: boolean; barbeiroId?: string }) {
    const servico = await this.prisma.servico.findUnique({
      where: { id },
      include: { barbearia: true },
    });
    if (!servico) throw new NotFoundException('Serviço não encontrado.');
    if (servico.barbearia.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');

    const updated = await this.prisma.servico.update({
      where: { id },
      data,
    });

    return { message: 'Serviço atualizado!', servico: updated };
  }

  async delete(id: string, ownerId: string) {
    const servico = await this.prisma.servico.findUnique({
      where: { id },
      include: { barbearia: true },
    });
    if (!servico) throw new NotFoundException('Serviço não encontrado.');
    if (servico.barbearia.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');

    await this.prisma.servico.delete({ where: { id } });
    return { message: 'Serviço removido!' };
  }
}
