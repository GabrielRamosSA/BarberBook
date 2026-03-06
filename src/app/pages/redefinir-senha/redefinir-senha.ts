import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-redefinir-senha',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './redefinir-senha.html',
  styleUrl: './redefinir-senha.scss',
})
export class RedefinirSenhaComponent implements OnInit {
  token = '';
  novaSenha = '';
  confirmarSenha = '';
  erro = '';
  mensagem = '';
  carregando = false;
  sucesso = false;
  mostrarSenha = false;
  mostrarConfirmar = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.erro = 'Link inválido. Solicite um novo link de redefinição.';
    }
  }

  get senhaValida(): boolean {
    return this.novaSenha.length >= 6;
  }

  get senhasConferem(): boolean {
    return this.novaSenha === this.confirmarSenha;
  }

  onSubmit() {
    this.erro = '';
    this.mensagem = '';

    if (!this.senhaValida) {
      this.erro = 'A senha deve ter no mínimo 6 caracteres.';
      return;
    }

    if (!this.senhasConferem) {
      this.erro = 'As senhas não conferem.';
      return;
    }

    this.carregando = true;

    this.authService.resetPassword(this.token, this.novaSenha).subscribe({
      next: (res) => {
        this.carregando = false;
        this.sucesso = true;
        this.mensagem = res.message;
      },
      error: (err) => {
        this.carregando = false;
        this.erro = err.error?.message || 'Erro ao redefinir senha. Tente novamente.';
      },
    });
  }

  irParaLogin() {
    this.router.navigate(['/login']);
  }
}
