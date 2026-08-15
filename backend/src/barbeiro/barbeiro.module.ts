import { Module } from '@nestjs/common';
import { MediaStorageModule } from '../media-storage/media-storage.module';
import { BarbeiroController } from './barbeiro.controller';
import { BarbeiroService } from './barbeiro.service';

@Module({
  imports: [MediaStorageModule],
  controllers: [BarbeiroController],
  providers: [BarbeiroService],
  exports: [BarbeiroService],
})
export class BarbeiroModule {}
