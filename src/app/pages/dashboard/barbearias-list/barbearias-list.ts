import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../auth/auth.service';

interface Barbearia {
  id: string;
  nome: string;
  descricao: string | null;
  endereco: string;
  cidade: string;
  estado: string;
  telefone: string | null;
  whatsapp: string | null;
  foto: string | null;
  fotos: string[];
  ativa: boolean;
  createdAt: string;
  _carouselIndex?: number;
}

@Component({
  selector: 'app-barbearias-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './barbearias-list.html',
  styleUrl: './barbearias-list.scss',
})
export class BarbeariasListComponent implements OnInit, OnDestroy {
  barbearias: Barbearia[] = [];
  carregando = true;
  planoUsuario: string = 'BASICO';
  private carouselIntervals: Map<string, any> = new Map();

  // Modal de exclusão
  modalExcluir: Barbearia | null = null;
  excluindo = false;

  // Toast
  toast: { mensagem: string; tipo: 'sucesso' | 'erro' } | null = null;
  private toastTimer: any;

  private apiUrl = '/api/barbearias';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit() {
    const user = this.authService.currentUser;
    if (user?.plano) {
      this.planoUsuario = user.plano;
    }
    this.carregarBarbearias();
  }

  get maxBarbearias(): number {
    const limites: Record<string, number> = { BASICO: 1, PROFISSIONAL: 3, PREMIUM: -1 };
    return limites[this.planoUsuario] ?? 1;
  }

  get limiteAtingido(): boolean {
    return this.maxBarbearias !== -1 && this.barbearias.length >= this.maxBarbearias;
  }

  get limiteExcedido(): boolean {
    return this.maxBarbearias !== -1 && this.barbearias.length > this.maxBarbearias;
  }

  get quantidadeExcedente(): number {
    if (this.maxBarbearias === -1) return 0;
    return Math.max(0, this.barbearias.length - this.maxBarbearias);
  }

  isExcedente(index: number): boolean {
    // Barbearias são ordenadas por createdAt desc (mais novas primeiro)
    // As excedentes são as mais novas (criadas enquanto estava no plano maior)
    if (this.maxBarbearias === -1) return false;
    const excesso = this.barbearias.length - this.maxBarbearias;
    if (excesso <= 0) return false;
    return index < excesso;
  }

  ngOnDestroy() {
    this.carouselIntervals.forEach((interval) => clearInterval(interval));
  }

  carregarBarbearias() {
    this.carregando = true;
    this.http.get<Barbearia[]>(`${this.apiUrl}/owner/me`).subscribe({
      next: (data) => {
        this.barbearias = data.map((b) => ({ ...b, _carouselIndex: 0 }));
        this.carregando = false;
        this.iniciarCarousels();
      },
      error: () => {
        this.carregando = false;
      },
    });
  }

  iniciarCarousels() {
    this.carouselIntervals.forEach((interval) => clearInterval(interval));
    this.carouselIntervals.clear();

    for (const b of this.barbearias) {
      const totalFotos = this.obterTotalFotos(b);
      if (totalFotos > 1) {
        const interval = setInterval(() => {
          b._carouselIndex = ((b._carouselIndex || 0) + 1) % totalFotos;
        }, 4000);
        this.carouselIntervals.set(b.id, interval);
      }
    }
  }

  obterTotalFotos(b: Barbearia): number {
    return (b.fotos?.length || 0) + (b.foto ? 1 : 0);
  }

  obterTodasFotos(b: Barbearia): string[] {
    const fotos: string[] = [];
    if (b.foto) fotos.push(b.foto);
    if (b.fotos?.length) fotos.push(...b.fotos);
    return fotos;
  }

  carrosselAnterior(b: Barbearia, event: Event) {
    event.stopPropagation();
    const total = this.obterTotalFotos(b);
    if (total <= 1) return;
    b._carouselIndex = ((b._carouselIndex || 0) - 1 + total) % total;
    this.resetarTimerCarrossel(b);
  }

  carrosselProximo(b: Barbearia, event: Event) {
    event.stopPropagation();
    const total = this.obterTotalFotos(b);
    if (total <= 1) return;
    b._carouselIndex = ((b._carouselIndex || 0) + 1) % total;
    this.resetarTimerCarrossel(b);
  }

  carrosselIrPara(b: Barbearia, index: number, event: Event) {
    event.stopPropagation();
    b._carouselIndex = index;
    this.resetarTimerCarrossel(b);
  }

  private resetarTimerCarrossel(b: Barbearia) {
    const existing = this.carouselIntervals.get(b.id);
    if (existing) clearInterval(existing);
    const total = this.obterTotalFotos(b);
    if (total > 1) {
      const interval = setInterval(() => {
        b._carouselIndex = ((b._carouselIndex || 0) + 1) % total;
      }, 4000);
      this.carouselIntervals.set(b.id, interval);
    }
  }

  toggleAtiva(barbearia: Barbearia) {
    this.http
      .put<any>(`${this.apiUrl}/${barbearia.id}`, { ativa: !barbearia.ativa })
      .subscribe({
        next: (res) => {
          barbearia.ativa = res.barbearia.ativa;
        },
      });
  }

  excluir(barbearia: Barbearia) {
    this.modalExcluir = barbearia;
  }

  cancelarExclusao() {
    this.modalExcluir = null;
  }

  confirmarExclusao() {
    if (!this.modalExcluir) return;
    const barbearia = this.modalExcluir;
    this.excluindo = true;

    this.http.delete(`${this.apiUrl}/${barbearia.id}`).subscribe({
      next: () => {
        const interval = this.carouselIntervals.get(barbearia.id);
        if (interval) clearInterval(interval);
        this.carouselIntervals.delete(barbearia.id);
        this.barbearias = this.barbearias.filter((b) => b.id !== barbearia.id);
        this.excluindo = false;
        this.modalExcluir = null;
        this.mostrarToast(`"${barbearia.nome}" excluída com sucesso!`, 'sucesso');
      },
      error: () => {
        this.excluindo = false;
        this.modalExcluir = null;
        this.mostrarToast('Erro ao excluir barbearia.', 'erro');
      },
    });
  }

  mostrarToast(mensagem: string, tipo: 'sucesso' | 'erro') {
    this.toast = { mensagem, tipo };
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = null;
    }, 4000);
  }
}
