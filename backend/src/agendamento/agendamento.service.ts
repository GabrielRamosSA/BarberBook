import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLANO_LIMITES, PlanoType } from '../plano/plano.config';

@Injectable()
export class AgendamentoService {
  constructor(private prisma: PrismaService) {}

  private normalizeTelefone(telefone: string): string {
    return (telefone || '').replace(/\D/g, '');
  }

  async contarAgendamentosMes(ownerId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
    const plano = (user?.plano as PlanoType) || 'BASICO';
    const limites = PLANO_LIMITES[plano];

    const barbearias = await this.prisma.barbearia.findMany({
      where: { ownerId },
      select: { id: true },
    });

    const mesAtual = new Date().toISOString().substring(0, 7);
    const count = await this.prisma.agendamento.count({
      where: {
        barbeariaId: { in: barbearias.map(b => b.id) },
        data: { startsWith: mesAtual },
        status: { not: 'CANCELADO' },
      },
    });

    return {
      usado: count,
      limite: limites.maxAgendamentosMes,
      plano,
    };
  }

  async create(data: {
    data: string;
    horario: string;
    nomeCliente: string;
    telefoneCliente: string;
    barbeariaId: string;
    barbeiroId: string;
    servicoId: string;
    userId?: string;
  }) {
    // Validar telefone (10-11 dígitos: DDD + número)
    const telDigits = this.normalizeTelefone(data.telefoneCliente);
    if (telDigits.length < 10 || telDigits.length > 11) {
      throw new BadRequestException('Telefone inválido. Informe DDD + número (10 ou 11 dígitos).');
    }

    // Verificar limite de agendamentos do plano do dono da barbearia
    const barbearia = await this.prisma.barbearia.findUnique({
      where: { id: data.barbeariaId },
      include: { owner: { select: { id: true, plano: true } } },
    });
    if (barbearia) {
      const limites = PLANO_LIMITES[barbearia.owner.plano as PlanoType || 'BASICO'];
      if (limites.maxAgendamentosMes !== -1) {
        // Contar agendamentos do mês atual para as barbearias desse dono
        const barbearias = await this.prisma.barbearia.findMany({
          where: { ownerId: barbearia.ownerId },
          select: { id: true },
        });
        const mesAtual = data.data.substring(0, 7); // "2026-03"
        const count = await this.prisma.agendamento.count({
          where: {
            barbeariaId: { in: barbearias.map(b => b.id) },
            data: { startsWith: mesAtual },
            status: { not: 'CANCELADO' },
          },
        });
        if (count >= limites.maxAgendamentosMes) {
          throw new BadRequestException(
            `A barbearia atingiu o limite de ${limites.maxAgendamentosMes} agendamentos/mês do plano ${barbearia.owner.plano}. O dono precisa fazer upgrade.`
          );
        }
      }
    }

    const agendamento = await this.prisma.agendamento.create({
      data: {
        data: data.data,
        horario: data.horario,
        nomeCliente: data.nomeCliente,
        // Salvar sempre normalizado para manter consistência na consulta.
        telefoneCliente: telDigits,
        barbeariaId: data.barbeariaId,
        barbeiroId: data.barbeiroId,
        servicoId: data.servicoId,
        userId: data.userId || null,
      },
      include: {
        barbearia: { select: { id: true, nome: true, endereco: true, telefone: true } },
        barbeiro: { select: { id: true, nome: true, foto: true } },
        servico: { select: { id: true, nome: true, preco: true, duracao: true } },
      },
    });

    return { message: 'Agendamento realizado com sucesso!', agendamento };
  }

  async findByUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telefone: true },
    });
    const tel = user?.telefone ? this.normalizeTelefone(user.telefone) : '';
    const where = tel.length >= 10
      ? { OR: [{ userId }, { userId: null, telefoneCliente: tel }] }
      : { userId };

    return this.prisma.agendamento.findMany({
      where,
      include: {
        barbearia: { select: { id: true, nome: true, endereco: true, telefone: true, slug: true } },
        barbeiro: { select: { id: true, nome: true, foto: true } },
        servico: { select: { id: true, nome: true, preco: true, duracao: true } },
      },
      orderBy: [{ data: 'desc' }, { horario: 'desc' }],
    });
  }

  async findByBarbearia(barbeariaId: string) {
    return this.prisma.agendamento.findMany({
      where: { barbeariaId },
      include: {
        barbeiro: { select: { id: true, nome: true, foto: true } },
        servico: { select: { id: true, nome: true, preco: true, duracao: true } },
      },
      orderBy: [{ data: 'asc' }, { horario: 'asc' }],
    });
  }

  // Buscar agendamentos para a agenda do barbeiro (dono)
  async findByOwner(ownerId: string, data?: string) {
    // Buscar todas as barbearias do dono
    const barbearias = await this.prisma.barbearia.findMany({
      where: { ownerId },
      select: { id: true },
    });
    const barbeariaIds = barbearias.map((b) => b.id);
    if (barbeariaIds.length === 0) return [];

    const where: any = { barbeariaId: { in: barbeariaIds } };
    if (data) where.data = data;

    return this.prisma.agendamento.findMany({
      where,
      include: {
        user: { select: { id: true, nome: true, avatar: true, telefone: true } },
        barbearia: { select: { id: true, nome: true } },
        barbeiro: { select: { id: true, nome: true, foto: true } },
        servico: { select: { id: true, nome: true, preco: true, duracao: true } },
      },
      orderBy: [{ data: 'asc' }, { horario: 'asc' }],
    });
  }

  // Atualizar status (barbeiro dono)
  async updateStatus(id: string, ownerId: string, status: 'CONFIRMADO' | 'CANCELADO' | 'CONCLUIDO') {
    const agendamento = await this.prisma.agendamento.findUnique({
      where: { id },
      include: { barbearia: { select: { ownerId: true } } },
    });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    if (agendamento.barbearia.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');

    const updated = await this.prisma.agendamento.update({
      where: { id },
      data: { status },
    });
    return { message: 'Status atualizado.', agendamento: updated };
  }

  async cancelar(id: string, userId: string) {
    const agendamento = await this.prisma.agendamento.findUnique({
      where: { id },
    });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    if (agendamento.userId !== userId) throw new ForbiddenException('Sem permissão.');

    const updated = await this.prisma.agendamento.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });

    return { message: 'Agendamento cancelado.', agendamento: updated };
  }

  // Buscar agendamentos por telefone (para clientes sem conta)
  async findByTelefone(telefone: string) {
    const tel = this.normalizeTelefone(telefone);
    if (tel.length < 10 || tel.length > 11) {
      return [];
    }

    const last8 = tel.slice(-8);
    const candidatos = await this.prisma.agendamento.findMany({
      where: {
        telefoneCliente: { contains: last8 },
      },
      include: {
        barbearia: { select: { id: true, nome: true, endereco: true, telefone: true, slug: true } },
        barbeiro: { select: { id: true, nome: true, foto: true } },
        servico: { select: { id: true, nome: true, preco: true, duracao: true } },
      },
      orderBy: [{ data: 'desc' }, { horario: 'desc' }],
    });

    return candidatos.filter((ag) => {
      const agTel = this.normalizeTelefone(ag.telefoneCliente);
      return agTel === tel || agTel.endsWith(tel) || tel.endsWith(agTel);
    });
  }

  // Cancelar agendamento por telefone (para clientes sem conta)
  async cancelarPorTelefone(id: string, telefone: string) {
    const tel = this.normalizeTelefone(telefone);
    const agendamento = await this.prisma.agendamento.findUnique({
      where: { id },
    });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    const agTel = this.normalizeTelefone(agendamento.telefoneCliente);
    const telefoneConfere = agTel === tel || agTel.endsWith(tel) || tel.endsWith(agTel);
    if (!telefoneConfere) {
      throw new ForbiddenException('Telefone não confere.');
    }
    if (agendamento.userId) {
      throw new ForbiddenException('Este agendamento pertence a um usuário cadastrado.');
    }

    const updated = await this.prisma.agendamento.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });
    return { message: 'Agendamento cancelado.', agendamento: updated };
  }

  // Buscar clientes únicos das barbearias do dono
  async findClientesByOwner(ownerId: string) {
    const barbearias = await this.prisma.barbearia.findMany({
      where: { ownerId },
      select: { id: true },
    });
    const barbeariaIds = barbearias.map((b) => b.id);
    if (barbeariaIds.length === 0) return [];

    const agendamentos = await this.prisma.agendamento.findMany({
      where: { barbeariaId: { in: barbeariaIds } },
      include: {
        user: { select: { id: true, nome: true, avatar: true, email: true, telefone: true } },
        barbearia: { select: { id: true, nome: true } },
        barbeiro: { select: { id: true, nome: true } },
        servico: { select: { id: true, nome: true, preco: true, duracao: true } },
      },
      orderBy: [{ data: 'desc' }, { horario: 'desc' }],
    });

    // Agrupar por cliente (userId ou telefoneCliente como chave)
    const clientesMap = new Map<string, any>();

    for (const ag of agendamentos) {
      const key = ag.userId || `tel:${ag.telefoneCliente}`;

      if (!clientesMap.has(key)) {
        clientesMap.set(key, {
          id: key,
          nome: ag.user?.nome || ag.nomeCliente,
          telefone: ag.user?.telefone || ag.telefoneCliente,
          email: ag.user?.email || null,
          avatar: ag.user?.avatar || null,
          cadastrado: !!ag.userId,
          totalAgendamentos: 0,
          totalConcluidos: 0,
          totalCancelados: 0,
          totalGasto: 0,
          ultimoAgendamento: null as any,
          primeiroAgendamento: null as any,
          servicos: new Set<string>(),
          agendamentos: [] as any[],
        });
      }

      const cliente = clientesMap.get(key)!;
      cliente.totalAgendamentos++;
      if (ag.status === 'CONCLUIDO') {
        cliente.totalConcluidos++;
        cliente.totalGasto += ag.servico.preco;
      }
      if (ag.status === 'CANCELADO') cliente.totalCancelados++;
      cliente.servicos.add(ag.servico.nome);

      // Último e primeiro agendamento (já ordenados desc)
      if (!cliente.ultimoAgendamento) {
        cliente.ultimoAgendamento = { data: ag.data, horario: ag.horario, status: ag.status };
      }
      cliente.primeiroAgendamento = { data: ag.data, horario: ag.horario };

      cliente.agendamentos.push({
        id: ag.id,
        data: ag.data,
        horario: ag.horario,
        status: ag.status,
        servico: ag.servico,
        barbeiro: ag.barbeiro,
        barbearia: ag.barbearia,
      });
    }

    // Converter Sets e retornar array
    return Array.from(clientesMap.values()).map((c) => ({
      ...c,
      servicos: Array.from(c.servicos),
    }));
  }

  // Buscar horários ocupados de um barbeiro em uma data
  async horariosOcupados(barbeiroId: string, data: string): Promise<string[]> {
    const agendamentos = await this.prisma.agendamento.findMany({
      where: {
        barbeiroId,
        data,
        status: { notIn: ['CANCELADO'] },
      },
      select: { horario: true },
    });
    return agendamentos.map((a) => a.horario);
  }

  // Buscar agendamentos que precisam de lembrete (30 min antes)
  async findLembretesPendentes(ownerId: string): Promise<any[]> {
    // Buscar barbearias do dono que têm lembrete ativo
    const barbearias = await this.prisma.barbearia.findMany({
      where: { ownerId, lembreteAtivo: true, mensagemLembrete: { not: null } },
      select: { id: true, nome: true, mensagemLembrete: true },
    });
    if (barbearias.length === 0) return [];

    const barbeariaIds = barbearias.map((b) => b.id);
    const barbeariaMap = new Map(barbearias.map((b) => [b.id, b]));

    // Data e hora atual
    const agora = new Date();
    const hoje = agora.toISOString().split('T')[0];
    const agoraMinutos = agora.getHours() * 60 + agora.getMinutes();
    const limiteMinutos = agoraMinutos + 30;

    // Buscar agendamentos de hoje que não foram cancelados e não tiveram lembrete enviado
    const agendamentos = await this.prisma.agendamento.findMany({
      where: {
        barbeariaId: { in: barbeariaIds },
        data: hoje,
        status: { notIn: ['CANCELADO', 'CONCLUIDO'] },
        lembreteEnviado: false,
      },
      include: {
        barbearia: { select: { id: true, nome: true, mensagemLembrete: true } },
        barbeiro: { select: { id: true, nome: true } },
        servico: { select: { id: true, nome: true, preco: true, duracao: true } },
      },
      orderBy: { horario: 'asc' },
    });

    // Filtrar os que são nos próximos 30 minutos
    return agendamentos.filter((ag) => {
      const [h, m] = ag.horario.split(':').map(Number);
      const agMinutos = h * 60 + m;
      return agMinutos > agoraMinutos && agMinutos <= limiteMinutos;
    }).map((ag) => {
      const barbearia = barbeariaMap.get(ag.barbeariaId);
      let mensagem = barbearia?.mensagemLembrete || '';
      // Substituir variáveis na mensagem
      mensagem = mensagem
        .replace(/{nome}/g, ag.nomeCliente)
        .replace(/{servico}/g, ag.servico.nome)
        .replace(/{horario}/g, ag.horario)
        .replace(/{data}/g, ag.data.split('-').reverse().join('/'))
        .replace(/{barbearia}/g, ag.barbearia.nome)
        .replace(/{barbeiro}/g, ag.barbeiro.nome);

      return {
        ...ag,
        mensagemFormatada: mensagem,
      };
    });
  }

  // Marcar lembrete como enviado
  async marcarLembreteEnviado(id: string, ownerId: string) {
    const agendamento = await this.prisma.agendamento.findUnique({
      where: { id },
      include: { barbearia: { select: { ownerId: true } } },
    });
    if (!agendamento) throw new NotFoundException('Agendamento não encontrado.');
    if (agendamento.barbearia.ownerId !== ownerId) throw new ForbiddenException('Sem permissão.');

    return this.prisma.agendamento.update({
      where: { id },
      data: { lembreteEnviado: true },
    });
  }
}
