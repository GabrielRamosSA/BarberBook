import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-esqueceu-senha',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './esqueceu-senha.html',
  styleUrl: './esqueceu-senha.scss',
})
export class EsqueceuSenhaComponent {
  email = '';
  mensagem = '';
  erro = '';
  carregando = false;
  enviado = false;

  constructor(private servicoAuth: AuthService) {}

  aoEnviar() {
    this.erro = '';
    this.mensagem = '';
    this.carregando = true;

    this.servicoAuth.forgotPassword(this.email).subscribe({
      next: (resposta) => {
        this.carregando = false;
        this.enviado = true;
        this.mensagem = resposta.message;
      },
      error: (erroResposta) => {
        this.carregando = false;
        this.erro = erroResposta.error?.message || 'Erro ao enviar. Tente novamente.';
      },
    });
  }
}
