import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaStorageService } from '../media-storage/media-storage.service';
import { CreateBarbeariaDto, UpdateBarbeariaDto } from './dto/barbearia.dto';
import { PLANO_LIMITES, PlanoType } from '../plano/plano.config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BarbeariaService {
  constructor(
    private prisma: PrismaService,
    private mediaStorage: MediaStorageService,
  ) {}

  private normalizarTexto(valor?: string): string | undefined {
    if (!valor) return undefined;
    return valor.trim();
  }

  private normalizarUf(valor?: string): string | undefined {
    if (!valor) return undefined;
    return valor.trim().toUpperCase();
  }

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
        cidade: this.normalizarTexto(dto.cidade) || dto.cidade,
        estado: this.normalizarUf(dto.estado) || dto.estado,
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
        cidade: dto.cidade !== undefined ? (this.normalizarTexto(dto.cidade) || dto.cidade) : undefined,
        estado: dto.estado !== undefined ? (this.normalizarUf(dto.estado) || dto.estado) : undefined,
        slug: dto.nome ? await this.gerarSlugUnico(dto.nome, id) : undefined,
      },
    });

    return {
      message: 'Barbearia atualizada com sucesso!',
      barbearia: updated,
    };
  }

  async uploadFoto(id: string, ownerId: string, file: Express.Multer.File) {
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id },
    });

    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada.');
    }

    if (barbearia.ownerId !== ownerId) {
      throw new ForbiddenException('Sem permissão.');
    }

    const fotoUrl = await this.mediaStorage.uploadImage(file, `barbearias/${id}`);

    try {
      const updated = await this.prisma.barbearia.update({
        where: { id },
        data: { foto: fotoUrl },
      });

      await this.removeFotoArmazenada(barbearia.foto, id);

      return {
        message: 'Foto atualizada com sucesso!',
        barbearia: updated,
      };
    } catch (error) {
      await this.mediaStorage.deleteImage(fotoUrl, `barbearias/${id}`);
      throw error;
    }
  }

  async addFotos(id: string, ownerId: string, files: Express.Multer.File[]) {
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id },
    });

    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada.');
    }

    if (barbearia.ownerId !== ownerId) {
      throw new ForbiddenException('Sem permissão.');
    }

    const fotosAtuais = barbearia.fotos ?? [];
    const totalFotosAtuais = new Set(
      [barbearia.foto, ...fotosAtuais].filter(
        (foto): foto is string => Boolean(foto),
      ),
    ).size;
    if (totalFotosAtuais + files.length > 10) {
      throw new BadRequestException('A barbearia pode ter no máximo 10 fotos.');
    }

    const fotosUrls: string[] = [];
    try {
      for (const file of files) {
        fotosUrls.push(await this.mediaStorage.uploadImage(file, `barbearias/${id}`));
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
    } catch (error) {
      await this.mediaStorage.deleteImages(fotosUrls, `barbearias/${id}`);
      throw error;
    }
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

    const fotosAtuais = barbearia.fotos ?? [];
    const ehFotoPrincipal = barbearia.foto === fotoUrl;
    const estaNaGaleria = fotosAtuais.includes(fotoUrl);

    if (!ehFotoPrincipal && !estaNaGaleria) {
      throw new BadRequestException('A foto informada não pertence a esta barbearia.');
    }

    const fotosDaGaleria = fotosAtuais.filter((foto) => foto !== barbearia.foto);
    const proximaFotoPrincipal = ehFotoPrincipal ? fotosDaGaleria[0] || null : barbearia.foto;
    const proximasFotos = ehFotoPrincipal
      ? fotosDaGaleria.slice(1)
      : fotosDaGaleria.filter((foto) => foto !== fotoUrl);

    const updated = await this.prisma.barbearia.update({
      where: { id },
      data: {
        foto: proximaFotoPrincipal,
        fotos: proximasFotos,
      },
    });

    // Só apaga o arquivo depois de confirmar a atualização do banco e a associação à barbearia.
    await this.removeFotoArmazenada(fotoUrl, id);

    return {
      message: 'Foto removida com sucesso!',
      barbearia: updated,
    };
  }

  async delete(id: string, ownerId: string) {
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id },
      include: {
        barbeiros: {
          select: {
            id: true,
            foto: true,
          },
        },
      },
    });

    if (!barbearia) {
      throw new NotFoundException('Barbearia não encontrada.');
    }

    if (barbearia.ownerId !== ownerId) {
      throw new ForbiddenException('Sem permissão.');
    }

    const todasFotos = [...(barbearia.fotos || [])];
    if (barbearia.foto) todasFotos.push(barbearia.foto);

    await this.prisma.barbearia.delete({ where: { id } });
    await Promise.all([
      ...todasFotos.map((fotoUrl) => this.removeFotoArmazenada(fotoUrl, id)),
      ...barbearia.barbeiros.map((barbeiro) =>
        this.removeFotoBarbeiroArmazenada(
          barbeiro.foto,
          id,
          barbeiro.id,
        ),
      ),
    ]);

    return { message: 'Barbearia excluída com sucesso.' };
  }

  private async removeFotoArmazenada(fotoUrl: string | null, barbeariaId: string) {
    this.removeFotoLocalLegada(fotoUrl, 'barbearias');

    await this.mediaStorage.deleteImage(fotoUrl, `barbearias/${barbeariaId}`);
  }

  private async removeFotoBarbeiroArmazenada(
    fotoUrl: string | null,
    barbeariaId: string,
    barbeiroId: string,
  ) {
    this.removeFotoLocalLegada(fotoUrl, 'barbeiros');
    await this.mediaStorage.deleteImage(
      fotoUrl,
      `barbeiros/${barbeariaId}/${barbeiroId}`,
    );
  }

  private removeFotoLocalLegada(
    fotoUrl: string | null,
    pasta: 'barbearias' | 'barbeiros',
  ) {
    if (!fotoUrl?.includes(`/uploads/${pasta}/`)) return;

    const filename = path.basename(fotoUrl.split('/').pop() || '');
    if (!filename) return;

    const filepath = path.join(process.cwd(), 'uploads', pasta, filename);
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    } catch {
      // Arquivos legados no disco do Render podem já ter sido removidos.
    }
  }

  // Busca pública por cidade/estado
  async search(estado?: string, cidade?: string) {
    const where: any = { ativa: true };
    if (estado?.trim()) {
      where.estado = { equals: estado.trim(), mode: 'insensitive' };
    }
    if (cidade?.trim()) {
      where.cidade = { equals: cidade.trim(), mode: 'insensitive' };
    }

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
