import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../auth/auth.service';

declare var MercadoPago: any;

@Component({
  selector: 'app-pagamento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagamento.html',
  styleUrl: './pagamento.scss',
})
export class PagamentoComponent implements OnInit {
    tipoPagamento: string = 'credit_card';
  planoSelecionado: string = '';
  planoPreco: string = '';
  planoDescricao: string = '';
  planoRecursos: string[] = [];

  // Campos do cartão
  numeroCartaoDisplay: string = '';
  nomeCartao: string = '';
  validadeCartao: string = '';
  cvcCartao: string = '';
  cpfDisplay: string = '';

  // Estado
  processando = false;
  toast: { mensagem: string; tipo: 'sucesso' | 'erro' } | null = null;
  private toastTimer: any;
  private mp: any;

  private apiUrl = '/api';

  private planos: Record<string, { preco: string; valor: number; descricao: string; recursos: string[] }> = {
    PROFISSIONAL: {
      preco: 'R$ 29,90',
      valor: 29.9,
      descricao: 'Para barbeiros estabelecidos',
      recursos: ['3 barbearias', '5 barbeiros', '10 serviços', 'Agendamentos ilimitados', 'Gestão de clientes', 'Lembrete WhatsApp'],
    },
    PREMIUM: {
      preco: 'R$ 59,90',
      valor: 59.9,
      descricao: 'Tudo ilimitado para seu negócio',
      recursos: ['Barbearias ilimitadas', 'Barbeiros ilimitados', 'Serviços ilimitados', 'Agendamentos ilimitados', 'Relatórios de receita', 'Lembrete WhatsApp'],
    },
  };

  // Bandeiras de cartão
  bandeira: { nome: string; icone: string; cor: string } | null = null;
  private bandeiras: Record<string, { nome: string; icone: string; cor: string }> = {
    '4': { nome: 'Visa', icone: 'fa-brands fa-cc-visa', cor: '#1a1f71' },
    '5': { nome: 'Mastercard', icone: 'fa-brands fa-cc-mastercard', cor: '#eb001b' },
    '3': { nome: 'Amex', icone: 'fa-brands fa-cc-amex', cor: '#006fcf' },
    '6': { nome: 'Elo', icone: 'fa-solid fa-credit-card', cor: '#000' },
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const plano = params['plano'];
      if (!plano || !this.planos[plano]) {
        this.router.navigate(['/dashboard/planos']);
        return;
      }
      this.planoSelecionado = plano;
      this.planoPreco = this.planos[plano].preco;
      this.planoDescricao = this.planos[plano].descricao;
      this.planoRecursos = this.planos[plano].recursos;
    });

    // Inicializar MercadoPago.js com Public Key de produção
    if (typeof MercadoPago !== 'undefined') {
      this.mp = new MercadoPago('APP_USR-2bf6269e-bea5-447a-a5ff-30f1482ff095');
    }
  }

  get formularioValido(): boolean {
    const numero = this.numeroCartaoDisplay.replace(/\s/g, '');
    const cpf = this.cpfDisplay.replace(/\D/g, '');
    const [mes, ano] = this.validadeCartao.split('/');
    return (
      numero.length >= 13 &&
      this.nomeCartao.trim().length >= 3 &&
      mes?.length === 2 && ano?.length === 2 &&
      this.cvcCartao.length >= 3 &&
      cpf.length === 11
    );
  }

  onNumeroInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    this.numeroCartaoDisplay = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = this.numeroCartaoDisplay;

    // Detectar bandeira
    const primeiro = value.charAt(0);
    this.bandeira = this.bandeiras[primeiro] || null;
  }

  onValidadeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    this.validadeCartao = value;
    input.value = value;
  }

  onCvcInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    this.cvcCartao = value;
    input.value = value;
  }

  onCpfInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    // Máscara CPF
    if (value.length > 9) {
      this.cpfDisplay = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      this.cpfDisplay = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      this.cpfDisplay = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    } else {
      this.cpfDisplay = value;
    }
    input.value = this.cpfDisplay;
  }

  async processarPagamento() {
    if (this.processando || !this.formularioValido) return;
    this.processando = true;

    try {
      const [mes, ano] = this.validadeCartao.split('/');
      const numero = this.numeroCartaoDisplay.replace(/\s/g, '');
      const cpf = this.cpfDisplay.replace(/\D/g, '');

      // Criar token do cartão via MercadoPago.js
      const tokenData: any = {
        cardNumber: numero,
        cardholderName: this.nomeCartao,
        cardExpirationMonth: mes,
        cardExpirationYear: '20' + ano,
        securityCode: this.cvcCartao,
        identificationType: 'CPF',
        identificationNumber: cpf,
      };
      if (this.tipoPagamento === 'debit_card') {
        tokenData.payment_method_id = 'debit_card';
      }
      const tokenResponse = await this.mp.createCardToken(tokenData);

      console.log('Token response:', tokenResponse);

      if (!tokenResponse?.id) {
        console.error('Token inválido:', tokenResponse);
        this.mostrarToast('Erro ao processar cartão. Verifique os dados.', 'erro');
        this.processando = false;
        return;
      }

      const user = this.authService.currentUser;

      // Enviar token para o backend criar a assinatura
      this.http.post<any>(`${this.apiUrl}/pagamento/assinar`, {
        plano: this.planoSelecionado,
        email: user?.email || '',
        card_token_id: tokenResponse.id,
        tipo_pagamento: this.tipoPagamento,
      }).subscribe({
        next: (res) => {
          if (res.status === 'authorized' || res.status === 'pending') {
            this.mostrarToast('Assinatura realizada com sucesso!', 'sucesso');
            setTimeout(() => {
              this.router.navigate(['/dashboard/planos']);
            }, 2000);
          } else {
            this.processando = false;
            this.mostrarToast(res.message || 'Erro ao criar assinatura.', 'erro');
          }
        },
        error: (err) => {
          this.processando = false;
          this.mostrarToast(err.error?.message || 'Erro ao criar assinatura.', 'erro');
        },
      });
    } catch (error: any) {
      console.error('Erro createCardToken:', error);
      this.processando = false;
      const msg = error?.message || error?.cause?.[0]?.description || 'Erro ao processar cartão. Verifique os dados.';
      this.mostrarToast(msg, 'erro');
    }
  }

  voltar() {
    this.router.navigate(['/dashboard/planos']);
  }

  mostrarToast(mensagem: string, tipo: 'sucesso' | 'erro') {
    this.toast = { mensagem, tipo };
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = null;
    }, 4000);
  }
}
