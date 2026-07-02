import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

type TipoConta = 'TODOS' | 'CLIENTE' | 'BARBEIRO';
type Plano = 'BASICO' | 'PROFISSIONAL' | 'PREMIUM';

interface Conta {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  tipo: 'CLIENTE' | 'BARBEIRO' | 'ADMIN';
  plano: Plano;
  createdAt: string;
}

@Component({
  selector: 'app-admin-dev',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dev.html',
  styleUrl: './admin-dev.scss',
})
export class AdminDevComponent implements OnInit {
  username = '';
  password = '';

  filtroTipo: TipoConta = 'TODOS';
  contas: Conta[] = [];
  planosEdicao: Record<string, Plano> = {};

  carregando = false;
  carregandoContas = false;
  salvandoPlanoId = '';

  erro = '';
  sucesso = '';

  private readonly apiUrl = this.resolveApiUrl();
  private readonly tokenKey = 'dev_admin_token';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Evita request protegido automatico ao abrir a tela.
    // Isso previne 401 visual quando existir token antigo/sessao expirada.
    if (this.getToken()) {
      this.logout();
    }
  }

  private resolveApiUrl(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '/api/admin-dev';
      }
    }

    return 'https://barberbook-awgp.onrender.com/api/admin-dev';
  }

  get logado(): boolean {
    return !!this.getToken();
  }

  login() {
    this.erro = '';
    this.sucesso = '';
    this.carregando = true;

    this.http
      .post<{ accessToken: string }>(`${this.apiUrl}/login`, {
        username: this.username,
        password: this.password,
      })
      .subscribe({
        next: (res) => {
          this.carregando = false;
          localStorage.setItem(this.tokenKey, res.accessToken);
          this.password = '';
          this.carregarContas();
        },
        error: (err) => {
          this.carregando = false;
          this.erro = err.error?.message || 'Nao foi possivel fazer login do admin dev.';
        },
      });
  }

  logout(limparMensagens: boolean = true) {
    localStorage.removeItem(this.tokenKey);
    this.contas = [];
    this.planosEdicao = {};
    if (limparMensagens) {
      this.erro = '';
      this.sucesso = '';
    }
  }

  carregarContas(silentAuthError: boolean = false) {
    this.erro = '';
    this.sucesso = '';
    this.carregandoContas = true;

    this.http
      .get<{ contas: Conta[] }>(`${this.apiUrl}/contas?tipo=${this.filtroTipo}`, {
        headers: this.authHeaders(),
      })
      .subscribe({
        next: (res) => {
          this.carregandoContas = false;
          this.contas = res.contas || [];
          const mapa: Record<string, Plano> = {};
          for (const conta of this.contas) {
            mapa[conta.id] = conta.plano;
          }
          this.planosEdicao = mapa;
        },
        error: (err) => {
          this.carregandoContas = false;
          if (!silentAuthError) {
            this.erro = err.error?.message || 'Erro ao carregar contas.';
          }
          if (err.status === 401) {
            if (!silentAuthError) {
              this.erro = 'Sessao do admin expirada ou token invalido. Faca login novamente.';
            }
            this.logout(false);
          }
        },
      });
  }

  atualizarPlano(conta: Conta) {
    if (conta.tipo !== 'BARBEIRO') return;

    const plano = this.planosEdicao[conta.id];
    if (!plano || plano === conta.plano) return;

    this.erro = '';
    this.sucesso = '';
    this.salvandoPlanoId = conta.id;

    this.http
      .patch<{ message: string; conta: Conta }>(
        `${this.apiUrl}/barbeiros/${conta.id}/plano`,
        { plano },
        { headers: this.authHeaders() },
      )
      .subscribe({
        next: (res) => {
          this.salvandoPlanoId = '';
          conta.plano = res.conta.plano;
          this.planosEdicao[conta.id] = res.conta.plano;
          this.sucesso = res.message || 'Plano atualizado com sucesso.';
        },
        error: (err) => {
          this.salvandoPlanoId = '';
          this.erro = err.error?.message || 'Erro ao atualizar plano.';
          if (err.status === 401) {
            this.erro = 'Sessao do admin expirada ou token invalido. Faca login novamente.';
            this.logout(false);
          }
        },
      });
  }

  private authHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  private getToken(): string {
    return localStorage.getItem(this.tokenKey) || '';
  }
}
