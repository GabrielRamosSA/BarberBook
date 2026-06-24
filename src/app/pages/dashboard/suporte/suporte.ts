import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-suporte',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './suporte.html',
  styleUrl: './suporte.scss',
})
export class SuporteComponent implements OnInit {
  plano = 'BASICO';
  canal = 'HUMANO_EMAIL';
  fallbackEmail = '';

  assuntoFallback = '';
  mensagemFallback = '';
  enviandoFallback = false;

  toast: { mensagem: string; tipo: 'sucesso' | 'erro' } | null = null;
  private toastTimer: any;

  private apiUrl = '/api/suporte';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.carregarStatus();
  }

  carregarStatus() {
    this.http.get<any>(`${this.apiUrl}/status`).subscribe({
      next: (data) => {
        this.plano = data.plano || 'BASICO';
        this.canal = data.canal || 'HUMANO_EMAIL';
        this.fallbackEmail = data.fallbackEmail || '';
      },
      error: () => {
        this.mostrarToast('Nao foi possivel carregar status do suporte.', 'erro');
      },
    });
  }

  enviarFallbackEmail() {
    if (this.enviandoFallback) return;

    const assunto = this.assuntoFallback.trim();
    const mensagem = this.mensagemFallback.trim();

    if (!assunto || !mensagem) {
      this.mostrarToast('Preencha assunto e mensagem para contato por e-mail.', 'erro');
      return;
    }

    this.enviandoFallback = true;
    this.http.post<any>(`${this.apiUrl}/fallback-email`, { assunto, mensagem }).subscribe({
      next: (res) => {
        this.enviandoFallback = false;
        this.assuntoFallback = '';
        this.mensagemFallback = '';
        this.mostrarToast(res?.message || 'Mensagem enviada para o suporte humano.', 'sucesso');
      },
      error: (err) => {
        this.enviandoFallback = false;
        this.mostrarToast(err.error?.message || 'Nao foi possivel enviar e-mail ao suporte humano.', 'erro');
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
