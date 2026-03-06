import { Module } from '@nestjs/common';
import { BarbeariaController } from './barbearia.controller';
import { BarbeariaService } from './barbearia.service';

@Module({
  controllers: [BarbeariaController],
  providers: [BarbeariaService],
  exports: [BarbeariaService],
})
export class BarbeariaModule {}
