import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BarbeiroService } from './barbeiro.service';
import type { Request } from 'express';
import * as fs from 'fs';

@Controller('barbearias/:barbeariaId/barbeiros')
export class BarbeiroController {
  constructor(private barbeiroService: BarbeiroService) {}

  @Get()
  async findAll(@Param('barbeariaId') barbeariaId: string) {
    return this.barbeiroService.findByBarbearia(barbeariaId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Param('barbeariaId') barbeariaId: string,
    @Body() body: { nome: string },
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.barbeiroService.create(barbeariaId, user.id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { nome?: string; ativo?: boolean },
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.barbeiroService.update(id, user.id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/foto')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = './uploads/barbeiros';
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `barbeiro-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(new Error('Apenas imagens são permitidas'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadFoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    const fotoUrl = `/uploads/barbeiros/${file.filename}`;
    return this.barbeiroService.updateFoto(id, user.id, fotoUrl);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as any;
    return this.barbeiroService.delete(id, user.id);
  }
}
