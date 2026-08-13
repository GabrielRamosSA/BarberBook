import { Component, DestroyRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, finalize, map, of, switchMap, timer } from 'rxjs';
import { AuthResponse, AuthService, EmailCheckResponse } from '../../auth/auth.service';
import { getAuthRequestErrorMessage } from '../../auth/auth-request-error';

type EmailCheckResult =
  | { email: string; resposta: EmailCheckResponse }
  | { email: string; erro: unknown }
  | null;

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

  // Verificação de e-mail
  erroEmail = '';
  verificandoEmail = false;
  emailValido = false;
  telefoneValido = false;
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

  constructor(
    private servicoAuth: AuthService,
    private roteador: Router,
    private zonaNg: NgZone,
    private destroyRef: DestroyRef,
  ) {
    // A troca do valor cancela imediatamente a checagem anterior. Só o valor que
    // permaneceu por 500 ms é enviado, impedindo respostas antigas de alterar o form.
    this.checagemEmail$
      .pipe(
        switchMap((email) => {
          if (!this.emailFormatoValido(email)) {
            return of<EmailCheckResult>(null);
          }

          return timer(500).pipe(
            switchMap(() => {
              if (this.normalizarEmail(this.email) === email) {
                this.verificandoEmail = true;
              }

              return this.servicoAuth.checkEmail(email).pipe(
                map((resposta): EmailCheckResult => ({ email, resposta })),
                catchError((erro: unknown) => of<EmailCheckResult>({ email, erro })),
                finalize(() => {
                  if (this.normalizarEmail(this.email) === email) {
                    this.verificandoEmail = false;
                  }
                }),
              );
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        if (!resultado || resultado.email !== this.normalizarEmail(this.email)) {
          return;
        }

        if ('erro' in resultado) {
          this.emailValido = false;
          this.erroEmail = getAuthRequestErrorMessage(
            resultado.erro,
            'Não foi possível verificar este e-mail. Tente novamente.',
            'A verificação do e-mail demorou demais. Tente novamente.',
          );
          return;
        }

        const resposta = resultado.resposta;
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
      });
  }

  aoAlterarEmail() {
    this.emailValido = false;
    this.erroEmail = '';
    this.verificandoEmail = false;
    this.checagemEmail$.next(this.normalizarEmail(this.email));
  }

  aoAlterarTelefone() {
    this.telefoneValido = this.validarTelefone(this.telefone);
  }

  private normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private validarTelefone(telefone: string): boolean {
    const digitos = telefone.replace(/\D/g, '');
    return digitos.length >= 10 && digitos.length <= 11;
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
      this.telefoneValido &&
      this.senhaValida &&
      this.senha === this.confirmarSenha &&
      this.confirmarSenha.length > 0
    );
  }

  aoEnviar() {
    this.erro = '';

    if (!this.formValido || this.carregando) return;

    this.carregando = true;

    this.servicoAuth
      .register({
        nome: this.nome,
        email: this.normalizarEmail(this.email),
        senha: this.senha,
        telefone: this.telefone,
        tipo: this.tipo,
      })
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: (resposta) => {
          void this.navegarAposRegistro(resposta);
        },
        error: (erroResposta) => {
          this.erro = getAuthRequestErrorMessage(
            erroResposta,
            'Erro ao criar conta. Tente novamente.',
            'A criação da conta demorou mais de um minuto. Tente novamente; se o problema continuar, verifique o serviço de e-mail.',
          );
        },
      });
  }

  private async navegarAposRegistro(resposta: AuthResponse): Promise<void> {
    try {
      await this.zonaNg.run(async () => {
        // Cadastro com e-mail/senha deve passar pela confirmação. O padrão seguro
        // também impede que uma resposta antiga sem este campo pule essa etapa.
        if (resposta.requiresVerification !== false) {
          const navegou = await this.roteador.navigate(['/verificar-email'], {
            queryParams: { email: resposta.email || this.normalizarEmail(this.email) },
          });

          if (!navegou) {
            this.erro = 'Não foi possível abrir a confirmação de e-mail. Tente novamente.';
          }
          return;
        }

        const navegou = await this.roteador.navigate([
          resposta.user?.tipo === 'BARBEIRO' || resposta.user?.tipo === 'ADMIN'
            ? '/dashboard'
            : '/perfil',
        ]);

        if (!navegou) {
          this.erro = 'A conta foi criada, mas não foi possível abrir a próxima página.';
        }
      });
    } catch {
      this.erro = 'A conta foi criada, mas não foi possível abrir a próxima página.';
    }
  }

  entrarComGoogle() {
    this.servicoAuth.loginWithGoogle();
  }
}
