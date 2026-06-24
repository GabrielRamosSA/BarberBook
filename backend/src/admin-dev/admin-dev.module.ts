import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminDevController } from './admin-dev.controller';
import { AdminDevService } from './admin-dev.service';
import { AdminDevGuard } from './admin-dev.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('DEV_ADMIN_JWT_SECRET') || 'dev-admin-secret-change-me',
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminDevController],
  providers: [AdminDevService, AdminDevGuard],
})
export class AdminDevModule {}
