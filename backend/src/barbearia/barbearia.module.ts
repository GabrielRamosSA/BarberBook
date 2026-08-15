import { Module } from '@nestjs/common';
import { MediaStorageModule } from '../media-storage/media-storage.module';
import { BarbeariaController } from './barbearia.controller';
import { BarbeariaService } from './barbearia.service';

@Module({
  imports: [MediaStorageModule],
  controllers: [BarbeariaController],
  providers: [BarbeariaService],
  exports: [BarbeariaService],
})
export class BarbeariaModule {}
