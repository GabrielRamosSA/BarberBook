import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

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

  constructor(
    private servicoAuth: AuthService,
    private roteador: Router,
    private rota: ActivatedRoute,
    private zonaNg: NgZone,
  ) {}

  ngOnInit() {
    this.rota.queryParams.subscribe((params) => {
      this.email = params['email'] || '';
      if (!this.email) {
        this.roteador.navigate(['/registro']);
      }
    });
  }

  verificarCodigo() {
    if (this.codigo.length !== 6) {
      this.erro = 'Digite o código de 6 dígitos.';
      return;
    }

    this.verificando = true;
    this.erro = '';
    this.mensagem = '';

    this.servicoAuth.verifyEmail(this.email, this.codigo).subscribe({
      next: (resposta) => {
        this.verificando = false;
        this.zonaNg.run(() => {
          if (resposta.user?.tipo === 'BARBEIRO') {
            this.roteador.navigate(['/dashboard']);
          } else {
            this.roteador.navigate(['/perfil']);
          }
        });
      },
      error: (erroResposta) => {
        this.verificando = false;
        this.erro = erroResposta.error?.message || 'Erro ao verificar código.';
      },
    });
  }

  reenviarCodigo() {
    this.reenviando = true;
    this.erro = '';
    this.mensagem = '';

    this.servicoAuth.resendCode(this.email).subscribe({
      next: (resposta) => {
        this.reenviando = false;
        this.mensagem = resposta.message;
      },
      error: (erroResposta) => {
        this.reenviando = false;
        this.erro = erroResposta.error?.message || 'Erro ao reenviar código.';
      },
    });
  }

  aoDigitarCodigo(event: Event) {
    const input = event.target as HTMLInputElement;
    // Permite apenas números
    this.codigo = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = this.codigo;
  }
}
