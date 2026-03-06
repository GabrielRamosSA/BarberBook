import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../auth/auth.service';

interface ClienteAgendamento {
  id: string;
  data: string;
  horario: string;
  status: string;
  servico: { id: string; nome: string; preco: number; duracao: number };
  barbeiro: { id: string; nome: string };
  barbearia: { id: string; nome: string };
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  avatar: string | null;
  cadastrado: boolean;
  totalAgendamentos: number;
  totalConcluidos: number;
  totalCancelados: number;
  totalGasto: number;
  ultimoAgendamento: { data: string; horario: string; status: string } | null;
  primeiroAgendamento: { data: string; horario: string } | null;
  servicos: string[];
  agendamentos: ClienteAgendamento[];
}

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
})
export class ClientesComponent implements OnInit {
  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];

  termoBusca = '';
  filtroAtivo = 'todos';
  ordenacao = 'recente';
  carregando = true;

  clienteExpandido: string | null = null;
  mostrarTodos: Record<string, boolean> = {};

  private apiUrl = '/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  get receitaPermitida(): boolean {
    return this.authService.currentUser?.plano === 'PREMIUM';
  }

  ngOnInit() {
    this.carregarClientes();
  }

  carregarClientes() {
    this.carregando = true;
    this.http.get<Cliente[]>(`${this.apiUrl}/agendamentos/clientes`).subscribe({
      next: (data) => {
        this.clientes = data;
        this.filtrar();
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      },
    });
  }

  get clientesCadastrados(): number {
    return this.clientes.filter((c) => c.cadastrado).length;
  }

  get totalAtendimentos(): number {
    return this.clientes.reduce((sum, c) => sum + c.totalConcluidos, 0);
  }

  get receitaTotal(): number {
    return this.clientes.reduce((sum, c) => sum + c.totalGasto, 0);
  }

  filtrar() {
    let lista = [...this.clientes];

    // Filtro por tipo
    if (this.filtroAtivo === 'cadastrados') {
      lista = lista.filter((c) => c.cadastrado);
    } else if (this.filtroAtivo === 'avulsos') {
      lista = lista.filter((c) => !c.cadastrado);
    } else if (this.filtroAtivo === 'frequentes') {
      lista = lista.filter((c) => c.totalConcluidos >= 5);
    }

    // Busca
    if (this.termoBusca.trim()) {
      const termo = this.termoBusca.toLowerCase();
      lista = lista.filter(
        (c) =>
          c.nome.toLowerCase().includes(termo) ||
          c.telefone?.includes(termo) ||
          c.email?.toLowerCase().includes(termo)
      );
    }

    // Ordenação
    switch (this.ordenacao) {
      case 'nome':
        lista.sort((a, b) => a.nome.localeCompare(b.nome));
        break;
      case 'agendamentos':
        lista.sort((a, b) => b.totalAgendamentos - a.totalAgendamentos);
        break;
      case 'gasto':
        lista.sort((a, b) => b.totalGasto - a.totalGasto);
        break;
      case 'recente':
      default:
        lista.sort((a, b) => {
          const dataA = a.ultimoAgendamento ? new Date(a.ultimoAgendamento.data).getTime() : 0;
          const dataB = b.ultimoAgendamento ? new Date(b.ultimoAgendamento.data).getTime() : 0;
          return dataB - dataA;
        });
        break;
    }

    this.clientesFiltrados = lista;
  }

  setFiltro(filtro: string) {
    this.filtroAtivo = filtro;
    this.filtrar();
  }

  toggleCliente(id: string) {
    this.clienteExpandido = this.clienteExpandido === id ? null : id;
  }

  toggleMostrarTodos(id: string) {
    this.mostrarTodos[id] = !this.mostrarTodos[id];
  }

  getAvatarUrl(avatar: string): string {
    if (avatar.startsWith('http')) return avatar;
    return `${avatar}`;
  }

  getInicial(nome: string): string {
    return nome?.charAt(0)?.toUpperCase() || '?';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDENTE: 'Pendente',
      CONFIRMADO: 'Confirmado',
      CONCLUIDO: 'Concluído',
      CANCELADO: 'Cancelado',
    };
    return labels[status] || status;
  }

  formatarData(data: string): string {
    const d = new Date(data + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  abrirWhatsApp(telefone: string) {
    if (!telefone) return;
    const numero = telefone.replace(/\D/g, '');
    const num = numero.startsWith('55') ? numero : '55' + numero;
    window.open(`https://wa.me/${num}`, '_blank');
  }
}
