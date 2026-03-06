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

  // Email check
  emailErro = '';
  verificandoEmail = false;
  emailValido = false;
  private emailCheck$ = new Subject<string>();

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

  private apiUrl = '/api/auth';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
  ) {
    // Debounce email check
    this.emailCheck$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap((email) => {
          this.verificandoEmail = true;
          return this.http.get<{ exists: boolean; valid: boolean; reason: string | null }>(
            `${this.apiUrl}/check-email?email=${encodeURIComponent(email)}`,
          );
        }),
      )
      .subscribe({
        next: (res) => {
          this.verificandoEmail = false;
          if (!res.valid) {
            this.emailErro = res.reason || 'Este domínio de e-mail não existe.';
            this.emailValido = false;
          } else if (res.exists) {
            this.emailErro = res.reason || 'Este e-mail já está cadastrado.';
            this.emailValido = false;
          } else {
            this.emailErro = '';
            this.emailValido = true;
          }
        },
        error: () => {
          this.verificandoEmail = false;
          this.emailErro = '';
        },
      });
  }

  onEmailChange() {
    this.emailValido = false;
    this.emailErro = '';

    if (!this.email || !this.isEmailFormat(this.email)) {
      return;
    }

    this.emailCheck$.next(this.email);
  }

  private isEmailFormat(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  onSenhaChange() {
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

  onSubmit() {
    this.erro = '';

    if (!this.formValido) return;

    this.carregando = true;

    this.authService
      .register({
        nome: this.nome,
        email: this.email,
        senha: this.senha,
        telefone: this.telefone || undefined,
        tipo: this.tipo,
      })
      .subscribe({
        next: (res) => {
          this.carregando = false;
          if (res.requiresVerification) {
            // Redireciona para a página de verificação
            this.router.navigate(['/verificar-email'], {
              queryParams: { email: res.email || this.email },
            });
          } else {
            this.router.navigate(['/perfil']);
          }
        },
        error: (err) => {
          this.carregando = false;
          this.erro = err.error?.message || 'Erro ao criar conta. Tente novamente.';
        },
      });
  }

  loginComGoogle() {
    this.authService.loginWithGoogle();
  }
}
