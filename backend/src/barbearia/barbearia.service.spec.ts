import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BarbeariaService } from './barbearia.service';

interface FotosAtualizadas {
  foto: string | null;
  fotos: string[];
}

describe('BarbeariaService.removeFoto', () => {
  const barbearia = {
    id: 'barbearia-1',
    ownerId: 'dono-1',
    foto: 'https://cdn.example/foto-principal.jpg',
    fotos: [
      'https://cdn.example/foto-galeria-1.jpg',
      'https://cdn.example/foto-galeria-2.jpg',
    ],
  };

  let prisma: {
    barbearia: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: BarbeariaService;

  beforeEach(() => {
    prisma = {
      barbearia: {
        findUnique: jest.fn().mockResolvedValue(barbearia),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: FotosAtualizadas }) => ({
            ...barbearia,
            ...data,
          })),
      },
    };

    service = new BarbeariaService(prisma as unknown as PrismaService);
  });

  it('remove uma foto da galeria sem alterar a principal', async () => {
    const resposta = await service.removeFoto(
      barbearia.id,
      barbearia.ownerId,
      'https://cdn.example/foto-galeria-1.jpg',
    );

    expect(prisma.barbearia.update).toHaveBeenCalledWith({
      where: { id: barbearia.id },
      data: {
        foto: barbearia.foto,
        fotos: ['https://cdn.example/foto-galeria-2.jpg'],
      },
    });
    expect(resposta.barbearia.foto).toBe(barbearia.foto);
  });

  it('promove a primeira foto da galeria ao remover a principal', async () => {
    const resposta = await service.removeFoto(
      barbearia.id,
      barbearia.ownerId,
      barbearia.foto,
    );

    expect(prisma.barbearia.update).toHaveBeenCalledWith({
      where: { id: barbearia.id },
      data: {
        foto: 'https://cdn.example/foto-galeria-1.jpg',
        fotos: ['https://cdn.example/foto-galeria-2.jpg'],
      },
    });
    expect(resposta.barbearia.foto).toBe(
      'https://cdn.example/foto-galeria-1.jpg',
    );
  });

  it('recusa a exclusão de uma foto que não pertence à barbearia', async () => {
    await expect(
      service.removeFoto(
        barbearia.id,
        barbearia.ownerId,
        'https://cdn.example/foto-de-outra-barbearia.jpg',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.barbearia.update).not.toHaveBeenCalled();
  });

  it('recusa a exclusão por quem não é dono da barbearia', async () => {
    await expect(
      service.removeFoto(
        barbearia.id,
        'outro-usuario',
        'https://cdn.example/foto-galeria-1.jpg',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.barbearia.update).not.toHaveBeenCalled();
  });
});
