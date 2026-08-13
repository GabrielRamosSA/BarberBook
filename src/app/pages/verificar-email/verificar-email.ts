import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthResponse, AuthService } from '../../auth/auth.service';
import { getAuthRequestErrorMessage } from '../../auth/auth-request-error';

@Component({
  selector: 'app-verificar-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verificar-email.html',
  styleUrl: './verificar-email.scss',
})
export class VerificarEmailComponent implements OnInit {
  email = '';
  codigo = '';
  erro = '';
  mensagem = '';
  verificando = false;
  reenviando = false;
  private verificationToken = '';

  constructor(
    private servicoAuth: AuthService,
    private roteador: Router,
    private rota: ActivatedRoute,
    private zonaNg: NgZone,
  ) {}

  ngOnInit() {
    this.email = (this.rota.snapshot.queryParamMap.get('email') || '').trim().toLowerCase();
    if (!this.email) {
      void this.roteador.navigate(['/registro']);
      return;
    }

    this.verificationToken = this.servicoAuth.getPendingVerificationToken() || '';
    if (!this.verificationToken) {
      this.erro = 'Sua sessão de confirmação expirou. Volte ao cadastro para receber um novo código.';
    }
  }

  verificarCodigo() {
    if (this.verificando) {
      return;
    }

    if (!this.verificationToken) {
      this.erro = 'Sua sessão de confirmação expirou. Volte ao cadastro para receber um novo código.';
      return;
    }

    if (this.codigo.length !== 6) {
      this.erro = 'Digite o código de 6 dígitos.';
      return;
    }

    this.verificando = true;
    this.erro = '';
    this.mensagem = '';

    this.servicoAuth
      .verifyEmail(this.email, this.codigo, this.verificationToken)
      .pipe(finalize(() => (this.verificando = false)))
      .subscribe({
        next: (resposta) => {
          void this.navegarAposVerificacao(resposta);
        },
        error: (erroResposta) => {
          this.erro = getAuthRequestErrorMessage(
            erroResposta,
            'Erro ao verificar código.',
            'A verificação demorou mais de um minuto. Tente novamente.',
          );
        },
      });
  }

  reenviarCodigo() {
    if (this.reenviando) {
      return;
    }

    if (!this.verificationToken) {
      this.erro = 'Sua sessão de confirmação expirou. Volte ao cadastro para receber um novo código.';
      return;
    }

    this.reenviando = true;
    this.erro = '';
    this.mensagem = '';

    this.servicoAuth
      .resendCode(this.email, this.verificationToken)
      .pipe(finalize(() => (this.reenviando = false)))
      .subscribe({
        next: (resposta) => {
          this.mensagem = resposta.message || 'Novo código enviado para o e-mail.';
          if (resposta.verificationToken) {
            this.verificationToken = resposta.verificationToken;
          }
        },
        error: (erroResposta) => {
          this.erro = getAuthRequestErrorMessage(
            erroResposta,
            'Erro ao reenviar código.',
            'O reenvio demorou mais de um minuto. Tente novamente.',
          );
        },
      });
  }

  private async navegarAposVerificacao(resposta: AuthResponse): Promise<void> {
    try {
      await this.zonaNg.run(async () => {
        const navegou = await this.roteador.navigate([
          resposta.user?.tipo === 'BARBEIRO' || resposta.user?.tipo === 'ADMIN'
            ? '/dashboard'
            : '/perfil',
        ]);

        if (navegou) {
          this.servicoAuth.clearPendingVerificationToken();
        } else {
          this.erro = 'O e-mail foi verificado, mas não foi possível abrir a próxima página.';
        }
      });
    } catch {
      this.erro = 'O e-mail foi verificado, mas não foi possível abrir a próxima página.';
    }
  }

  aoDigitarCodigo(event: Event) {
    const input = event.target as HTMLInputElement;
    // Permite apenas números
    this.codigo = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = this.codigo;
  }
}
