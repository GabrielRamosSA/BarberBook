import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../../auth/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class PerfilComponent implements OnInit {
  user: User | null = null;
  editando = false;
  erroCarregamento = false;
  uploadingAvatar = false;

  // Campos de edição
  nome = '';
  telefone = '';
  mensagem = '';
  erro = '';

  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  private apiUrl = '/api/user';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
  ) {}

  get iniciaisUsuario(): string {
    const nome = this.user?.nome.trim() || '';
    const palavras = nome.split(/\s+/).filter(Boolean);

    return (
      palavras
        .slice(0, 2)
        .map((palavra) => palavra.charAt(0))
        .join('')
        .toUpperCase() || 'CA'
    );
  }

  get tipoContaFormatado(): string {
    const tipos: Record<User['tipo'], string> = {
      CLIENTE: 'Cliente',
      BARBEIRO: 'Barbeiro',
      ADMIN: 'Administrador',
    };

    return this.user ? tipos[this.user.tipo] : '';
  }

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      this.user = user;
      if (user) {
        this.nome = user.nome;
        this.telefone = user.telefone || '';
        this.erroCarregamento = false;
      }
    });

    // Se o usuário ainda não carregou, tenta carregar
    if (!this.user) {
      this.carregarPerfil();
    }
  }

  async carregarPerfil() {
    this.erroCarregamento = false;
    const user = await this.authService.loadUser();
    if (!user && !this.user) {
      this.erroCarregamento = true;
    }
  }

  tentarNovamente() {
    this.carregarPerfil();
  }

  toggleEditar() {
    this.editando = !this.editando;
    this.mensagem = '';
    this.erro = '';
  }

  // ========================
  // AVATAR
  // ========================
  triggerAvatarUpload() {
    this.avatarInput.nativeElement.click();
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];

    // Validação no frontend
    if (!file.type.match(/image\/(jpg|jpeg|png|gif|webp)/)) {
      this.erro = 'Apenas imagens são permitidas (jpg, png, gif, webp).';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.erro = 'A imagem deve ter no máximo 5MB.';
      return;
    }

    this.uploadingAvatar = true;
    this.erro = '';
    this.mensagem = '';

    const formData = new FormData();
    formData.append('avatar', file);

    this.http.post<{ message: string; user: User }>(`${this.apiUrl}/avatar`, formData).subscribe({
      next: (res) => {
        this.uploadingAvatar = false;
        this.mensagem = res.message;
        this.authService.loadUser();
      },
      error: (err) => {
        this.uploadingAvatar = false;
        this.erro = err.error?.message || 'Erro ao enviar imagem.';
      },
    });

    // Reset input so same file can be selected again
    input.value = '';
  }

  excluirAvatar() {
    if (!confirm('Tem certeza que deseja remover sua foto de perfil?')) return;

    this.erro = '';
    this.mensagem = '';

    this.http.delete<{ message: string; user: User }>(`${this.apiUrl}/avatar`).subscribe({
      next: (res) => {
        this.mensagem = res.message;
        this.authService.loadUser();
      },
      error: (err) => {
        this.erro = err.error?.message || 'Erro ao remover foto.';
      },
    });
  }

  salvar() {
    this.mensagem = '';
    this.erro = '';

    this.http
      .put<{ message: string; user: User }>(`${this.apiUrl}/profile`, {
        nome: this.nome,
        telefone: this.telefone || undefined,
      })
      .subscribe({
        next: (res) => {
          this.mensagem = res.message || 'Perfil atualizado com sucesso!';
          this.editando = false;
          // Recarrega os dados do usuário
          this.authService.loadUser();
        },
        error: (err) => {
          this.erro = err.error?.message || 'Erro ao atualizar perfil.';
        },
      });
  }

  excluirConta() {
    if (confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) {
      this.http.delete(`${this.apiUrl}/profile`).subscribe({
        next: () => {
          this.authService.logout();
        },
        error: (err) => {
          this.erro = err.error?.message || 'Erro ao excluir conta.';
        },
      });
    }
  }

  logout() {
    this.authService.logout();
  }
}
