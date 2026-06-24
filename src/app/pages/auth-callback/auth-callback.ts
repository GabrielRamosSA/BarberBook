import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="callback-container">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Autenticando...</p>
    </div>
  `,
  styles: [`
    .callback-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #071522 0%, #2c3e50 100%);
      color: #fff;
      font-family: 'Inter', sans-serif;
      gap: 16px;

      i {
        font-size: 2.5rem;
        color: #d4a373;
      }

      p {
        font-size: 1.1rem;
      }
    }
  `],
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    // Após redirecionamento do backend, o cookie HttpOnly foi setado.
    // Apenas chama o flow para carregar o usuário e redirecionar.
    this.authService.handleGoogleCallback().then(() => {
      console.log('Google callback concluído com sucesso');
    }).catch((err) => {
      console.error('Erro no Google callback:', err);
      this.router.navigate(['/login']);
    });
  }
}
