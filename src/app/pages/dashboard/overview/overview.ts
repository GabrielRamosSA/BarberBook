import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService, User } from '../../../auth/auth.service';

interface Barbearia {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  ativa: boolean;
}

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class DashboardOverviewComponent implements OnInit {
  user: User | null = null;
  barbearias: Barbearia[] = [];
  carregando = true;

  agendamentosHoje = 0;
  totalClientes = 0;

  private apiUrl = '/api';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      this.user = user;
    });

    this.carregarBarbearias();
    this.carregarAgendamentosHoje();
    this.carregarClientes();
  }

  carregarBarbearias() {
    this.carregando = true;
    this.http.get<Barbearia[]>(`${this.apiUrl}/barbearias/owner/me`).subscribe({
      next: (data) => {
        this.barbearias = data;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      },
    });
  }

  carregarAgendamentosHoje() {
    const hoje = new Date().toISOString().split('T')[0];
    this.http.get<any[]>(`${this.apiUrl}/agendamentos/agenda?data=${hoje}`).subscribe({
      next: (data) => {
        this.agendamentosHoje = data.filter(a => a.status !== 'CANCELADO').length;
      },
      error: () => {},
    });
  }

  carregarClientes() {
    this.http.get<any[]>(`${this.apiUrl}/agendamentos/clientes`).subscribe({
      next: (data) => {
        this.totalClientes = data.length;
      },
      error: () => {},
    });
  }

  get barbeariaAtivas(): number {
    return this.barbearias.filter((b) => b.ativa).length;
  }
}
