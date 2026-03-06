import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { BarbeariaModule } from './barbearia/barbearia.module';
import { BarbeiroModule } from './barbeiro/barbeiro.module';
import { ServicoModule } from './servico/servico.module';
import { HorarioModule } from './horario/horario.module';
import { AgendamentoModule } from './agendamento/agendamento.module';
import { PagamentoModule } from './pagamento/pagamento.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    BarbeariaModule,
    BarbeiroModule,
    ServicoModule,
    HorarioModule,
    AgendamentoModule,
    PagamentoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
