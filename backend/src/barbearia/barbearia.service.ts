import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBarbeariaDto, UpdateBarbeariaDto } from './dto/barbearia.dto';
import { PLANO_LIMITES, PlanoType } from '../plano/plano.config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BarbeariaService {
  constructor(private prisma: PrismaService) {}

  private gerarSlug(nome: string): string {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private async gerarSlugUnico(nome: string, excludeId?: string): Promise<string> {
    let slug = this.gerarSlug(nome);
    let counter = 0;
    let candidato = slug;
    while (true) {
      const existing = await this.prisma.barbearia.findUnique({ where: { slug: candidato } });
      if (!existing || existing.id === excludeId) return candidato;
      counter++;
      candidato = `${slug}-${counter}`;
    }
  }

  async create(ownerId: string, dto: CreateBarbeariaDto) {
    // Verificar limite do plano
    const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
    const limites = PLANO_LIMITES[user?.plano as PlanoType || 'BASICO'];
    if (limites.maxBarbearias !== -1) {
      const count = await this.prisma.barbearia.count({ where: { ownerId } });
      if (count >= limites.maxBarbearias) {
        throw new BadRequestException(
          `Seu plano ${user?.plano || 'BASICO'} permite no máximo ${limites.maxBarbearias} barbearia(s). Faça upgrade para adicionar mais.`
        );
      }
    }

    // Bloquear lembrete para plano BASICO
    if (limites.lembreteWhatsapp === false && (dto.lembreteAtivo || dto.mensagemLembrete)) {
      dto.lembreteAtivo = false;
      dto.mensagemLembrete = undefined;
    }

    const slug = await this.gerarSlugUnico(dto.nome);
    const barbearia = await this.prisma.barbearia.create({
      data: {
        ...dto,
        slug,
        ownerId,
      },
    });

    return {
      message: 'Barbearia criada com sucesso!',
      barbearia,
    };
  }

  async findAllByOwner(ownerId: string) {
    return this.prisma.barbearia.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(idOrSlug: string) {
    // Tentar buscar por slug primeiro, depois por UUID
    let barbearia = await this.prisma.barbearia.findUnique({
      where: { slug: idOrSlug },
      include: {
        owner: {
          select: {
            id: true,
            nome: true,
            avatar: true,
          },
        },
        barbeiros: {
          where: { ativo: true },
          include: {
            horarios: {
              orderBy: { diaSemana: 'asc' },
            },
            servicos: {
              where: { ativo: true },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        servicos: {
          where: { ativo: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!barbearia) {
      barbearia = await this.prisma.barbearia.findUnique({
        where: { id: idOrSlug },
        include: {
          owner: {
            select: {
              id: true,
              nome: true,
              avatar: true,
            },
          },
          barbeiros: {
            where: { ativo: true },
            include: {
              horarios: {
                orderBy: { diaSemana: 'asc' },
              },
              servicos: {
                where: { ativo: true },
                orderBy: { createdAt: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          servicos: {
            where: { ativo: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada.');
    }

    return barbearia;
  }

  async update(id: string, ownerId: string, dto: UpdateBarbeariaDto) {
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id },
    });

    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada.');
    }

    if (barbearia.ownerId !== ownerId) {
      throw new ForbiddenException('Você não tem permissão para editar esta barbearia.');
    }

    // Bloquear lembrete para plano BASICO
    const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
    const limites = PLANO_LIMITES[user?.plano as PlanoType || 'BASICO'];

    // Verificar se esta barbearia é excedente do plano
    if (limites.maxBarbearias !== -1) {
      const todasBarbearias = await this.prisma.barbearia.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      const dentroDoLimite = todasBarbearias.slice(0, limites.maxBarbearias).map((b) => b.id);
      if (!dentroDoLimite.includes(id)) {
        throw new ForbiddenException(
          `Esta barbearia excede o limite do seu plano ${user?.plano || 'BASICO'}. Exclua barbearias extras ou faça upgrade.`
        );
      }
    }

    if (limites.lembreteWhatsapp === false && (dto.lembreteAtivo || dto.mensagemLembrete)) {
      dto.lembreteAtivo = false;
      dto.mensagemLembrete = undefined;
    }

    const updated = await this.prisma.barbearia.update({
      where: { id },
      data: {
        ...dto,
        slug: dto.nome ? await this.gerarSlugUnico(dto.nome, id) : undefined,
      },
    });

    return {
      message: 'Barbearia atualizada com sucesso!',
      barbearia: updated,
    };
  }

  async updateFoto(id: string, ownerId: string, fotoUrl: string) {
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id },
    });

    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada.');
    }

    if (barbearia.ownerId !== ownerId) {
      throw new ForbiddenException('Sem permissão.');
    }

    // Remove foto anterior local se existir
    if (barbearia.foto && barbearia.foto.includes('/uploads/')) {
      const filename = barbearia.foto.split('/').pop();
      if (filename) {
        const filepath = path.join(process.cwd(), 'uploads', 'barbearias', filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }
    }

    const updated = await this.prisma.barbearia.update({
      where: { id },
      data: { foto: fotoUrl },
    });

    return {
      message: 'Foto atualizada com sucesso!',
      barbearia: updated,
    };
  }

  async addFotos(id: string, ownerId: string, fotosUrls: string[]) {
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id },
    });

    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada.');
    }

    if (barbearia.ownerId !== ownerId) {
      throw new ForbiddenException('Sem permissão.');
    }

    const updated = await this.prisma.barbearia.update({
      where: { id },
      data: {
        fotos: {
          push: fotosUrls,
        },
      },
    });

    return {
      message: 'Fotos adicionadas com sucesso!',
      barbearia: updated,
    };
  }

  async removeFoto(id: string, ownerId: string, fotoUrl: string) {
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id },
    });

    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada.');
    }

    if (barbearia.ownerId !== ownerId) {
      throw new ForbiddenException('Sem permissão.');
    }

    // Remove o arquivo local
    if (fotoUrl.includes('/uploads/')) {
      const filename = fotoUrl.split('/').pop();
      if (filename) {
        const filepath = path.join(process.cwd(), 'uploads', 'barbearias', filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }
    }

    const updated = await this.prisma.barbearia.update({
      where: { id },
      data: {
        fotos: barbearia.fotos.filter((f) => f !== fotoUrl),
      },
    });

    return {
      message: 'Foto removida com sucesso!',
      barbearia: updated,
    };
  }

  async delete(id: string, ownerId: string) {
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id },
    });

    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada.');
    }

    if (barbearia.ownerId !== ownerId) {
      throw new ForbiddenException('Sem permissão.');
    }

    // Remove fotos locais
    const todasFotos = [...(barbearia.fotos || [])];
    if (barbearia.foto) todasFotos.push(barbearia.foto);
    for (const fotoUrl of todasFotos) {
      if (fotoUrl.includes('/uploads/')) {
        const filename = fotoUrl.split('/').pop();
        if (filename) {
          const filepath = path.join(process.cwd(), 'uploads', 'barbearias', filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        }
      }
    }

    await this.prisma.barbearia.delete({ where: { id } });

    return { message: 'Barbearia excluída com sucesso.' };
  }

  // Busca pública por cidade/estado
  async search(estado?: string, cidade?: string) {
    const where: any = { ativa: true };
    if (estado) where.estado = estado;
    if (cidade) where.cidade = cidade;

    return this.prisma.barbearia.findMany({
      where,
      include: {
        owner: {
          select: { id: true, nome: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
