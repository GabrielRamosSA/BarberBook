import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../auth/auth.service';

@Component({
  selector: 'app-planos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './planos.html',
  styleUrl: './planos.scss',
})
export class PlanosComponent implements OnInit {
  planoAtual: string = '';
  atualizando = false;
  user: User | null = null;
  cancelando = false;
  assinaturaAtiva = false;
  subscriptionStatus: string | null = null;
  planoExpiraEm: string | null = null;
  private planoExpiraEmDate: Date | null = null;

  toast: { mensagem: string; tipo: 'sucesso' | 'erro' } | null = null;
  private toastTimer: any;

  private apiUrl = '/api';
  private planosOrdem = ['BASICO', 'PROFISSIONAL', 'PREMIUM'];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
      this.planoAtual = user?.plano || 'BASICO';
    });

    // Buscar plano atualizado do servidor
    this.http.get<any>(`${this.apiUrl}/user/plano/limites`).subscribe({
      next: (data) => {
        this.planoAtual = data.plano;
      },
      error: () => {},
    });

    // Buscar status da assinatura
    this.carregarStatusAssinatura();
  }

  carregarStatusAssinatura() {
    this.http.get<any>(`${this.apiUrl}/pagamento/status`).subscribe({
      next: (data) => {
        this.assinaturaAtiva = data.assinaturaAtiva;
        this.subscriptionStatus = data.subscriptionStatus;
        this.atualizarPlanoExpiraEm(data.planoExpiraEm);

        if (this.subscriptionStatus === 'cancelled' && !this.cancelamentoAindaAtivo) {
          this.subscriptionStatus = null;
        }
      },
      error: () => {},
    });
  }

  get cancelamentoAindaAtivo(): boolean {
    if (this.subscriptionStatus !== 'cancelled' || !this.planoExpiraEmDate) {
      return false;
    }
    return this.planoExpiraEmDate.getTime() > Date.now();
  }

  private atualizarPlanoExpiraEm(valor: unknown) {
    const data = valor ? new Date(valor as string) : null;
    const dataValida = data && !Number.isNaN(data.getTime()) ? data : null;

    if (!dataValida || dataValida.getTime() <= Date.now()) {
      this.planoExpiraEmDate = null;
      this.planoExpiraEm = null;
      return;
    }

    this.planoExpiraEmDate = dataValida;
    this.planoExpiraEm = dataValida.toLocaleDateString('pt-BR');
  }

  isUpgrade(plano: string): boolean {
    const atualIdx = this.planosOrdem.indexOf(this.planoAtual);
    const novoIdx = this.planosOrdem.indexOf(plano);
    return novoIdx > atualIdx;
  }

  selecionarPlano(plano: string) {
    if (plano === this.planoAtual || this.atualizando) return;

    // Se a recorrência foi cancelada, o plano pago continua até a data de expiração.
    if (plano === 'BASICO' && this.cancelamentoAindaAtivo && this.planoExpiraEm) {
      this.mostrarToast(`Seu plano atual permanece ativo até ${this.planoExpiraEm}.`, 'erro');
      return;
    }

    // Se tem assinatura ativa e quer trocar de plano pago, precisa cancelar primeiro
    if (this.assinaturaAtiva && plano !== 'BASICO') {
      this.mostrarToast('Cancele sua assinatura atual antes de trocar de plano.', 'erro');
      return;
    }

    // Planos pagos vão para a tela de pagamento
    if (plano !== 'BASICO') {
      this.router.navigate(['/dashboard/planos/pagamento'], { queryParams: { plano } });
      return;
    }

    // Downgrade para BASICO: se tem assinatura, cancela primeiro
    if (this.assinaturaAtiva) {
      this.cancelarAssinatura();
      return;
    }

    // Downgrade direto
    this.atualizando = true;
    this.http.put<any>(`${this.apiUrl}/user/plano`, { plano }).subscribe({
      next: (res) => {
        this.planoAtual = plano;
        this.atualizando = false;
        if (this.user) {
          const updatedUser = { ...this.user, plano: plano as any };
          this.authService.updateUserState(updatedUser);
        }
        this.mostrarToast(`Plano atualizado para ${plano} com sucesso!`, 'sucesso');
      },
      error: (err) => {
        this.atualizando = false;
        this.mostrarToast(err.error?.message || 'Erro ao atualizar plano.', 'erro');
      },
    });
  }

  cancelarAssinatura() {
    if (this.cancelando) return;
    this.cancelando = true;

    this.http.post<any>(`${this.apiUrl}/pagamento/cancelar`, {}).subscribe({
      next: (res) => {
        this.cancelando = false;
        this.assinaturaAtiva = false;
        this.subscriptionStatus = 'cancelled';
        this.atualizarPlanoExpiraEm(res?.planoExpiraEm || null);
        if (res?.planoAtual) {
          this.planoAtual = res.planoAtual;
        }
        this.mostrarToast(res.message, 'sucesso');
        this.carregarStatusAssinatura();
      },
      error: (err) => {
        this.cancelando = false;
        this.mostrarToast(err.error?.message || 'Erro ao cancelar assinatura.', 'erro');
      },
    });
  }

  mostrarToast(mensagem: string, tipo: 'sucesso' | 'erro') {
    this.toast = { mensagem, tipo };
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = null;
    }, 4000);
  }
}
