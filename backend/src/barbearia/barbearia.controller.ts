import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BarbeariaService } from './barbearia.service';
import { CreateBarbeariaDto, UpdateBarbeariaDto } from './dto/barbearia.dto';
import type { Request } from 'express';

@Controller('barbearias')
export class BarbeariaController {
  constructor(private barbeariaService: BarbeariaService) {}

  // ========================
  // ROTAS PÚBLICAS
  // ========================
  @Get('search')
  async search(
    @Query('estado') estado?: string,
    @Query('cidade') cidade?: string,
  ) {
    return this.barbeariaService.search(estado, cidade);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.barbeariaService.findById(id);
  }

  // ========================
  // ROTAS AUTENTICADAS (dono)
  // ========================
  @UseGuards(AuthGuard('jwt'))
  @Get('owner/me')
  async myBarbearias(@Req() req: Request) {
    const user = req.user as any;
    return this.barbeariaService.findAllByOwner(user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Req() req: Request, @Body() dto: CreateBarbeariaDto) {
    const user = req.user as any;
    return this.barbeariaService.create(user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateBarbeariaDto,
  ) {
    const user = req.user as any;
    return this.barbeariaService.update(id, user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/foto')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(new BadRequestException('Apenas imagens são permitidas'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadFoto(
    @Req() req: Request,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    const user = req.user as any;
    return this.barbeariaService.uploadFoto(id, user.id, file);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/fotos')
  @UseInterceptors(
    FilesInterceptor('fotos', 10, {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(new BadRequestException('Apenas imagens são permitidas'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadFotos(
    @Req() req: Request,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    const user = req.user as any;
    return this.barbeariaService.addFotos(id, user.id, files);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id/fotos')
  async removeFoto(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('fotoUrl') fotoUrl: string,
  ) {
    const user = req.user as any;
    return this.barbeariaService.removeFoto(id, user.id, fotoUrl);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async delete(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.barbeariaService.delete(id, user.id);
  }
}
