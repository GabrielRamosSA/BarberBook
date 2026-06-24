import { Component, OnInit, OnDestroy, ViewEncapsulation, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../auth/auth.service';

interface Estado {
  nome: string;
  sigla: string;
}

interface Cidade {
  nome: string;
  estado: string;
}

@Component({
  selector: 'app-barbearias-busca',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './barbearias-busca.html',
  styleUrl: './barbearias-busca.scss',
  encapsulation: ViewEncapsulation.None,
})
export class BarbeariasBuscaComponent implements OnInit, OnDestroy {
  private readonly CHAVE_STORAGE_ULTIMO_TELEFONE = 'barberbook:last-phone';

  estados: Estado[] = [];
  cidadesFiltradas: Cidade[] = [];

  estadoSelecionado: Estado | null = null;
  cidadeSelecionada: Cidade | null = null;

  estadoAberto = false;
  cidadeAberta = false;
  filtroEstado = '';
  filtroCidade = '';

  // Barbearias
  barbearias: any[] = [];
  buscandoBarbearias = false;
  buscaRealizada = false;
  private intervalosCarrossel: Map<string, any> = new Map();

  usuario: User | null = null;
  menuAberto = false;

  // Modal telefone (consulta de agendamentos para clientes sem conta)
  modalTelefoneAberto = false;
  telefoneConsulta = '';
  consultandoTelefone = false;
  erroConsulta = '';

  private urlApi = '/api/barbearias';

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

    this.clienteHttp
      .get<any[]>('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .subscribe((dados) => {
        this.estados = dados.map((estado) => ({
          nome: estado.nome,
          sigla: estado.sigla,
        }));
      });
  }

  // ==============================
  // Estado dropdown
  // ==============================
  alternarEstado() {
    this.estadoAberto = !this.estadoAberto;
    this.cidadeAberta = false;
    if (this.estadoAberto) {
      this.filtroEstado = '';
    }
  }

  get listaEstadosFiltrados(): Estado[] {
    if (!this.filtroEstado.trim()) return this.estados;
    const termo = this.filtroEstado.toLowerCase();
    return this.estados.filter((estado) => estado.nome.toLowerCase().includes(termo));
  }

  selecionarEstado(estado: Estado) {
    this.estadoSelecionado = estado;
    this.estadoAberto = false;
    this.filtroEstado = '';

    // Reset cidade
    this.cidadeSelecionada = null;
    this.cidadesFiltradas = [];

    this.clienteHttp
      .get<any[]>(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado.sigla}/municipios?orderBy=nome`
      )
      .subscribe((dados) => {
        this.cidadesFiltradas = dados.map((cidade) => ({
          nome: cidade.nome,
          estado: estado.sigla,
        }));
      });
  }

  limparEstado(event: Event) {
    event.stopPropagation();
    this.estadoSelecionado = null;
    this.cidadeSelecionada = null;
    this.cidadesFiltradas = [];
    this.estadoAberto = false;
    this.barbearias = [];
    this.buscaRealizada = false;
  }

  // ==============================
  // Cidade dropdown
  // ==============================
  alternarCidade() {
    if (!this.estadoSelecionado) return;
    this.cidadeAberta = !this.cidadeAberta;
    this.estadoAberto = false;
    if (this.cidadeAberta) {
      this.filtroCidade = '';
    }
  }

  get listaCidadesFiltradas(): Cidade[] {
    if (!this.filtroCidade.trim()) return this.cidadesFiltradas;
    const termo = this.filtroCidade.toLowerCase();
    return this.cidadesFiltradas.filter((cidade) => cidade.nome.toLowerCase().includes(termo));
  }

  selecionarCidade(cidade: Cidade) {
    this.cidadeSelecionada = cidade;
    this.cidadeAberta = false;
    this.filtroCidade = '';
    this.buscarBarbearias();
  }

  limparCidade(event: Event) {
    event.stopPropagation();
    this.cidadeSelecionada = null;
    this.cidadeAberta = false;
    this.barbearias = [];
    this.buscaRealizada = false;
  }

  // ==============================
  // Buscar barbearias
  // ==============================
  buscarBarbearias() {
    if (!this.estadoSelecionado || !this.cidadeSelecionada) return;

    this.buscandoBarbearias = true;
    this.buscaRealizada = false;

    this.clienteHttp
      .get<any[]>(`${this.urlApi}/search`, {
        params: {
          estado: this.estadoSelecionado.sigla,
          cidade: this.cidadeSelecionada.nome,
        },
      })
      .subscribe({
        next: (dados) => {
          setTimeout(() => {
            this.barbearias = dados;
            this.buscandoBarbearias = false;
            this.buscaRealizada = true;
            this.iniciarCarrosseis();
          }, 2000);
        },
        error: () => {
          setTimeout(() => {
            this.barbearias = [];
            this.buscandoBarbearias = false;
            this.buscaRealizada = true;
            this.limparCarrosseis();
          }, 2000);
        },
      });
  }

  obterFotoPrincipal(barbearia: any): string {
    if (barbearia.foto) return barbearia.foto;
    if (barbearia.fotos && barbearia.fotos.length > 0) return barbearia.fotos[0];
    return '';
  }

  obterTodasFotos(barbearia: any): string[] {
    const fotos: string[] = [];
    if (barbearia.foto) fotos.push(barbearia.foto);
    if (barbearia.fotos?.length) fotos.push(...barbearia.fotos);
    return fotos;
  }

  // ==============================
  // Carrossel
  // ==============================
  ngOnDestroy() {
    this.limparCarrosseis();
  }

  iniciarCarrosseis() {
    this.limparCarrosseis();
    for (const barbearia of this.barbearias) {
      barbearia._indiceCarrossel = 0;
      const totalFotos = this.obterTodasFotos(barbearia).length;
      if (totalFotos > 1) {
        const intervalo = setInterval(() => {
          barbearia._indiceCarrossel = ((barbearia._indiceCarrossel || 0) + 1) % totalFotos;
        }, 4000);
        this.intervalosCarrossel.set(barbearia.id, intervalo);
      }
    }
  }

  limparCarrosseis() {
    this.intervalosCarrossel.forEach((intervalo) => clearInterval(intervalo));
    this.intervalosCarrossel.clear();
  }

  carrosselAnterior(barbearia: any, event: Event) {
    event.stopPropagation();
    const total = this.obterTodasFotos(barbearia).length;
    if (total <= 1) return;
    barbearia._indiceCarrossel = ((barbearia._indiceCarrossel || 0) - 1 + total) % total;
    this.reiniciarTimerCarrossel(barbearia);
  }

  carrosselProximo(barbearia: any, event: Event) {
    event.stopPropagation();
    const total = this.obterTodasFotos(barbearia).length;
    if (total <= 1) return;
    barbearia._indiceCarrossel = ((barbearia._indiceCarrossel || 0) + 1) % total;
    this.reiniciarTimerCarrossel(barbearia);
  }

  carrosselIrPara(barbearia: any, indice: number, event: Event) {
    event.stopPropagation();
    barbearia._indiceCarrossel = indice;
    this.reiniciarTimerCarrossel(barbearia);
  }

  private reiniciarTimerCarrossel(barbearia: any) {
    const existente = this.intervalosCarrossel.get(barbearia.id);
    if (existente) clearInterval(existente);
    const total = this.obterTodasFotos(barbearia).length;
    if (total > 1) {
      const intervalo = setInterval(() => {
        barbearia._indiceCarrossel = ((barbearia._indiceCarrossel || 0) + 1) % total;
      }, 4000);
      this.intervalosCarrossel.set(barbearia.id, intervalo);
    }
  }

  // ==============================
  // Cliques globais
  // ==============================
  alternarMenu() {
    this.menuAberto = !this.menuAberto;
  }

  @HostListener('document:click', ['$event'])
  aoClicarDocumento(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-usuario')) {
      this.menuAberto = false;
    }
    if (!target.closest('.seletor-estado')) {
      this.estadoAberto = false;
    }
    if (!target.closest('.seletor-cidade')) {
      this.cidadeAberta = false;
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

  // ==============================
  // Modal telefone
  // ==============================
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
