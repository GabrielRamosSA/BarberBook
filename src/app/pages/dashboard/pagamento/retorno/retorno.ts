import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-retorno-pagamento',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="retorno-page">
      <div class="retorno-card">
        @if (carregando) {
          <div class="retorno-icon loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
          </div>
          <h2>Verificando pagamento...</h2>
          <p>Aguarde enquanto confirmamos sua assinatura.</p>
        } @else if (status === 'sucesso') {
          <div class="retorno-icon sucesso">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <h2>Assinatura realizada!</h2>
          <p>Seu plano foi ativado com sucesso. Aproveite todos os recursos!</p>
          <button class="btn-ir" (click)="irParaPlanos()">
            <i class="fa-solid fa-arrow-right"></i> Ir para Meus Planos
          </button>
        } @else if (status === 'pendente') {
          <div class="retorno-icon pendente">
            <i class="fa-solid fa-clock"></i>
          </div>
          <h2>Pagamento pendente</h2>
          <p>Estamos aguardando a confirmação do seu pagamento. Você será notificado assim que for aprovado.</p>
          <button class="btn-ir" (click)="irParaPlanos()">
            <i class="fa-solid fa-arrow-right"></i> Ir para Meus Planos
          </button>
        } @else {
          <div class="retorno-icon erro">
            <i class="fa-solid fa-circle-xmark"></i>
          </div>
          <h2>Algo deu errado</h2>
          <p>Não foi possível confirmar sua assinatura. Tente novamente.</p>
          <button class="btn-ir" (click)="irParaPlanos()">
            <i class="fa-solid fa-arrow-left"></i> Voltar para Planos
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .retorno-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: 24px;
    }

    .retorno-card {
      text-align: center;
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 20px;
      padding: 48px 40px;
      max-width: 440px;
      width: 100%;
    }

    .retorno-icon {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 2rem;

      &.loading {
        background: #f0f0f0;
        color: #071522;
      }
      &.sucesso {
        background: #d4edda;
        color: #28a745;
      }
      &.pendente {
        background: #fff3cd;
        color: #f59e0b;
      }
      &.erro {
        background: #f8d7da;
        color: #dc3545;
      }
    }

    h2 {
      font-size: 1.3rem;
      font-weight: 700;
      color: #071522;
      margin: 0 0 8px 0;
    }

    p {
      font-size: 0.9rem;
      color: #6c757d;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }

    .btn-ir {
      padding: 12px 28px;
      border: none;
      border-radius: 12px;
      background: #071522;
      color: #fff;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;

      &:hover {
        background: #0d2235;
        transform: translateY(-1px);
      }
    }
  `],
})
export class RetornoPagamentoComponent implements OnInit {
  carregando = true;
  status: 'sucesso' | 'pendente' | 'erro' = 'pendente';

  private apiUrl = '/api';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    // Consultar status da assinatura
    this.http.get<any>(`${this.apiUrl}/pagamento/status`).subscribe({
      next: (res) => {
        this.carregando = false;
        if (res.subscriptionStatus === 'authorized') {
          this.status = 'sucesso';
        } else if (res.subscriptionStatus === 'pending') {
          this.status = 'pendente';
        } else {
          this.status = 'erro';
        }
      },
      error: () => {
        this.carregando = false;
        this.status = 'pendente';
      },
    });
  }

  irParaPlanos() {
    this.router.navigate(['/dashboard/planos']);
  }
}
