import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, RouterLink],
  templateUrl: './meus-agendamentos.html',
  styleUrl: './meus-agendamentos.scss',
})
export class MeusAgendamentosComponent implements OnInit {
  user: User | null = null;
  agendamentos: Agendamento[] = [];
  carregando = true;
  cancelando = '';

  // Modo convidado (consulta por telefone)
  modoConvidado = false;
  telefoneConvidado = '';

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
        this.carregarAgendamentosPorTelefone(this.telefoneConvidado);
        return;
      }

      // Modo normal (usuário logado)
      this.authService.user$.subscribe((user) => {
        this.user = user;
        if (user) {
          this.carregarAgendamentos();
        }
      });

      if (this.authService.isLoggedIn() && !this.user) {
        this.authService.loadUser();
      }

      if (!this.authService.isLoggedIn()) {
        this.carregando = false;
      }
    });
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
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    this.cancelando = id;

    if (this.modoConvidado) {
      // Cancelar por telefone
      this.http.put<any>(`${this.apiUrl}/agendamentos/${id}/cancelar-telefone`, { telefone: this.telefoneConvidado }).subscribe({
        next: () => {
          const ag = this.agendamentos.find((a) => a.id === id);
          if (ag) ag.status = 'CANCELADO';
          this.cancelando = '';
        },
        error: () => {
          this.cancelando = '';
          alert('Erro ao cancelar agendamento.');
        },
      });
    } else {
      // Cancelar por usuário logado
      this.http.put<any>(`${this.apiUrl}/agendamentos/${id}/cancelar`, {}).subscribe({
        next: () => {
          const ag = this.agendamentos.find((a) => a.id === id);
          if (ag) ag.status = 'CANCELADO';
          this.cancelando = '';
        },
        error: () => {
          this.cancelando = '';
          alert('Erro ao cancelar agendamento.');
        },
      });
    }
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
}
