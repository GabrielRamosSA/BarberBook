import { Component, HostListener, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../auth/auth.service';

@Component({
  selector: 'app-pag-inicial',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './pag-inicial.html',
  styleUrl: './pag-inicial.scss',
  encapsulation: ViewEncapsulation.None,
})
export class PaginaInicial implements OnInit {
  private readonly CHAVE_STORAGE_ULTIMO_TELEFONE = 'barberbook:last-phone';
  private readonly SECOES_MENU = ['inicio', 'beneficios', 'inovacao', 'planos', 'final'];

  usuario: User | null = null;
  menuAberto = false;
  secaoAtiva = 'inicio';

  modalTelefoneAberto = false;
  telefoneConsulta = '';
  consultandoTelefone = false;
  erroConsulta = '';

  constructor(
    private clienteHttp: HttpClient,
    private servicoAuth: AuthService,
    private roteador: Router,
  ) {}

  ngOnInit() {
    this.servicoAuth.user$.subscribe((usuario) => {
      this.usuario = usuario;
    });

    if (this.servicoAuth.isLoggedIn() && !this.usuario) {
      this.servicoAuth.loadUser();
    }

    if (typeof window !== 'undefined') {
      setTimeout(() => this.atualizarSecaoAtiva(), 0);
    }
  }

  rolarParaSecao(idSecao: string, event?: Event) {
    event?.preventDefault();

    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const alvo = document.getElementById(idSecao);
    if (!alvo) return;

    const cabecalho = document.querySelector('.cabecalho-pagina') as HTMLElement | null;
    const alturaCabecalho = cabecalho?.offsetHeight ?? 0;
    const deslocamento = 18;
    const topo = alvo.getBoundingClientRect().top + window.scrollY - alturaCabecalho - deslocamento;

    window.scrollTo({
      top: Math.max(topo, 0),
      behavior: 'smooth',
    });

    this.secaoAtiva = idSecao;
  }

  secaoEstaAtiva(idSecao: string): boolean {
    return this.secaoAtiva === idSecao;
  }

  @HostListener('window:scroll')
  aoRolarJanela() {
    this.atualizarSecaoAtiva();
  }

  private atualizarSecaoAtiva() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const cabecalho = document.querySelector('.cabecalho-pagina') as HTMLElement | null;
    const alturaCabecalho = cabecalho?.offsetHeight ?? 0;
    const posicaoCursor = window.scrollY + alturaCabecalho + 40;

    let secaoAtual = this.SECOES_MENU[0];

    for (const idSecao of this.SECOES_MENU) {
      const secao = document.getElementById(idSecao);
      if (!secao) continue;

      if (secao.offsetTop <= posicaoCursor) {
        secaoAtual = idSecao;
      }
    }

    this.secaoAtiva = secaoAtual;
  }

  alternarMenu() {
    this.menuAberto = !this.menuAberto;
  }

  @HostListener('document:click', ['$event'])
  aoClicarDocumento(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-usuario')) {
      this.menuAberto = false;
    }
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
    this.modalTelefoneAberto = true;
    this.telefoneConsulta = this.obterTelefoneSalvo();
    this.erroConsulta = '';
  }

  fecharModalTelefone() {
    this.modalTelefoneAberto = false;
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
        this.roteador.navigate(['/meus-agendamentos'], { queryParams: { telefone: telefoneLimpo } });
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
}
