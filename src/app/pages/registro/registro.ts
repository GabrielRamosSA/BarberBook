import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class RegistroComponent {
  nome = '';
  email = '';
  senha = '';
  confirmarSenha = '';
  telefone = '';
  tipo: 'CLIENTE' | 'BARBEIRO' = 'CLIENTE';
  erro = '';
  carregando = false;

  // Verificacao de e-mail
  erroEmail = '';
  verificandoEmail = false;
  emailValido = false;
  private checagemEmail$ = new Subject<string>();

  // Password strength
  senhaForca = 0; // 0-4
  senhaForcaLabel = '';
  senhaRequisitos = {
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  };

  private readonly urlApi = this.resolveApiUrl();

  constructor(
    private servicoAuth: AuthService,
    private clienteHttp: HttpClient,
    private roteador: Router,
  ) {
    // Debounce da checagem de e-mail
    this.checagemEmail$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((email) => {
          this.verificandoEmail = true;
          return this.clienteHttp.get<{ exists: boolean; valid: boolean; reason: string | null }>(
            `${this.urlApi}/check-email?email=${encodeURIComponent(email)}`,
          );
        }),
      )
      .subscribe({
        next: (resposta) => {
          this.verificandoEmail = false;
          if (!resposta.valid) {
            this.erroEmail = resposta.reason || 'Este domínio de e-mail não existe.';
            this.emailValido = false;
          } else if (resposta.exists) {
            this.erroEmail = resposta.reason || 'Este e-mail já está cadastrado.';
            this.emailValido = false;
          } else {
            this.erroEmail = '';
            this.emailValido = true;
          }
        },
        error: () => {
          this.verificandoEmail = false;
          this.erroEmail = '';
        },
      });
  }

  private resolveApiUrl(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '/api/auth';
      }
    }

    return 'https://barberbook-awgp.onrender.com/api/auth';
  }

  aoAlterarEmail() {
    this.emailValido = false;
    this.erroEmail = '';

    if (!this.email || !this.emailFormatoValido(this.email)) {
      return;
    }

    this.checagemEmail$.next(this.email);
  }

  private emailFormatoValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  aoAlterarSenha() {
    const s = this.senha;

    this.senhaRequisitos = {
      minLength: s.length >= 6,
      uppercase: /[A-Z]/.test(s),
      lowercase: /[a-z]/.test(s),
      number: /[0-9]/.test(s),
      special: /[^A-Za-z0-9]/.test(s),
    };

    const fulfilled = Object.values(this.senhaRequisitos).filter(Boolean).length;
    this.senhaForca = fulfilled;

    const labels = ['', 'Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];
    this.senhaForcaLabel = s.length > 0 ? labels[fulfilled] : '';
  }

  get senhaValida(): boolean {
    return Object.values(this.senhaRequisitos).every(Boolean);
  }

  get formValido(): boolean {
    return (
      this.nome.trim().length > 0 &&
      this.emailValido &&
      this.senhaValida &&
      this.senha === this.confirmarSenha &&
      this.confirmarSenha.length > 0
    );
  }

  aoEnviar() {
    this.erro = '';

    if (!this.formValido) return;

    this.carregando = true;

    this.servicoAuth
      .register({
        nome: this.nome,
        email: this.email,
        senha: this.senha,
        telefone: this.telefone || undefined,
        tipo: this.tipo,
      })
      .subscribe({
        next: (resposta) => {
          this.carregando = false;
          if (resposta.requiresVerification) {
            // Redireciona para a página de verificação
            this.roteador.navigate(['/verificar-email'], {
              queryParams: { email: resposta.email || this.email },
            });
          } else {
            this.roteador.navigate(['/perfil']);
          }
        },
        error: (erroResposta) => {
          this.carregando = false;
          this.erro = erroResposta.error?.message || 'Erro ao criar conta. Tente novamente.';
        },
      });
  }

  entrarComGoogle() {
    this.servicoAuth.loginWithGoogle();
  }
}
