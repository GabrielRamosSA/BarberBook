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
  code = '';
  erro = '';
  mensagem = '';
  verificando = false;
  reenviando = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.email = params['email'] || '';
      if (!this.email) {
        this.router.navigate(['/registro']);
      }
    });
  }

  verificar() {
    if (this.code.length !== 6) {
      this.erro = 'Digite o código de 6 dígitos.';
      return;
    }

    this.verificando = true;
    this.erro = '';
    this.mensagem = '';

    this.authService.verifyEmail(this.email, this.code).subscribe({
      next: (res) => {
        this.verificando = false;
        this.ngZone.run(() => {
          if (res.user?.tipo === 'BARBEIRO') {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/perfil']);
          }
        });
      },
      error: (err) => {
        this.verificando = false;
        this.erro = err.error?.message || 'Erro ao verificar código.';
      },
    });
  }

  reenviar() {
    this.reenviando = true;
    this.erro = '';
    this.mensagem = '';

    this.authService.resendCode(this.email).subscribe({
      next: (res) => {
        this.reenviando = false;
        this.mensagem = res.message;
      },
      error: (err) => {
        this.reenviando = false;
        this.erro = err.error?.message || 'Erro ao reenviar código.';
      },
    });
  }

  onCodeInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Permite apenas números
    this.code = input.value.replace(/\D/g, '').slice(0, 6);
    input.value = this.code;
  }
}
