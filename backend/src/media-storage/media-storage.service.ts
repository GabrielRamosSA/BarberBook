import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);
  private readonly bucket: string;
  private readonly supabaseUrl: string | null;
  private readonly client: SupabaseClient | null;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl =
      this.configService.get<string>('SUPABASE_URL')?.replace(/\/+$/, '') ||
      null;
    const secretKey =
      this.configService.get<string>('SUPABASE_SECRET_KEY') ||
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.bucket =
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET') ||
      'barberbook-media';
    this.client =
      this.supabaseUrl && secretKey
        ? createClient(this.supabaseUrl, secretKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
              detectSessionInUrl: false,
            },
          })
        : null;
  }

  async uploadImage(
    file: Express.Multer.File,
    directory: string,
  ): Promise<string> {
    if (!file?.buffer) {
      throw new BadRequestException('Nenhum arquivo de imagem foi enviado.');
    }

    const extension = IMAGE_EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new BadRequestException(
        'Apenas imagens JPG, PNG, WebP ou GIF são permitidas.',
      );
    }

    const client = this.getClient();
    const objectPath = `${this.normalizeDirectory(directory)}/${randomUUID()}.${extension}`;
    const { data, error } = await client.storage
      .from(this.bucket)
      .upload(objectPath, file.buffer, {
        cacheControl: '3600',
        contentType: file.mimetype,
        upsert: false,
      });

    if (error || !data) {
      this.logger.error(
        `Falha ao enviar imagem ao Supabase Storage: ${error?.message || 'sem resposta'}`,
      );
      throw new ServiceUnavailableException(
        'Não foi possível salvar a imagem agora. Tente novamente em instantes.',
      );
    }

    const { data: publicUrlData } = client.storage
      .from(this.bucket)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }

  async deleteImage(
    url: string | null | undefined,
    expectedDirectory: string,
  ): Promise<void> {
    const objectPath = this.getObjectPath(url);
    const expectedPrefix = `${this.normalizeDirectory(expectedDirectory)}/`;
    if (!objectPath || !this.client || !objectPath.startsWith(expectedPrefix))
      return;

    try {
      const { error } = await this.client.storage
        .from(this.bucket)
        .remove([objectPath]);
      if (error) {
        this.logger.warn(
          `Não foi possível remover imagem antiga do Storage: ${error.message}`,
        );
      }
    } catch {
      this.logger.warn('Não foi possível remover imagem antiga do Storage.');
    }
  }

  async deleteImages(
    urls: Array<string | null | undefined>,
    expectedDirectory: string,
  ): Promise<void> {
    await Promise.all(
      urls.map((url) => this.deleteImage(url, expectedDirectory)),
    );
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'O armazenamento de imagens ainda não está configurado. Tente novamente mais tarde.',
      );
    }

    return this.client;
  }

  private normalizeDirectory(directory: string): string {
    const segments = directory.split('/');

    if (
      !segments.length ||
      segments.some((segment) => !/^[A-Za-z0-9_-]+$/.test(segment))
    ) {
      throw new BadRequestException('Diretório de armazenamento inválido.');
    }

    return segments.join('/');
  }

  private getObjectPath(url: string | null | undefined): string | null {
    if (!url || !this.supabaseUrl) return null;

    try {
      const publicUrl = new URL(url);
      const storageUrl = new URL(this.supabaseUrl);
      const prefix = `/storage/v1/object/public/${encodeURIComponent(this.bucket)}/`;

      if (
        publicUrl.origin !== storageUrl.origin ||
        !publicUrl.pathname.startsWith(prefix)
      ) {
        return null;
      }

      return decodeURIComponent(publicUrl.pathname.slice(prefix.length));
    } catch {
      return null;
    }
  }
}
