import { Module } from '@nestjs/common';
import { MediaStorageModule } from '../media-storage/media-storage.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [MediaStorageModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
