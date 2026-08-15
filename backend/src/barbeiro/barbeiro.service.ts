import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaStorageService } from '../media-storage/media-storage.service';
import { PLANO_LIMITES, PlanoType } from '../plano/plano.config';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class BarbeiroService {
  constructor(
    private prisma: PrismaService,
    private mediaStorage: MediaStorageService,
  ) {}

  // Verifica se o usuário é dono da barbearia
  private async verificarDono(barbeariaId: string, ownerId: string) {
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id: barbeariaId },
    });
    if (!barbearia) throw new NotFoundException('Barbearia não encontrada.');
    if (barbearia.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');
    return barbearia;
  }

  async create(barbeariaId: string, ownerId: string, data: { nome: string }) {
    await this.verificarDono(barbeariaId, ownerId);

    // Verificar limite do plano
    const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
    const limites = PLANO_LIMITES[user?.plano as PlanoType || 'BASICO'];
    if (limites.maxBarbeirosPorBarbearia !== -1) {
      const count = await this.prisma.barbeiro.count({ where: { barbeariaId, ativo: true } });
      if (count >= limites.maxBarbeirosPorBarbearia) {
        throw new BadRequestException(
          `Seu plano ${user?.plano || 'BASICO'} permite no máximo ${limites.maxBarbeirosPorBarbearia} barbeiro(s) por barbearia. Faça upgrade para adicionar mais.`
        );
      }
    }

    const barbeiro = await this.prisma.barbeiro.create({
      data: {
        nome: data.nome,
        barbeariaId,
      },
    });

    return { message: 'Barbeiro adicionado!', barbeiro };
  }

  async findByBarbearia(barbeariaId: string) {
    return this.prisma.barbeiro.findMany({
      where: { barbeariaId },
      include: {
        horarios: true,
        servicos: {
          where: { ativo: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, ownerId: string, data: { nome?: string; ativo?: boolean }) {
    const barbeiro = await this.prisma.barbeiro.findUnique({
      where: { id },
      include: { barbearia: true },
    });
    if (!barbeiro) throw new NotFoundException('Barbeiro não encontrado.');
    if (barbeiro.barbearia.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');

    const updated = await this.prisma.barbeiro.update({
      where: { id },
      data,
    });

    return { message: 'Barbeiro atualizado!', barbeiro: updated };
  }

  async uploadFoto(id: string, ownerId: string, file: Express.Multer.File) {
    const barbeiro = await this.prisma.barbeiro.findUnique({
      where: { id },
      include: { barbearia: true },
    });
    if (!barbeiro) throw new NotFoundException('Barbeiro não encontrado.');
    if (barbeiro.barbearia.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');

    // Verificar se o plano permite fotos de barbeiros
    const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
    const limites = PLANO_LIMITES[user?.plano as PlanoType || 'BASICO'];
    if (!limites.fotosBarbeiros) {
      throw new BadRequestException(
        `Seu plano ${user?.plano || 'BASICO'} não permite fotos de barbeiros. Faça upgrade para usar esta funcionalidade.`
      );
    }

    const fotoUrl = await this.mediaStorage.uploadImage(
      file,
      `barbeiros/${barbeiro.barbeariaId}/${barbeiro.id}`,
    );

    try {
      const updated = await this.prisma.barbeiro.update({
        where: { id },
        data: { foto: fotoUrl },
      });

      await this.removeFotoArmazenada(
        barbeiro.foto,
        barbeiro.barbeariaId,
        barbeiro.id,
      );

      return { message: 'Foto atualizada!', barbeiro: updated };
    } catch (error) {
      await this.mediaStorage.deleteImage(
        fotoUrl,
        `barbeiros/${barbeiro.barbeariaId}/${barbeiro.id}`,
      );
      throw error;
    }
  }

  async delete(id: string, ownerId: string) {
    const barbeiro = await this.prisma.barbeiro.findUnique({
      where: { id },
      include: { barbearia: true },
    });
    if (!barbeiro) throw new NotFoundException('Barbeiro não encontrado.');
    if (barbeiro.barbearia.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');

    await this.prisma.barbeiro.delete({ where: { id } });
    await this.removeFotoArmazenada(
      barbeiro.foto,
      barbeiro.barbeariaId,
      barbeiro.id,
    );

    return { message: 'Barbeiro removido!' };
  }

  private async removeFotoArmazenada(
    fotoUrl: string | null,
    barbeariaId: string,
    barbeiroId: string,
  ) {
    if (fotoUrl?.includes('/uploads/')) {
      const filename = path.basename(fotoUrl.split('/').pop() || '');
      if (filename) {
        const filepath = path.join(process.cwd(), 'uploads', 'barbeiros', filename);
        try {
          if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        } catch {
          // Arquivos legados no disco do Render podem já ter sido removidos.
        }
      }
    }

    await this.mediaStorage.deleteImage(
      fotoUrl,
      `barbeiros/${barbeariaId}/${barbeiroId}`,
    );
  }
}
