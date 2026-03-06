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
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((res) => {
        if (res.access_token && res.user) {
          this.saveToken(res.access_token);
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
          if (res.access_token && res.user) {
            this.saveToken(res.access_token);
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
      .post<AuthResponse>(`${this.apiUrl}/login`, { email, senha })
      .pipe(
        tap((res) => {
          if (res.access_token && res.user) {
            this.saveToken(res.access_token);
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
  async handleGoogleCallback(token: string): Promise<void> {
    this.saveToken(token);
    try {
      // Espera carregar os dados do usuário ANTES de navegar
      const user = await firstValueFrom(
        this.http.get<User>(`${this.apiUrl}/me`)
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
    const token = this.getToken();
    if (!token) {
      return Promise.resolve(null);
    }

    return firstValueFrom(
      this.http.get<User>(`${this.apiUrl}/me`)
    ).then((user) => {
      this.userSubject.next(user);
      return user;
    }).catch((err) => {
      console.error('Erro ao carregar usuário:', err);
      // Só faz logout se o token for realmente inválido (401)
      if (err.status === 401) {
        this.logout();
      }
      return null;
    });
  }

  // ========================
  // LOGOUT
  // ========================
  logout(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('token');
    }
    this.userSubject.next(null);
    this.router.navigate(['/']);
  }

  // ========================
  // HELPERS DE TOKEN
  // ========================
  getToken(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private saveToken(token: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  updateUserState(user: User): void {
    this.userSubject.next(user);
  }
}
