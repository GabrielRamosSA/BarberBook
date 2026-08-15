import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaStorageService } from '../media-storage/media-storage.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PLANO_LIMITES, PlanoType } from '../plano/plano.config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private mediaStorage: MediaStorageService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        plano: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { nome, telefone, tipo } = dto;
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { nome, telefone, tipo },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        plano: true,
        avatar: true,
      },
    });

    return {
      message: 'Usuário atualizado com sucesso',
      user: updatedUser,
    };
  }

  async uploadAvatar(id: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const avatarUrl = await this.mediaStorage.uploadImage(file, `avatars/${id}`);

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: { avatar: avatarUrl },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          tipo: true,
          plano: true,
          avatar: true,
        },
      });

      await this.removeAvatar(user.avatar, id);

      return {
        message: 'Avatar atualizado com sucesso',
        user: updatedUser,
      };
    } catch (error) {
      await this.mediaStorage.deleteImage(avatarUrl, `avatars/${id}`);
      throw error;
    }
  }

  async deleteAvatar(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { avatar: null },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        plano: true,
        avatar: true,
      },
    });

    await this.removeAvatar(user.avatar, id);

    return {
      message: 'Avatar removido com sucesso',
      user: updatedUser,
    };
  }

  private async removeAvatar(avatarUrl: string | null, userId: string) {
    this.removeLocalUpload(avatarUrl, 'avatars');
    await this.mediaStorage.deleteImage(avatarUrl, `avatars/${userId}`);
  }

  private async removeBarbeariaFoto(fotoUrl: string | null, barbeariaId: string) {
    this.removeLocalUpload(fotoUrl, 'barbearias');
    await this.mediaStorage.deleteImage(fotoUrl, `barbearias/${barbeariaId}`);
  }

  private async removeBarbeiroFoto(
    fotoUrl: string | null,
    barbeariaId: string,
    barbeiroId: string,
  ) {
    this.removeLocalUpload(fotoUrl, 'barbeiros');
    await this.mediaStorage.deleteImage(
      fotoUrl,
      `barbeiros/${barbeariaId}/${barbeiroId}`,
    );
  }

  private removeLocalUpload(
    mediaUrl: string | null,
    pasta: 'avatars' | 'barbearias' | 'barbeiros',
  ) {
    if (!mediaUrl?.includes(`/uploads/${pasta}/`)) return;

    const filename = path.basename(mediaUrl.split('/').pop() || '');
    if (!filename) return;

    const filePath = path.join(process.cwd(), 'uploads', pasta, filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // Arquivos legados podem já ter desaparecido do filesystem efêmero.
    }
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const barbearias = await this.prisma.barbearia.findMany({
      where: { ownerId: id },
      select: {
        id: true,
        foto: true,
        fotos: true,
        barbeiros: {
          select: {
            id: true,
            foto: true,
          },
        },
      },
    });

    await this.prisma.user.delete({
      where: { id },
    });

    await this.removeAvatar(user.avatar, id);
    await Promise.all(
      barbearias.flatMap((barbearia) => [
        ...[barbearia.foto, ...(barbearia.fotos ?? [])].map((fotoUrl) =>
          this.removeBarbeariaFoto(fotoUrl, barbearia.id),
        ),
        ...barbearia.barbeiros.map((barbeiro) =>
          this.removeBarbeiroFoto(
            barbeiro.foto,
            barbearia.id,
            barbeiro.id,
          ),
        ),
      ]),
    );

    return { message: 'Usuário deletado com sucesso' };
  }

  async updatePlano(id: string, plano: string) {
    const validPlanos = ['BASICO', 'PROFISSIONAL', 'PREMIUM'];
    if (!validPlanos.includes(plano)) {
      throw new BadRequestException('Plano inválido.');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Se a assinatura já foi cancelada, mantém o plano pago até o fim do período.
    if (
      plano === 'BASICO' &&
      user.plano !== 'BASICO' &&
      user.subscriptionStatus === 'cancelled' &&
      user.planoExpiraEm &&
      user.planoExpiraEm > new Date()
    ) {
      throw new BadRequestException(
        `Seu plano permanece ativo até ${user.planoExpiraEm.toLocaleDateString('pt-BR')}.`,
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { plano: plano as any },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        plano: true,
        avatar: true,
      },
    });

    return { message: `Plano atualizado para ${plano}!`, user: updatedUser };
  }

  getPlanoLimites(plano: string) {
    const validPlano = (plano || 'BASICO') as PlanoType;
    return PLANO_LIMITES[validPlano] || PLANO_LIMITES.BASICO;
  }
}
