import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  private readonly tokenKey = 'token';
  private readonly apiUrl = this.resolveApiUrl();
  private userSubject = new BehaviorSubject<User | null>(null);

  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Carrega o usuário do token se existir
    this.loadUser();
  }

  private resolveApiUrl(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '/api/auth';
      }
    }

    return 'https://barberbook-awgp.onrender.com/api/auth';
  }

  private buildAuthOptions() {
    const token = this.getToken();

    return {
      withCredentials: true,
      ...(token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {}),
    };
  }

  private persistTokenFromResponse(response: AuthResponse | null | undefined): void {
    if (response?.access_token) {
      this.saveToken(response.access_token);
    }
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
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data, this.buildAuthOptions()).pipe(
      tap((res) => {
        this.persistTokenFromResponse(res);
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
      .post<AuthResponse>(`${this.apiUrl}/verify-email`, { email, code }, this.buildAuthOptions())
      .pipe(
        tap((res) => {
          this.persistTokenFromResponse(res);
          if (res.user) {
            // Backend pode definir um cookie com o token; atualiza estado do usuário
            this.userSubject.next(res.user);
          }
        }),
      );
  }

  resendCode(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/resend-code`, { email }, this.buildAuthOptions());
  }

  // ========================
  // LOGIN COM EMAIL E SENHA
  // ========================
  login(email: string, senha: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, { email, senha }, this.buildAuthOptions())
      .pipe(
        tap((res) => {
          this.persistTokenFromResponse(res);
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
    if (typeof window !== 'undefined') {
      window.location.href = `${this.apiUrl}/google`;
    }
  }

  // ========================
  // ESQUECEU A SENHA
  // ========================
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/forgot-password`, { email }, this.buildAuthOptions());
  }

  // ========================
  // REDEFINIR SENHA
  // ========================
  resetPassword(token: string, novaSenha: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, { token, novaSenha }, this.buildAuthOptions());
  }

  // ========================
  // CALLBACK DO GOOGLE (salva o token)
  // ========================
  async handleGoogleCallback(token?: string): Promise<User | null> {
    if (token) {
      this.saveToken(token);
    }

    return this.loadUser();
  }

  // ========================
  // BUSCA DADOS DO USUÁRIO LOGADO
  // ========================
  loadUser(): Promise<User | null> {
    return firstValueFrom(
      this.http.get<User>(`${this.apiUrl}/me`, this.buildAuthOptions())
    ).then((user) => {
      this.userSubject.next(user);
      return user;
    }).catch((err) => {
      console.error('Erro ao carregar usuário:', err);
      // Se 401, garante estado deslogado
      if (err.status === 401) {
        this.userSubject.next(null);
        this.clearToken();
      }
      return null;
    });
  }

  // ========================
  // LOGOUT
  // ========================
  logout(): void {
    // Chama backend pra limpar cookie HttpOnly
    this.http.post(`${this.apiUrl}/logout`, {}, this.buildAuthOptions()).subscribe({
      next: () => {
        this.userSubject.next(null);
        this.clearToken();
        this.router.navigate(['/']);
      },
      error: () => {
        this.userSubject.next(null);
        this.clearToken();
        this.router.navigate(['/']);
      }
    });
  }

  // ========================
  // HELPERS DE TOKEN
  // ========================
  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return localStorage.getItem(this.tokenKey);
  }

  private saveToken(token: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.tokenKey, token);
  }

  private clearToken(): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.userSubject.value || !!this.getToken();
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  updateUserState(user: User): void {
    this.userSubject.next(user);
  }
}
