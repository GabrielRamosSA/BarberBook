import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  Req,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import type { Request } from 'express';

@Controller('user')
@UseGuards(AuthGuard('jwt'))
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  async getProfile(@Req() req: Request) {
    const user = req.user as any;
    return this.userService.findById(user.id);
  }

  @Put('profile')
  async updateProfile(@Req() req: Request, @Body() dto: UpdateUserDto) {
    const user = req.user as any;
    return this.userService.update(user.id, dto);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (_req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(new BadRequestException('Apenas imagens são permitidas'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadAvatar(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }
    const user = req.user as any;
    const avatarUrl = `https://barberbook-awgp.onrender.com/uploads/avatars/${file.filename}`;
    return this.userService.updateAvatar(user.id, avatarUrl);
  }

  @Delete('avatar')
  async deleteAvatar(@Req() req: Request) {
    const user = req.user as any;
    return this.userService.deleteAvatar(user.id);
  }

  @Delete('profile')
  async deleteProfile(@Req() req: Request) {
    const user = req.user as any;
    return this.userService.delete(user.id);
  }

  @Put('plano')
  async updatePlano(@Req() req: Request, @Body('plano') plano: string) {
    const user = req.user as any;
    return this.userService.updatePlano(user.id, plano);
  }

  @Get('plano/limites')
  async getPlanoLimites(@Req() req: Request) {
    const user = req.user as any;
    const userData = await this.userService.findById(user.id);
    return {
      plano: (userData as any).plano || 'BASICO',
      limites: this.userService.getPlanoLimites((userData as any).plano),
    };
  }
}
