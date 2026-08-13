import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService, User } from '../auth/auth.service';

@Component({
  selector: 'app-pag-inicial',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './pag-inicial.html',
  styleUrl: './pag-inicial.scss',
  encapsulation: ViewEncapsulation.None,
})
export class PaginaInicial implements OnInit, AfterViewInit, OnDestroy {
  private readonly CHAVE_STORAGE_ULTIMO_TELEFONE = 'barberbook:last-phone';
  private readonly SECOES_MENU = ['inicio', 'beneficios', 'inovacao', 'planos', 'final'];

  usuario: User | null = null;
  menuAberto = false;
  navegacaoAberta = false;
  secaoAtiva = 'inicio';

  modalTelefoneAberto = false;
  telefoneConsulta = '';
  consultandoTelefone = false;
  erroConsulta = '';

  @ViewChild('telefoneInput') telefoneInput?: ElementRef<HTMLInputElement>;

  private observadorRevelacao?: IntersectionObserver;
  private observadorSecoes?: IntersectionObserver;
  private ultimoElementoFocado: HTMLElement | null = null;
  private readonly estaNoNavegador: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private elemento: ElementRef<HTMLElement>,
    private zona: NgZone,
    private clienteHttp: HttpClient,
    private servicoAuth: AuthService,
    private roteador: Router,
  ) {
    this.estaNoNavegador = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.servicoAuth.user$.subscribe((usuario) => {
      this.usuario = usuario;
    });

    if (this.servicoAuth.isLoggedIn() && !this.usuario) {
      this.servicoAuth.loadUser();
    }
  }

  ngAfterViewInit() {
    if (!this.estaNoNavegador) return;

    this.configurarAnimacoesDeEntrada();
    this.configurarObservadorDeSecoes();
  }

  ngOnDestroy() {
    this.observadorRevelacao?.disconnect();
    this.observadorSecoes?.disconnect();
  }

  rolarParaSecao(idSecao: string, event?: Event) {
    event?.preventDefault();
    this.navegacaoAberta = false;

    if (!this.estaNoNavegador) return;

    const alvo = document.getElementById(idSecao);
    if (!alvo) return;

    const cabecalho = document.querySelector('.cabecalho-pagina') as HTMLElement | null;
    const alturaCabecalho = cabecalho?.offsetHeight ?? 0;
    const deslocamento = 18;
    const topo = alvo.getBoundingClientRect().top + window.scrollY - alturaCabecalho - deslocamento;

    window.scrollTo({
      top: Math.max(topo, 0),
      behavior: this.prefereMovimentoReduzido() ? 'auto' : 'smooth',
    });

    this.secaoAtiva = idSecao;
  }

  secaoEstaAtiva(idSecao: string): boolean {
    return this.secaoAtiva === idSecao;
  }

  alternarNavegacao() {
    this.navegacaoAberta = !this.navegacaoAberta;
    this.menuAberto = false;
  }

  alternarMenu() {
    this.menuAberto = !this.menuAberto;
    this.navegacaoAberta = false;
  }

  @HostListener('document:click', ['$event'])
  aoClicarDocumento(event: Event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (!target.closest('.menu-usuario')) {
      this.menuAberto = false;
    }

    if (!target.closest('.cabecalho-pagina')) {
      this.navegacaoAberta = false;
    }
  }

  @HostListener('document:keydown.escape')
  aoPressionarEscape() {
    if (this.modalTelefoneAberto) {
      this.fecharModalTelefone();
      return;
    }

    this.menuAberto = false;
    this.navegacaoAberta = false;
  }

  sair() {
    this.menuAberto = false;
    this.servicoAuth.logout();
  }

  obterUrlAvatar(): string {
    if (this.usuario?.avatar) {
      if (this.usuario.avatar.startsWith('http')) return this.usuario.avatar;
      return `${this.usuario.avatar}`;
    }
    return '';
  }

  abrirModalTelefone() {
    if (this.estaNoNavegador && document.activeElement instanceof HTMLElement) {
      this.ultimoElementoFocado = document.activeElement;
    }

    this.modalTelefoneAberto = true;
    this.telefoneConsulta = this.obterTelefoneSalvo();
    this.erroConsulta = '';

    setTimeout(() => this.telefoneInput?.nativeElement.focus());
  }

  fecharModalTelefone() {
    this.modalTelefoneAberto = false;

    if (this.estaNoNavegador && this.ultimoElementoFocado) {
      const elementoParaFocar = this.ultimoElementoFocado;
      this.ultimoElementoFocado = null;
      setTimeout(() => elementoParaFocar.focus());
    }
  }

  consultarAgendamentos() {
    const telefoneLimpo = this.telefoneConsulta.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
      this.erroConsulta = 'Digite um telefone valido com DDD.';
      return;
    }

    this.salvarTelefone(this.telefoneConsulta);
    this.consultandoTelefone = true;
    this.erroConsulta = '';

    this.clienteHttp.get<any[]>(`/api/agendamentos/consultar?telefone=${telefoneLimpo}`).subscribe({
      next: (agendamentos) => {
        this.consultandoTelefone = false;
        if (agendamentos.length === 0) {
          this.erroConsulta = 'Nenhum agendamento encontrado para este telefone.';
          return;
        }
        this.fecharModalTelefone();
        this.roteador.navigate(['/meus-agendamentos'], {
          queryParams: { telefone: telefoneLimpo },
        });
      },
      error: () => {
        this.consultandoTelefone = false;
        this.erroConsulta = 'Erro ao consultar. Tente novamente.';
      },
    });
  }

  aoDigitarTelefoneConsulta(event: Event) {
    const input = event.target as HTMLInputElement;
    const mascarado = this.mascararTelefone(input.value);
    this.telefoneConsulta = mascarado;
    input.value = mascarado;
    this.salvarTelefone(mascarado);
  }

  private mascararTelefone(valor: string): string {
    const digitos = (valor || '').replace(/\D/g, '').slice(0, 11);

    if (digitos.length > 6) {
      return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
    }
    if (digitos.length > 2) {
      return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
    }
    if (digitos.length > 0) {
      return `(${digitos}`;
    }
    return '';
  }

  private salvarTelefone(valor: string) {
    if (typeof localStorage === 'undefined') return;

    const digitos = (valor || '').replace(/\D/g, '');
    if (digitos.length >= 10) {
      localStorage.setItem(this.CHAVE_STORAGE_ULTIMO_TELEFONE, digitos);
    }
  }

  private obterTelefoneSalvo(): string {
    if (typeof localStorage === 'undefined') return '';

    const salvo = localStorage.getItem(this.CHAVE_STORAGE_ULTIMO_TELEFONE) || '';
    return this.mascararTelefone(salvo);
  }

  private configurarAnimacoesDeEntrada() {
    if (this.prefereMovimentoReduzido() || !('IntersectionObserver' in window)) return;

    const raiz = this.elemento.nativeElement.querySelector<HTMLElement>('.pagina-inicial');
    if (!raiz) return;

    const elementosParaRevelar = Array.from(raiz.querySelectorAll<HTMLElement>('.revelar'));
    if (!elementosParaRevelar.length) return;

    requestAnimationFrame(() => {
      raiz.classList.add('motion-ready');

      this.observadorRevelacao = new IntersectionObserver(
        (entradas) => {
          entradas.forEach((entrada) => {
            if (!entrada.isIntersecting) return;

            (entrada.target as HTMLElement).classList.add('esta-visivel');
            this.observadorRevelacao?.unobserve(entrada.target);
          });
        },
        { rootMargin: '0px 0px -10%', threshold: 0.12 },
      );

      elementosParaRevelar.forEach((elemento) => this.observadorRevelacao?.observe(elemento));
    });
  }

  private configurarObservadorDeSecoes() {
    if (!('IntersectionObserver' in window)) return;

    const secoes = this.SECOES_MENU.map((id) => document.getElementById(id)).filter(
      (secao): secao is HTMLElement => Boolean(secao),
    );

    this.observadorSecoes = new IntersectionObserver(
      (entradas) => {
        const secaoVisivel = entradas
          .filter((entrada) => entrada.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!secaoVisivel?.target.id) return;

        this.zona.run(() => {
          this.secaoAtiva = secaoVisivel.target.id;
        });
      },
      { rootMargin: '-18% 0px -62%', threshold: [0.08, 0.25, 0.5] },
    );

    secoes.forEach((secao) => this.observadorSecoes?.observe(secao));
  }

  private prefereMovimentoReduzido(): boolean {
    return this.estaNoNavegador && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
