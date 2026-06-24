import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService, User } from '../../auth/auth.service';

interface Agendamento {
  id: string;
  data: string;
  horario: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO' | 'CONCLUIDO';
  nomeCliente: string;
  telefoneCliente: string;
  barbearia: {
    id: string;
    nome: string;
    endereco: string;
    telefone: string | null;
    slug: string | null;
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

@Component({
  selector: 'app-meus-agendamentos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './meus-agendamentos.html',
  styleUrl: './meus-agendamentos.scss',
})
export class MeusAgendamentosComponent implements OnInit {
  private readonly LAST_PHONE_STORAGE_KEY = 'barberbook:last-phone';

  user: User | null = null;
  agendamentos: Agendamento[] = [];
  carregando = true;
  cancelando = '';
  modalCancelarAberto = false;
  agendamentoParaCancelar: Agendamento | null = null;
  erroCancelamento = '';

  // Modo convidado (consulta por telefone)
  modoConvidado = false;
  telefoneConvidado = '';
  erroConsultaTelefone = '';
  modalTelefoneAberto = false;

  private apiUrl = '/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    // Verificar se veio por telefone (modo convidado)
    this.route.queryParams.subscribe((params) => {
      if (params['telefone']) {
        this.modoConvidado = true;
        this.telefoneConvidado = params['telefone'];
        this.persistirTelefone(this.telefoneConvidado);
        this.carregarAgendamentosPorTelefone(this.telefoneConvidado);
        return;
      }

      this.telefoneConvidado = this.obterTelefonePersistido();

      // Modo normal (usuário logado)
      this.authService.user$.subscribe((user) => {
        this.user = user;
        if (user && !this.modoConvidado) {
          this.carregarAgendamentos();
        }
      });

      this.authService.loadUser().then((user) => {
        if (!user && !this.modoConvidado) {
          this.modalTelefoneAberto = true;
          this.carregando = false;
        }
      });
    });
  }

  abrirModalTelefone() {
    this.modalTelefoneAberto = true;
  }

  fecharModalTelefone() {
    this.modalTelefoneAberto = false;
    this.erroConsultaTelefone = '';
  }

  usarAgendamentosDaConta() {
    this.modoConvidado = false;
    this.modalTelefoneAberto = false;
    this.erroConsultaTelefone = '';

    if (this.user) {
      this.carregarAgendamentos();
      return;
    }

    this.authService.loadUser();
  }

  onTelefoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const mascarado = this.maskTelefone(input.value);
    this.telefoneConvidado = mascarado;
    input.value = mascarado;
    this.persistirTelefone(mascarado);
  }

  consultarPorTelefoneManual() {
    this.erroConsultaTelefone = '';
    const digits = (this.telefoneConvidado || '').replace(/\D/g, '');
    if (digits.length < 10) {
      this.erroConsultaTelefone = 'Informe um telefone valido.';
      return;
    }

    this.modoConvidado = true;
    this.telefoneConvidado = this.maskTelefone(digits);
    this.persistirTelefone(digits);
    this.carregarAgendamentosPorTelefone(digits);
    this.modalTelefoneAberto = false;
  }

  carregarAgendamentosPorTelefone(telefone: string) {
    this.carregando = true;
    this.http.get<Agendamento[]>(`${this.apiUrl}/agendamentos/consultar?telefone=${telefone}`).subscribe({
      next: (data) => {
        this.agendamentos = data;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      },
    });
  }

  carregarAgendamentos() {
    this.carregando = true;
    this.http.get<Agendamento[]>(`${this.apiUrl}/agendamentos/meus`).subscribe({
      next: (data) => {
        this.agendamentos = data;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      },
    });
  }

  get agendamentosProximos(): Agendamento[] {
    const hoje = new Date().toISOString().split('T')[0];
    return this.agendamentos.filter(
      (a) => a.data >= hoje && a.status !== 'CANCELADO' && a.status !== 'CONCLUIDO',
    );
  }

  get agendamentosPassados(): Agendamento[] {
    const hoje = new Date().toISOString().split('T')[0];
    return this.agendamentos.filter(
      (a) => a.data < hoje || a.status === 'CANCELADO' || a.status === 'CONCLUIDO',
    );
  }

  cancelarAgendamento(id: string) {
    this.cancelando = id;
    this.erroCancelamento = '';

    if (this.modoConvidado) {
      // Cancelar por telefone
      this.http.put<any>(`${this.apiUrl}/agendamentos/${id}/cancelar-telefone`, { telefone: this.telefoneConvidado }).subscribe({
        next: () => {
          const ag = this.agendamentos.find((a) => a.id === id);
          if (ag) ag.status = 'CANCELADO';
          this.cancelando = '';
          this.fecharModalCancelamento();
        },
        error: () => {
          this.cancelando = '';
          this.erroCancelamento = 'Erro ao cancelar agendamento.';
        },
      });
    } else {
      // Cancelar por usuário logado
      this.http.put<any>(`${this.apiUrl}/agendamentos/${id}/cancelar`, {}).subscribe({
        next: () => {
          const ag = this.agendamentos.find((a) => a.id === id);
          if (ag) ag.status = 'CANCELADO';
          this.cancelando = '';
          this.fecharModalCancelamento();
        },
        error: () => {
          this.cancelando = '';
          this.erroCancelamento = 'Erro ao cancelar agendamento.';
        },
      });
    }
  }

  abrirModalCancelamento(ag: Agendamento) {
    if (this.cancelando) return;
    this.agendamentoParaCancelar = ag;
    this.erroCancelamento = '';
    this.modalCancelarAberto = true;
  }

  fecharModalCancelamento() {
    if (this.cancelando) return;
    this.modalCancelarAberto = false;
    this.agendamentoParaCancelar = null;
    this.erroCancelamento = '';
  }

  getDataFormatada(data: string): string {
    const [y, m, d] = data.split('-');
    return `${d}/${m}/${y}`;
  }

  getDiaSemana(data: string): string {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const d = new Date(data + 'T12:00:00');
    return dias[d.getDay()];
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDENTE: 'Pendente',
      CONFIRMADO: 'Confirmado',
      CANCELADO: 'Cancelado',
      CONCLUIDO: 'Concluído',
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getBarbeiroFoto(foto: string | null): string {
    if (!foto) return '';
    if (foto.startsWith('http')) return foto;
    return `${foto}`;
  }

  isHoje(data: string): boolean {
    return data === new Date().toISOString().split('T')[0];
  }

  podeCancel(ag: Agendamento): boolean {
    return ag.status === 'PENDENTE' || ag.status === 'CONFIRMADO';
  }

  voltarConsulta() {
    this.router.navigate(['/']);
  }

  private persistirTelefone(value: string) {
    if (typeof localStorage === 'undefined') return;

    const digits = (value || '').replace(/\D/g, '');
    if (digits.length >= 10) {
      localStorage.setItem(this.LAST_PHONE_STORAGE_KEY, digits);
    }
  }

  private obterTelefonePersistido(): string {
    if (typeof localStorage === 'undefined') return '';
    const saved = localStorage.getItem(this.LAST_PHONE_STORAGE_KEY) || '';
    return this.maskTelefone(saved);
  }

  private maskTelefone(value: string): string {
    const raw = (value || '').replace(/\D/g, '').slice(0, 11);

    if (raw.length > 6) {
      return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    if (raw.length > 2) {
      return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 0) {
      return `(${raw}`;
    }
    return '';
  }
}
