import { Module } from '@nestjs/common';
import { MediaStorageService } from './media-storage.service';

@Module({
  providers: [MediaStorageService],
  exports: [MediaStorageService],
})
export class MediaStorageModule {}
