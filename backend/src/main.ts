import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Habilita CORS para o frontend Angular (porta 4200)
  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  // Habilita validação automática dos DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Remove campos não declarados no DTO
      forbidNonWhitelisted: true, // Retorna erro se enviar campos extras
      transform: true,       // Converte tipos automaticamente
    }),
  );

  // Servir arquivos estáticos (uploads de avatares)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Prefixo global para as rotas da API
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Backend rodando em http://localhost:3000/api`);
}
bootstrap();
