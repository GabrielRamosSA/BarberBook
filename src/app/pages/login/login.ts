import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthResponse, AuthService } from '../../auth/auth.service';
import { getAuthRequestErrorMessage } from '../../auth/auth-request-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  email = '';
  senha = '';
  erro = '';
  carregando = false;

  constructor(
    private servicoAuth: AuthService,
    private roteador: Router,
    private zonaNg: NgZone,
  ) {}

  aoEnviar() {
    this.erro = '';

    if (this.carregando) {
      return;
    }

    const email = this.email.trim().toLowerCase();
    if (!email || !this.senha) {
      this.erro = 'Informe seu e-mail e senha para entrar.';
      return;
    }

    this.carregando = true;

    this.servicoAuth
      .login(email, this.senha)
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: (resposta) => {
          void this.navegarAposLogin(resposta, email);
        },
        error: (erroResposta) => {
          this.erro = getAuthRequestErrorMessage(
            erroResposta,
            'Erro ao fazer login. Tente novamente.',
            'O login demorou mais de um minuto. Tente novamente; se sua conta ainda não foi confirmada, verifique o serviço de e-mail.',
          );
        },
      });
  }

  private async navegarAposLogin(resposta: AuthResponse, email: string): Promise<void> {
    try {
      await this.zonaNg.run(async () => {
        if (resposta.requiresVerification) {
          if (!resposta.verificationToken && !this.servicoAuth.getPendingVerificationToken()) {
            this.erro = 'Não foi possível iniciar a confirmação de e-mail. Tente fazer login novamente.';
            return;
          }

          const navegou = await this.roteador.navigate(['/verificar-email'], {
            queryParams: { email: resposta.email || email },
          });

          if (!navegou) {
            this.erro = 'Não foi possível abrir a confirmação de e-mail. Tente novamente.';
          }
          return;
        }

        if (!resposta.user) {
          this.erro = 'Não foi possível concluir o login. Tente novamente.';
          return;
        }

        const navegou = await this.roteador.navigate([
          resposta.user.tipo === 'BARBEIRO' || resposta.user.tipo === 'ADMIN'
            ? '/dashboard'
            : '/perfil',
        ]);

        if (!navegou) {
          this.erro = 'O login foi concluído, mas não foi possível abrir a próxima página.';
        }
      });
    } catch {
      this.erro = 'O login foi concluído, mas não foi possível abrir a próxima página.';
    }
  }

  entrarComGoogle() {
    this.servicoAuth.loginWithGoogle();
  }
}
