import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

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
    this.carregando = true;

    this.servicoAuth.login(this.email, this.senha).subscribe({
      next: (resposta) => {
        this.carregando = false;
        this.zonaNg.run(() => {
          if (resposta.requiresVerification) {
            this.roteador.navigate(['/verificar-email'], {
              queryParams: { email: resposta.email || this.email },
            });
          } else if (resposta.user?.tipo === 'BARBEIRO') {
            this.roteador.navigate(['/dashboard']);
          } else {
            this.roteador.navigate(['/perfil']);
          }
        });
      },
      error: (erroResposta) => {
        this.carregando = false;
        this.erro = erroResposta.error?.message || 'Erro ao fazer login. Tente novamente.';
      },
    });
  }

  entrarComGoogle() {
    this.servicoAuth.loginWithGoogle();
  }
}
