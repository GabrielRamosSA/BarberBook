import { Component, OnInit, OnDestroy, ViewEncapsulation, HostListener, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../auth/auth.service';

interface Estado {
  name: string;
  code: string;
}

interface Cidade {
  name: string;
  estado: string;
}

@Component({
  selector: 'app-pag-inicial',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './pag-inicial.html',
  styleUrl: './pag-inicial.scss',
  encapsulation: ViewEncapsulation.None,
})
export class PagInicial implements OnInit, OnDestroy {
  estados: Estado[] = [];
  cidadesFiltradas: Cidade[] = [];

  selectedEstado: Estado | null = null;
  selectedCidade: Cidade | null = null;

  estadoAberto = false;
  cidadeAberta = false;
  estadoFiltro = '';
  cidadeFiltro = '';

  // Barbearias
  barbearias: any[] = [];
  buscandoBarbearias = false;
  buscaRealizada = false;
  private carouselIntervals: Map<string, any> = new Map();

  user: User | null = null;
  menuAberto = false;

  // Modal telefone (consulta de agendamentos para clientes sem conta)
  modalTelefoneAberto = false;
  telefoneConsulta = '';
  consultandoTelefone = false;
  erroConsulta = '';

  private apiUrl = '/api/barbearias';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private elRef: ElementRef,
    private router: Router,
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      this.user = user;
    });

    if (this.authService.isLoggedIn() && !this.user) {
      this.authService.loadUser();
    }

    this.http
      .get<any[]>('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .subscribe((data) => {
        this.estados = data.map((e) => ({
          name: e.nome,
          code: e.sigla,
        }));
      });
  }

  // ==============================
  // Estado dropdown
  // ==============================
  toggleEstado() {
    this.estadoAberto = !this.estadoAberto;
    this.cidadeAberta = false;
    if (this.estadoAberto) {
      this.estadoFiltro = '';
    }
  }

  get estadosFiltrados(): Estado[] {
    if (!this.estadoFiltro.trim()) return this.estados;
    const q = this.estadoFiltro.toLowerCase();
    return this.estados.filter((e) => e.name.toLowerCase().includes(q));
  }

  selecionarEstado(estado: Estado) {
    this.selectedEstado = estado;
    this.estadoAberto = false;
    this.estadoFiltro = '';

    // Reset cidade
    this.selectedCidade = null;
    this.cidadesFiltradas = [];

    this.http
      .get<any[]>(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado.code}/municipios?orderBy=nome`
      )
      .subscribe((data) => {
        this.cidadesFiltradas = data.map((c) => ({
          name: c.nome,
          estado: estado.code,
        }));
      });
  }

  limparEstado(event: Event) {
    event.stopPropagation();
    this.selectedEstado = null;
    this.selectedCidade = null;
    this.cidadesFiltradas = [];
    this.estadoAberto = false;
    this.barbearias = [];
    this.buscaRealizada = false;
  }

  // ==============================
  // Cidade dropdown
  // ==============================
  toggleCidade() {
    if (!this.selectedEstado) return;
    this.cidadeAberta = !this.cidadeAberta;
    this.estadoAberto = false;
    if (this.cidadeAberta) {
      this.cidadeFiltro = '';
    }
  }

  get cidadesFiltradaList(): Cidade[] {
    if (!this.cidadeFiltro.trim()) return this.cidadesFiltradas;
    const q = this.cidadeFiltro.toLowerCase();
    return this.cidadesFiltradas.filter((c) => c.name.toLowerCase().includes(q));
  }

  selecionarCidade(cidade: Cidade) {
    this.selectedCidade = cidade;
    this.cidadeAberta = false;
    this.cidadeFiltro = '';
    this.buscarBarbearias();
  }

  limparCidade(event: Event) {
    event.stopPropagation();
    this.selectedCidade = null;
    this.cidadeAberta = false;
    this.barbearias = [];
    this.buscaRealizada = false;
  }

  // ==============================
  // Buscar barbearias
  // ==============================
  buscarBarbearias() {
    if (!this.selectedEstado || !this.selectedCidade) return;

    this.buscandoBarbearias = true;
    this.buscaRealizada = false;

    this.http
      .get<any[]>(`${this.apiUrl}/search`, {
        params: {
          estado: this.selectedEstado.code,
          cidade: this.selectedCidade.name,
        },
      })
      .subscribe({
        next: (data) => {
          setTimeout(() => {
            this.barbearias = data;
            this.buscandoBarbearias = false;
            this.buscaRealizada = true;
            this.iniciarCarousels();
          }, 2000);
        },
        error: () => {
          setTimeout(() => {
            this.barbearias = [];
            this.buscandoBarbearias = false;
            this.buscaRealizada = true;
            this.limparCarousels();
          }, 2000);
        },
      });
  }

  getFotoPrincipal(b: any): string {
    if (b.foto) return b.foto;
    if (b.fotos && b.fotos.length > 0) return b.fotos[0];
    return '';
  }

  getAllFotos(b: any): string[] {
    const fotos: string[] = [];
    if (b.foto) fotos.push(b.foto);
    if (b.fotos?.length) fotos.push(...b.fotos);
    return fotos;
  }

  // ==============================
  // Carousel
  // ==============================
  ngOnDestroy() {
    this.limparCarousels();
  }

  iniciarCarousels() {
    this.limparCarousels();
    for (const b of this.barbearias) {
      b._carouselIndex = 0;
      const totalFotos = this.getAllFotos(b).length;
      if (totalFotos > 1) {
        const interval = setInterval(() => {
          b._carouselIndex = ((b._carouselIndex || 0) + 1) % totalFotos;
        }, 4000);
        this.carouselIntervals.set(b.id, interval);
      }
    }
  }

  limparCarousels() {
    this.carouselIntervals.forEach((interval) => clearInterval(interval));
    this.carouselIntervals.clear();
  }

  carouselPrev(b: any, event: Event) {
    event.stopPropagation();
    const total = this.getAllFotos(b).length;
    if (total <= 1) return;
    b._carouselIndex = ((b._carouselIndex || 0) - 1 + total) % total;
    this.resetCarouselTimer(b);
  }

  carouselNext(b: any, event: Event) {
    event.stopPropagation();
    const total = this.getAllFotos(b).length;
    if (total <= 1) return;
    b._carouselIndex = ((b._carouselIndex || 0) + 1) % total;
    this.resetCarouselTimer(b);
  }

  carouselGoTo(b: any, index: number, event: Event) {
    event.stopPropagation();
    b._carouselIndex = index;
    this.resetCarouselTimer(b);
  }

  private resetCarouselTimer(b: any) {
    const existing = this.carouselIntervals.get(b.id);
    if (existing) clearInterval(existing);
    const total = this.getAllFotos(b).length;
    if (total > 1) {
      const interval = setInterval(() => {
        b._carouselIndex = ((b._carouselIndex || 0) + 1) % total;
      }, 4000);
      this.carouselIntervals.set(b.id, interval);
    }
  }

  // ==============================
  // Global clicks
  // ==============================
  toggleMenu() {
    this.menuAberto = !this.menuAberto;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.menuAberto = false;
    }
    if (!target.closest('.custom-select-estado')) {
      this.estadoAberto = false;
    }
    if (!target.closest('.custom-select-cidade')) {
      this.cidadeAberta = false;
    }
  }

  logout() {
    this.menuAberto = false;
    this.authService.logout();
  }

  getAvatarUrl(): string {
    if (this.user?.avatar) {
      if (this.user.avatar.startsWith('http')) return this.user.avatar;
      return `${this.user.avatar}`;
    }
    return '';
  }

  // ==============================
  // Modal telefone
  // ==============================
  abrirModalTelefone() {
    this.modalTelefoneAberto = true;
    this.telefoneConsulta = '';
    this.erroConsulta = '';
  }

  fecharModalTelefone() {
    this.modalTelefoneAberto = false;
  }

  consultarAgendamentos() {
    const tel = this.telefoneConsulta.replace(/\D/g, '');
    if (tel.length < 10) {
      this.erroConsulta = 'Digite um telefone válido com DDD.';
      return;
    }
    this.consultandoTelefone = true;
    this.erroConsulta = '';
    this.http.get<any[]>(`/api/agendamentos/consultar?telefone=${tel}`).subscribe({
      next: (data) => {
        this.consultandoTelefone = false;
        if (data.length === 0) {
          this.erroConsulta = 'Nenhum agendamento encontrado para este telefone.';
          return;
        }
        this.fecharModalTelefone();
        this.router.navigate(['/meus-agendamentos'], { queryParams: { telefone: tel } });
      },
      error: () => {
        this.consultandoTelefone = false;
        this.erroConsulta = 'Erro ao consultar. Tente novamente.';
      },
    });
  }
}
