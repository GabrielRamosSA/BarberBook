import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuporteController } from './suporte.controller';
import { SuporteService } from './suporte.service';

@Module({
  imports: [AuthModule],
  controllers: [SuporteController],
  providers: [SuporteService],
})
export class SuporteModule {}
