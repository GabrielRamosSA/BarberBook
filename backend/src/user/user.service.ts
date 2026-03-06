import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PLANO_LIMITES, PlanoType } from '../plano/plano.config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

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

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dto,
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

  async updateAvatar(id: string, avatarUrl: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Remove old avatar file if it's a local upload
    this.removeLocalAvatar(user.avatar);

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

    return {
      message: 'Avatar atualizado com sucesso',
      user: updatedUser,
    };
  }

  async deleteAvatar(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Remove local avatar file if exists
    this.removeLocalAvatar(user.avatar);

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

    return {
      message: 'Avatar removido com sucesso',
      user: updatedUser,
    };
  }

  private removeLocalAvatar(avatarUrl: string | null) {
    if (!avatarUrl || !avatarUrl.includes('/uploads/avatars/')) return;

    try {
      const filename = avatarUrl.split('/uploads/avatars/').pop();
      if (filename) {
        const filePath = path.join(process.cwd(), 'uploads', 'avatars', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch {
      // Silently ignore file removal errors
    }
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Remove avatar file before deleting user
    this.removeLocalAvatar(user.avatar);

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'Usuário deletado com sucesso' };
  }

  async updatePlano(id: string, plano: string) {
    const validPlanos = ['BASICO', 'PROFISSIONAL', 'PREMIUM'];
    if (!validPlanos.includes(plano)) {
      throw new BadRequestException('Plano inválido.');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

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
