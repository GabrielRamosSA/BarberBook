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

  constructor(private authService: AuthService) {}

  onSubmit() {
    this.erro = '';
    this.mensagem = '';
    this.carregando = true;

    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.carregando = false;
        this.enviado = true;
        this.mensagem = res.message;
      },
      error: (err) => {
        this.carregando = false;
        this.erro = err.error?.message || 'Erro ao enviar. Tente novamente.';
      },
    });
  }
}
