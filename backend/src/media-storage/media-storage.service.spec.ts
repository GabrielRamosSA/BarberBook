import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaStorageService } from './media-storage.service';

describe('MediaStorageService', () => {
  const image = {
    buffer: Buffer.from('imagem'),
    mimetype: 'image/jpeg',
  } as Express.Multer.File;

  function createService(config: Record<string, string | undefined> = {}) {
    const configService = {
      get: jest.fn((key: string) => config[key]),
    } as unknown as ConfigService;

    return new MediaStorageService(configService);
  }

  it('falha rapidamente quando o Storage não está configurado', async () => {
    const service = createService();

    await expect(
      service.uploadImage(image, 'avatars/user-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejeita diretórios inválidos antes de enviar a imagem', async () => {
    const service = createService({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret_test',
    });

    await expect(
      service.uploadImage(image, 'avatars/../user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('só remove um objeto que pertence ao diretório esperado', async () => {
    const service = createService({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret_test',
      SUPABASE_STORAGE_BUCKET: 'barberbook-media',
    });
    const remove = jest.fn().mockResolvedValue({ error: null });
    const from = jest.fn().mockReturnValue({ remove });

    Object.defineProperty(service, 'client', {
      value: { storage: { from } },
    });

    await service.deleteImage(
      'https://project.supabase.co/storage/v1/object/public/barberbook-media/avatars/user-2/foto.jpg',
      'avatars/user-1',
    );

    expect(remove).not.toHaveBeenCalled();

    await service.deleteImage(
      'https://project.supabase.co/storage/v1/object/public/barberbook-media/avatars/user-1/foto.jpg',
      'avatars/user-1',
    );

    expect(remove).toHaveBeenCalledWith(['avatars/user-1/foto.jpg']);
  });
});
