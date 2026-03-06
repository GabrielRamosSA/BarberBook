import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService, User } from '../../../auth/auth.service';

interface AgendamentoAgenda {
  id: string;
  data: string;
  horario: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO' | 'CONCLUIDO';
  nomeCliente: string;
  telefoneCliente: string;
  user: {
    id: string;
    nome: string;
    avatar: string | null;
    telefone: string | null;
  } | null;
  barbearia: {
    id: string;
    nome: string;
  };
  barbeiro: {
    id: string;
    nome: string;
    foto: string | null;
  };
  servico: {
    id: string;
    nome: string;
    preco: number;
    duracao: number;
  };
  createdAt: string;
}

interface LembretePendente extends AgendamentoAgenda {
  mensagemFormatada: string;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda.html',
  styleUrl: './agenda.scss',
})
export class AgendaComponent implements OnInit, OnDestroy {
  user: User | null = null;
  agendamentos: AgendamentoAgenda[] = [];
  carregando = true;
  atualizandoId = '';
  dataSelecionada = '';
  barbeariaFiltro: string = '';

  // Uso mensal
  usoMensal: { usado: number; limite: number; plano: string } | null = null;

  // Lembretes
  lembretes: LembretePendente[] = [];
  lembretesEnviados: Set<string> = new Set();
  private lembreteInterval: any = null;

  private apiUrl = '/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.dataSelecionada = this.getHoje();

    this.authService.user$.subscribe((user) => {
      this.user = user;
      if (user) {
        this.carregarAgendamentos();
        this.carregarUsoMensal();
        this.carregarLembretes();
        this.iniciarPollingLembretes();
      }
    });

    if (this.authService.isLoggedIn() && !this.user) {
      this.authService.loadUser();
    }
  }

  ngOnDestroy() {
    if (this.lembreteInterval) {
      clearInterval(this.lembreteInterval);
    }
  }

  private getHoje(): string {
    return new Date().toISOString().split('T')[0];
  }

  carregarUsoMensal() {
    this.http.get<{ usado: number; limite: number; plano: string }>(`${this.apiUrl}/agendamentos/uso-mensal`).subscribe({
      next: (data) => this.usoMensal = data,
      error: () => {},
    });
  }

  carregarAgendamentos() {
    this.carregando = true;
    const url = `${this.apiUrl}/agendamentos/agenda?data=${this.dataSelecionada}`;
    this.http.get<AgendamentoAgenda[]>(url).subscribe({
      next: (data) => {
        this.agendamentos = data;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      },
    });
  }

  mudarData(offset: number) {
    const d = new Date(this.dataSelecionada + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    this.dataSelecionada = d.toISOString().split('T')[0];
    this.carregarAgendamentos();
  }

  irParaHoje() {
    this.dataSelecionada = this.getHoje();
    this.carregarAgendamentos();
  }

  onDateInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      this.dataSelecionada = value;
      this.carregarAgendamentos();
    }
  }

  get isHoje(): boolean {
    return this.dataSelecionada === this.getHoje();
  }

  get dataFormatada(): string {
    const [y, m, d] = this.dataSelecionada.split('-');
    const date = new Date(+y, +m - 1, +d);
    const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${dias[date.getDay()]}, ${d} de ${meses[date.getMonth()]} de ${y}`;
  }

  get pendentes(): AgendamentoAgenda[] {
    return this.agendamentosFiltrados.filter((a) => a.status === 'PENDENTE');
  }

  get confirmados(): AgendamentoAgenda[] {
    return this.agendamentosFiltrados.filter((a) => a.status === 'CONFIRMADO');
  }

  get concluidos(): AgendamentoAgenda[] {
    return this.agendamentosFiltrados.filter((a) => a.status === 'CONCLUIDO');
  }

  get cancelados(): AgendamentoAgenda[] {
    return this.agendamentosFiltrados.filter((a) => a.status === 'CANCELADO');
  }

  get ativos(): AgendamentoAgenda[] {
    return this.agendamentosFiltrados.filter((a) => a.status !== 'CANCELADO');
  }

  get barbeariasUnicas(): { id: string; nome: string }[] {
    const mapa = new Map<string, string>();
    for (const ag of this.agendamentos) {
      if (ag.barbearia && !mapa.has(ag.barbearia.id)) {
        mapa.set(ag.barbearia.id, ag.barbearia.nome);
      }
    }
    return Array.from(mapa, ([id, nome]) => ({ id, nome }));
  }

  get agendamentosFiltrados(): AgendamentoAgenda[] {
    if (!this.barbeariaFiltro) return this.agendamentos;
    return this.agendamentos.filter((a) => a.barbearia?.id === this.barbeariaFiltro);
  }

  filtrarPorBarbearia(id: string) {
    this.barbeariaFiltro = this.barbeariaFiltro === id ? '' : id;
  }

  getClienteAvatar(ag: AgendamentoAgenda): string {
    if (ag.user?.avatar) {
      if (ag.user.avatar.startsWith('http')) return ag.user.avatar;
      return `${ag.user.avatar}`;
    }
    return '';
  }

  getClienteInicial(ag: AgendamentoAgenda): string {
    const nome = ag.user?.nome || ag.nomeCliente;
    return nome.charAt(0).toUpperCase();
  }

  getClienteNome(ag: AgendamentoAgenda): string {
    return ag.user?.nome || ag.nomeCliente;
  }

  getClienteTelefone(ag: AgendamentoAgenda): string {
    return ag.user?.telefone || ag.telefoneCliente;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDENTE: 'Pendente',
      CONFIRMADO: 'Confirmado',
      CANCELADO: 'Cancelado',
      CONCLUIDO: 'Concluído',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  atualizarStatus(id: string, status: 'CONFIRMADO' | 'CANCELADO' | 'CONCLUIDO') {
    this.atualizandoId = id;
    this.http.put<any>(`${this.apiUrl}/agendamentos/${id}/status`, { status }).subscribe({
      next: () => {
        const ag = this.agendamentos.find((a) => a.id === id);
        if (ag) ag.status = status;
        this.atualizandoId = '';
      },
      error: () => {
        this.atualizandoId = '';
        alert('Erro ao atualizar status.');
      },
    });
  }

  getReceitaDia(): number {
    return this.agendamentosFiltrados
      .filter((a) => a.status === 'CONCLUIDO')
      .reduce((sum, a) => sum + a.servico.preco, 0);
  }

  abrirWhatsApp(telefone: string) {
    const num = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${num}`, '_blank');
  }

  // ==============================
  // Lembretes automáticos
  // ==============================
  private iniciarPollingLembretes() {
    // Verificar a cada 30 segundos
    this.lembreteInterval = setInterval(() => {
      this.carregarLembretes();
    }, 30000);
  }

  carregarLembretes() {
    this.http.get<LembretePendente[]>(`${this.apiUrl}/agendamentos/lembretes/pendentes`).subscribe({
      next: (data) => {
        // Filtrar lembretes que já foram enviados na sessão
        this.lembretes = data.filter((l) => !this.lembretesEnviados.has(l.id));
      },
      error: () => {},
    });
  }

  enviarLembreteWhatsApp(lembrete: LembretePendente) {
    const telefone = lembrete.user?.telefone || lembrete.telefoneCliente;
    const num = telefone.replace(/\D/g, '');
    const mensagem = encodeURIComponent(lembrete.mensagemFormatada);
    window.open(`https://wa.me/55${num}?text=${mensagem}`, '_blank');

    // Marcar como enviado no backend
    this.http.put(`${this.apiUrl}/agendamentos/${lembrete.id}/lembrete-enviado`, {}).subscribe({
      next: () => {},
      error: () => {},
    });

    // Remover da lista local
    this.lembretesEnviados.add(lembrete.id);
    this.lembretes = this.lembretes.filter((l) => l.id !== lembrete.id);
  }

  descartarLembrete(lembrete: LembretePendente) {
    // Marcar como enviado (pra não mostrar de novo)
    this.http.put(`${this.apiUrl}/agendamentos/${lembrete.id}/lembrete-enviado`, {}).subscribe();
    this.lembretesEnviados.add(lembrete.id);
    this.lembretes = this.lembretes.filter((l) => l.id !== lembrete.id);
  }

  getMinutosRestantes(lembrete: LembretePendente): number {
    const agora = new Date();
    const [h, m] = lembrete.horario.split(':').map(Number);
    const horarioDate = new Date();
    horarioDate.setHours(h, m, 0, 0);
    const diff = Math.round((horarioDate.getTime() - agora.getTime()) / 60000);
    return Math.max(0, diff);
  }
}
