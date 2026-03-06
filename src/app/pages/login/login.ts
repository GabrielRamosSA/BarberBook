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

  constructor(private authService: AuthService, private router: Router, private ngZone: NgZone) {}

  onSubmit() {
    this.erro = '';
    this.carregando = true;

    this.authService.login(this.email, this.senha).subscribe({
      next: (res) => {
        this.carregando = false;
        this.ngZone.run(() => {
          if (res.requiresVerification) {
            this.router.navigate(['/verificar-email'], {
              queryParams: { email: res.email || this.email },
            });
          } else if (res.user?.tipo === 'BARBEIRO') {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/perfil']);
          }
        });
      },
      error: (err) => {
        this.carregando = false;
        this.erro = err.error?.message || 'Erro ao fazer login. Tente novamente.';
      },
    });
  }

  loginComGoogle() {
    this.authService.loginWithGoogle();
  }
}
