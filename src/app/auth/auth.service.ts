import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, firstValueFrom } from 'rxjs';

export interface User {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  tipo: 'CLIENTE' | 'BARBEIRO' | 'ADMIN';
  plano?: 'BASICO' | 'PROFISSIONAL' | 'PREMIUM';
  avatar?: string;
}

export interface AuthResponse {
  access_token?: string;
  user?: User;
  message?: string;
  requiresVerification?: boolean;
  email?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = '/api/auth';
  private userSubject = new BehaviorSubject<User | null>(null);

  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Carrega o usuário do token se existir
    this.loadUser();
  }

  // ========================
  // REGISTRO DE NOVO USUÁRIO
  // ========================
  register(data: {
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
    tipo?: 'CLIENTE' | 'BARBEIRO';
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.user) {
          // Backend pode enviar token via cookie após verificação; atualizamos estado do usuário quando disponível
          this.userSubject.next(res.user);
        }
      }),
    );
  }

  // ========================
  // VERIFICAÇÃO DE E-MAIL
  // ========================
  verifyEmail(email: string, code: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/verify-email`, { email, code })
      .pipe(
        tap((res) => {
          if (res.user) {
            // Backend pode definir um cookie com o token; atualiza estado do usuário
            this.userSubject.next(res.user);
          }
        }),
      );
  }

  resendCode(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/resend-code`, { email });
  }

  // ========================
  // LOGIN COM EMAIL E SENHA
  // ========================
  login(email: string, senha: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, { email, senha }, { withCredentials: true })
      .pipe(
        tap((res) => {
          if (res.user) {
            // Token já foi enviado como cookie HttpOnly pelo backend; apenas atualizamos estado do usuário
            this.userSubject.next(res.user);
          }
        }),
      );
  }

  // ========================
  // LOGIN COM GOOGLE
  // ========================
  loginWithGoogle(): void {
    // Redireciona para o backend que vai redirecionar para o Google
    window.location.href = `${this.apiUrl}/google`;
  }

  // ========================
  // ESQUECEU A SENHA
  // ========================
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email });
  }

  // ========================
  // REDEFINIR SENHA
  // ========================
  resetPassword(token: string, novaSenha: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, { token, novaSenha });
  }

  // ========================
  // CALLBACK DO GOOGLE (salva o token)
  // ========================
  async handleGoogleCallback(): Promise<void> {
    // Com a mudança para cookie HttpOnly, o backend agora seta o cookie.
    // Não salvamos mais o token em localStorage para evitar XSS.
    try {
      // Espera carregar os dados do usuário ANTES de navegar
      const user = await firstValueFrom(
        this.http.get<User>(`${this.apiUrl}/me`, { withCredentials: true })
      );
      this.userSubject.next(user);
      this.router.navigate(['/perfil']);
    } catch (err) {
      console.error('Erro ao carregar usuário após Google login:', err);
      // Mesmo se falhar, o token está salvo, vai pro perfil
      this.router.navigate(['/perfil']);
    }
  }

  // ========================
  // BUSCA DADOS DO USUÁRIO LOGADO
  // ========================
  loadUser(): Promise<User | null> {
    return firstValueFrom(
      this.http.get<User>(`${this.apiUrl}/me`, { withCredentials: true })
    ).then((user) => {
      this.userSubject.next(user);
      return user;
    }).catch((err) => {
      console.error('Erro ao carregar usuário:', err);
      // Se 401, garante estado deslogado
      if (err.status === 401) {
        this.userSubject.next(null);
      }
      return null;
    });
  }

  // ========================
  // LOGOUT
  // ========================
  logout(): void {
    // Chama backend pra limpar cookie HttpOnly
    this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => {
        this.userSubject.next(null);
        this.router.navigate(['/']);
      },
      error: () => {
        this.userSubject.next(null);
        this.router.navigate(['/']);
      }
    });
  }

  // ========================
  // HELPERS DE TOKEN
  // ========================
  getToken(): string | null {
    // Removido: token agora é enviado via cookie HttpOnly pelo backend
    return null;
  }

  private saveToken(token: string): void {
    // Removido: não salvar token no localStorage
  }

  isLoggedIn(): boolean {
    // Recomenda-se verificar `user$` ou chamar `loadUser()` para confirmar autenticação
    return !!this.userSubject.value;
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  updateUserState(user: User): void {
    this.userSubject.next(user);
  }
}
