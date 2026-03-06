import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../auth/auth.service';
import * as L from 'leaflet';

interface FotoPreview {
  file: File;
  url: string;
}

interface BarbeiroForm {
  id?: string;
  nome: string;
  foto: File | null;
  fotoPreview: string;
  fotoUrl?: string;
  horarios: HorarioDia[];
  servicos: ServicoForm[];
  salvo: boolean;
}

interface ServicoForm {
  id?: string;
  nome: string;
  preco: number | null;
  precoDisplay: string;
  duracao: number | null;
}

interface HorarioDia {
  diaSemana: number;
  label: string;
  ativo: boolean;
  horaInicio: string;
  horaFim: string;
  temAlmoco: boolean;
  almocoInicio: string;
  almocoFim: string;
}

const DIAS_SEMANA = [
  { dia: 1, label: 'Segunda-feira' },
  { dia: 2, label: 'Terça-feira' },
  { dia: 3, label: 'Quarta-feira' },
  { dia: 4, label: 'Quinta-feira' },
  { dia: 5, label: 'Sexta-feira' },
  { dia: 6, label: 'Sábado' },
  { dia: 0, label: 'Domingo' },
];

@Component({
  selector: 'app-barbearia-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './barbearia-form.html',
  styleUrl: './barbearia-form.scss',
})
export class BarbeariaFormComponent implements OnInit, AfterViewInit, OnDestroy {
  // Modo edição
  editando = false;
  barbeariaId = '';
  carregandoDados = false;

  // Dados da barbearia
  nome = '';
  descricao = '';
  endereco = '';
  pontoReferencia = '';
  cidade = '';
  estado = '';
  cep = '';
  telefone = '';
  whatsapp = '';
  mensagemLembrete = '';
  lembreteAtivo = false;

  // Mapa / Geolocalização
  latitude: number | null = null;
  longitude: number | null = null;
  buscandoEndereco = false;
  private mapa: L.Map | null = null;
  private marcador: L.Marker | null = null;
  private mapaInicializado = false;

  // Fotos da barbearia
  fotos: FotoPreview[] = [];
  fotosExistentes: string[] = [];
  dragging = false;

  // Barbeiros (contém serviços dentro)
  barbeiros: BarbeiroForm[] = [];
  private originalBarbeiroIds: string[] = [];
  private originalServicoIds: string[] = [];

  // Estado
  erro = '';
  carregando = false;
  etapaTexto = '';

  // Plano do usuário
  planoUsuario: string = 'BASICO';

  get lembretePermitido(): boolean {
    return this.planoUsuario === 'PROFISSIONAL' || this.planoUsuario === 'PREMIUM';
  }

  get fotosBarbeirosPermitido(): boolean {
    return this.planoUsuario === 'PROFISSIONAL' || this.planoUsuario === 'PREMIUM';
  }

  get maxBarbeiros(): number {
    const limites: Record<string, number> = { BASICO: 2, PROFISSIONAL: 5, PREMIUM: -1 };
    return limites[this.planoUsuario] ?? 2;
  }

  get limiteBarbieroAtingido(): boolean {
    return this.maxBarbeiros !== -1 && this.barbeiros.length >= this.maxBarbeiros;
  }

  maxServicosPorBarbeiro(): number {
    const limites: Record<string, number> = { BASICO: 3, PROFISSIONAL: 10, PREMIUM: -1 };
    return limites[this.planoUsuario] ?? 3;
  }

  limiteServicoAtingido(barbeiroIndex: number): boolean {
    const max = this.maxServicosPorBarbeiro();
    return max !== -1 && this.barbeiros[barbeiroIndex].servicos.length >= max;
  }

  private apiUrl = '/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    // Carregar plano do usuário
    const user = this.authService.currentUser;
    if (user?.plano) {
      this.planoUsuario = user.plano;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editando = true;
      this.barbeariaId = id;

      // Verificar se a barbearia está dentro do limite do plano
      this.verificarLimiteBarbearia(id);

      this.carregarBarbearia();
    }
  }

  private verificarLimiteBarbearia(barbeariaId: string) {
    const limites: Record<string, number> = { BASICO: 1, PROFISSIONAL: 3, PREMIUM: -1 };
    const max = limites[this.planoUsuario] ?? 1;
    if (max === -1) return;

    this.http.get<any[]>(`${this.apiUrl}/barbearias/owner/me`).subscribe({
      next: (barbearias) => {
        if (barbearias.length <= max) return;
        // Ordenadas por createdAt desc — as mais antigas (últimas) são as permitidas
        // Inverter para asc e pegar as primeiras N como permitidas
        const permitidas = [...barbearias].reverse().slice(0, max).map((b) => b.id);
        if (!permitidas.includes(barbeariaId)) {
          this.router.navigate(['/dashboard/barbearias']);
        }
      },
    });
  }

  ngAfterViewInit() {
    // Delay to ensure DOM is ready
    setTimeout(() => this.inicializarMapa(), 300);
  }

  ngOnDestroy() {
    if (this.mapa) {
      this.mapa.remove();
      this.mapa = null;
    }
  }

  // ==============================
  // Mapa Leaflet
  // ==============================
  private inicializarMapa() {
    if (this.mapaInicializado) return;
    const container = document.getElementById('mapa-barbearia');
    if (!container) return;

    // Fix Leaflet default icon paths
    const iconDefault = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = iconDefault;

    const lat = this.latitude || -14.235;
    const lng = this.longitude || -51.9253;
    const zoom = this.latitude ? 16 : 4;

    this.mapa = L.map('mapa-barbearia', {
      center: [lat, lng],
      zoom,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.mapa);

    // Se já tem coordenadas (edit mode), coloca marcador
    if (this.latitude && this.longitude) {
      this.marcador = L.marker([this.latitude, this.longitude], { draggable: true }).addTo(this.mapa);
      this.marcador.on('dragend', () => {
        const pos = this.marcador!.getLatLng();
        this.latitude = pos.lat;
        this.longitude = pos.lng;
      });
    }

    // Click no mapa para colocar marcador
    this.mapa.on('click', (e: L.LeafletMouseEvent) => {
      this.latitude = e.latlng.lat;
      this.longitude = e.latlng.lng;

      if (this.marcador) {
        this.marcador.setLatLng(e.latlng);
      } else {
        this.marcador = L.marker(e.latlng, { draggable: true }).addTo(this.mapa!);
        this.marcador.on('dragend', () => {
          const pos = this.marcador!.getLatLng();
          this.latitude = pos.lat;
          this.longitude = pos.lng;
        });
      }
    });

    this.mapaInicializado = true;
  }

  buscarEndereco() {
    const query = `${this.endereco}, ${this.cidade}, ${this.estado}, Brasil`;
    this.buscandoEndereco = true;

    this.http
      .get<any[]>(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: query,
          format: 'json',
          limit: '1',
          countrycodes: 'br',
        },
        headers: {
          'Accept-Language': 'pt-BR',
        },
      })
      .subscribe({
        next: (results) => {
          this.buscandoEndereco = false;
          if (results && results.length > 0) {
            const r = results[0];
            this.latitude = parseFloat(r.lat);
            this.longitude = parseFloat(r.lon);

            if (this.mapa) {
              this.mapa.setView([this.latitude!, this.longitude!], 17);

              if (this.marcador) {
                this.marcador.setLatLng([this.latitude!, this.longitude!]);
              } else {
                this.marcador = L.marker([this.latitude!, this.longitude!], { draggable: true }).addTo(this.mapa);
                this.marcador.on('dragend', () => {
                  const pos = this.marcador!.getLatLng();
                  this.latitude = pos.lat;
                  this.longitude = pos.lng;
                });
              }
            }
          } else {
            alert('Endereço não encontrado. Tente ser mais específico ou marque diretamente no mapa.');
          }
        },
        error: () => {
          this.buscandoEndereco = false;
          alert('Erro ao buscar endereço. Tente novamente.');
        },
      });
  }

  carregarBarbearia() {
    this.carregandoDados = true;
    this.http.get<any>(`${this.apiUrl}/barbearias/${this.barbeariaId}`).subscribe({
      next: (b) => {
        this.nome = b.nome || '';
        this.descricao = b.descricao || '';
        this.endereco = b.endereco || '';
        this.pontoReferencia = b.pontoReferencia || '';
        this.cidade = b.cidade || '';
        this.estado = b.estado || '';
        this.cep = b.cep || '';
        this.telefone = b.telefone || '';
        this.whatsapp = b.whatsapp || '';
        this.mensagemLembrete = b.mensagemLembrete || '';
        this.lembreteAtivo = b.lembreteAtivo || false;
        this.latitude = b.latitude || null;
        this.longitude = b.longitude || null;
        this.fotosExistentes = b.fotos || [];

        // Inicializar mapa com coordenadas carregadas
        if (this.latitude && this.longitude && this.mapa) {
          this.mapa.setView([this.latitude, this.longitude], 16);
          if (this.marcador) {
            this.marcador.setLatLng([this.latitude, this.longitude]);
          } else {
            this.marcador = L.marker([this.latitude, this.longitude], { draggable: true }).addTo(this.mapa);
            this.marcador.on('dragend', () => {
              const pos = this.marcador!.getLatLng();
              this.latitude = pos.lat;
              this.longitude = pos.lng;
            });
          }
        }

        // Carregar barbeiros
        if (b.barbeiros && b.barbeiros.length > 0) {
          this.barbeiros = b.barbeiros.map((barb: any) => {
            const horarios = this.criarHorariosPadrao();
            // Preencher horários existentes
            if (barb.horarios) {
              for (const h of barb.horarios) {
                const dia = horarios.find((d) => d.diaSemana === h.diaSemana);
                if (dia) {
                  dia.ativo = true;
                  dia.horaInicio = h.horaInicio;
                  dia.horaFim = h.horaFim;
                  if (h.almocoInicio && h.almocoFim) {
                    dia.temAlmoco = true;
                    dia.almocoInicio = h.almocoInicio;
                    dia.almocoFim = h.almocoFim;
                  }
                }
              }
            }

            // Carregar serviços do barbeiro
            const servicos: ServicoForm[] = (barb.servicos || []).map((s: any) => ({
              id: s.id,
              nome: s.nome,
              preco: s.preco,
              precoDisplay: this.formatarPrecoDisplay(s.preco),
              duracao: s.duracao,
            }));

            return {
              id: barb.id,
              nome: barb.nome,
              foto: null,
              fotoPreview: barb.foto ? `${barb.foto}` : '',
              fotoUrl: barb.foto || undefined,
              horarios,
              servicos,
              salvo: true,
            } as BarbeiroForm;
          });
          this.originalBarbeiroIds = b.barbeiros.map((barb: any) => barb.id);
          this.originalServicoIds = b.barbeiros
            .flatMap((barb: any) => barb.servicos || [])
            .map((s: any) => s.id);
        }

        this.carregandoDados = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar dados da barbearia.';
        this.carregandoDados = false;
      },
    });
  }

  get formValido(): boolean {
    return (
      this.nome.trim().length > 0 &&
      this.endereco.trim().length > 0 &&
      this.cidade.trim().length > 0 &&
      this.estado.trim().length > 0
    );
  }

  // ==============================
  // Fotos / Drag & Drop
  // ==============================
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragging = false;
    if (event.dataTransfer?.files) {
      this.addFiles(event.dataTransfer.files);
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(input.files);
      input.value = '';
    }
  }

  addFiles(fileList: FileList) {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!allowed.includes(file.type)) continue;
      if (file.size > 5 * 1024 * 1024) continue;
      if (this.fotos.length >= 10) break;
      this.fotos.push({ file, url: URL.createObjectURL(file) });
    }
  }

  removeFoto(index: number) {
    URL.revokeObjectURL(this.fotos[index].url);
    this.fotos.splice(index, 1);
  }

  // ==============================
  // Barbeiros
  // ==============================
  adicionarBarbeiro() {
    if (this.limiteBarbieroAtingido) return;
    this.barbeiros.push({
      nome: '',
      foto: null,
      fotoPreview: '',
      horarios: this.criarHorariosPadrao(),
      servicos: [],
      salvo: false,
    });
  }

  removerBarbeiro(index: number) {
    if (this.barbeiros[index].fotoPreview) {
      URL.revokeObjectURL(this.barbeiros[index].fotoPreview);
    }
    this.barbeiros.splice(index, 1);
  }

  salvarBarbeiro(index: number) {
    const b = this.barbeiros[index];
    if (!b.nome.trim()) return;
    b.salvo = true;
  }

  editarBarbeiro(index: number) {
    this.barbeiros[index].salvo = false;
  }

  cancelarBarbeiro(index: number) {
    // Se não tem nome, remove. Se já tinha salvo antes, volta ao estado salvo.
    const b = this.barbeiros[index];
    if (!b.nome.trim()) {
      this.removerBarbeiro(index);
    } else {
      b.salvo = true;
    }
  }

  onBarbeiroFoto(event: Event, index: number) {
    if (!this.fotosBarbeirosPermitido) return;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (this.barbeiros[index].fotoPreview) {
        URL.revokeObjectURL(this.barbeiros[index].fotoPreview);
      }
      this.barbeiros[index].foto = file;
      this.barbeiros[index].fotoPreview = URL.createObjectURL(file);
      input.value = '';
    }
  }

  removerBarbeiroFoto(index: number) {
    if (this.barbeiros[index].fotoPreview) {
      URL.revokeObjectURL(this.barbeiros[index].fotoPreview);
    }
    this.barbeiros[index].foto = null;
    this.barbeiros[index].fotoPreview = '';
  }

  criarHorariosPadrao(): HorarioDia[] {
    return DIAS_SEMANA.map((d) => ({
      diaSemana: d.dia,
      label: d.label,
      ativo: d.dia >= 1 && d.dia <= 5,
      horaInicio: '09:00',
      horaFim: '18:00',
      temAlmoco: false,
      almocoInicio: '12:00',
      almocoFim: '13:00',
    }));
  }

  // Resumo dos dias ativos para o card colapsado
  resumoDias(barbeiro: BarbeiroForm): string {
    const ativos = barbeiro.horarios.filter((h) => h.ativo);
    if (ativos.length === 0) return 'Sem horários';
    if (ativos.length === 7) return 'Todos os dias';
    const abrev: Record<number, string> = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' };
    return ativos.map((h) => abrev[h.diaSemana]).join(', ');
  }

  // ==============================
  // Alerta de limite do plano
  // ==============================
  alertaPlano = '';
  mostrarAlertaPlano(msg: string) {
    this.alertaPlano = msg;
    setTimeout(() => this.alertaPlano = '', 4000);
  }

  // ==============================
  // Serviços (dentro do barbeiro)
  // ==============================
  adicionarServico(barbeiroIndex: number) {
    if (this.limiteServicoAtingido(barbeiroIndex)) return;
    this.barbeiros[barbeiroIndex].servicos.push({
      nome: '',
      preco: null,
      precoDisplay: '0,00',
      duracao: 30,
    });
  }

  removerServico(barbeiroIndex: number, servicoIndex: number) {
    this.barbeiros[barbeiroIndex].servicos.splice(servicoIndex, 1);
  }

  // ==============================
  // Máscara de preço (estilo PIX)
  // ==============================
  onPrecoInput(value: string, barbeiroIndex: number, servicoIndex: number) {
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '');
    // Converte para centavos
    const centavos = parseInt(digits || '0', 10);
    // Formata como reais
    const reais = (centavos / 100).toFixed(2).replace('.', ',');

    const servico = this.barbeiros[barbeiroIndex].servicos[servicoIndex];
    servico.precoDisplay = reais;
    servico.preco = centavos / 100;
  }

  private formatarPrecoDisplay(preco: number | null): string {
    if (!preco && preco !== 0) return '0,00';
    return preco.toFixed(2).replace('.', ',');
  }

  // ==============================
  // Lembrete WhatsApp
  // ==============================
  placeholderLembrete = 'Olá {nome}! \u{1F60A} Lembrete: você tem um agendamento de {servico} hoje às {horario} na {barbearia}. Te esperamos!';

  variaveisDisponiveis = [
    { tag: '{nome}', label: '\u007Bnome\u007D' },
    { tag: '{servico}', label: '\u007Bservico\u007D' },
    { tag: '{horario}', label: '\u007Bhorario\u007D' },
    { tag: '{data}', label: '\u007Bdata\u007D' },
    { tag: '{barbearia}', label: '\u007Bbarbearia\u007D' },
    { tag: '{barbeiro}', label: '\u007Bbarbeiro\u007D' },
  ];

  inserirVariavel(variavel: string) {
    this.mensagemLembrete += variavel;
  }

  previewMensagem(): string {
    return this.mensagemLembrete
      .replace(/{nome}/g, 'João Silva')
      .replace(/{servico}/g, 'Corte masculino')
      .replace(/{horario}/g, '14:30')
      .replace(/{data}/g, '05/03/2026')
      .replace(/{barbearia}/g, this.nome || 'Minha Barbearia')
      .replace(/{barbeiro}/g, this.barbeiros[0]?.nome || 'Carlos');
  }

  // ==============================
  // Submit
  // ==============================
  onSubmit() {
    if (!this.formValido) return;

    this.carregando = true;
    this.erro = '';

    const dados: any = {
      nome: this.nome,
      descricao: this.descricao || undefined,
      endereco: this.endereco,
      pontoReferencia: this.pontoReferencia || undefined,
      cidade: this.cidade,
      estado: this.estado,
      cep: this.cep || undefined,
      telefone: this.telefone || undefined,
      whatsapp: this.whatsapp || undefined,
      mensagemLembrete: this.lembretePermitido ? (this.mensagemLembrete || undefined) : undefined,
      lembreteAtivo: this.lembretePermitido ? this.lembreteAtivo : false,
      latitude: this.latitude || undefined,
      longitude: this.longitude || undefined,
    };

    if (this.editando) {
      this.etapaTexto = 'Salvando alterações...';
      this.http.put<any>(`${this.apiUrl}/barbearias/${this.barbeariaId}`, dados).subscribe({
        next: () => {
          this.salvarRecursosAdicionais(this.barbeariaId);
        },
        error: (err) => {
          this.carregando = false;
          this.erro = err.error?.message || 'Erro ao atualizar barbearia.';
        },
      });
    } else {
      this.etapaTexto = 'Criando barbearia...';
      this.http.post<any>(`${this.apiUrl}/barbearias`, dados).subscribe({
        next: (res) => {
          const barbeariaId = res.barbearia.id;
          this.salvarRecursosAdicionais(barbeariaId);
        },
        error: (err) => {
          this.carregando = false;
          this.erro = err.error?.message || 'Erro ao criar barbearia.';
        },
      });
    }
  }

  private async salvarRecursosAdicionais(barbeariaId: string) {
    const errosPlano: string[] = [];

    try {
      // Upload fotos da barbearia
      if (this.fotos.length > 0) {
        this.etapaTexto = 'Enviando fotos...';
        const formData = new FormData();
        this.fotos.forEach((f) => formData.append('fotos', f.file));
        await this.http.post(`${this.apiUrl}/barbearias/${barbeariaId}/fotos`, formData).toPromise().catch(() => {});
      }

      // ====== Modo EDIÇÃO: limpar recursos antigos que foram removidos ======
      if (this.editando) {
        // Deletar serviços que foram removidos
        const currentServicoIds = this.barbeiros
          .flatMap((b) => b.servicos)
          .filter((s) => s.id)
          .map((s) => s.id!);
        const servicosToDelete = this.originalServicoIds.filter((id) => !currentServicoIds.includes(id));
        for (const id of servicosToDelete) {
          await this.http.delete(`${this.apiUrl}/barbearias/${barbeariaId}/servicos/${id}`).toPromise().catch(() => {});
        }

        // Deletar barbeiros que foram removidos
        const currentBarbeiroIds = this.barbeiros.filter((b) => b.id).map((b) => b.id!);
        const barbeirosToDelete = this.originalBarbeiroIds.filter((id) => !currentBarbeiroIds.includes(id));
        for (const id of barbeirosToDelete) {
          await this.http.delete(`${this.apiUrl}/barbearias/${barbeariaId}/barbeiros/${id}`).toPromise().catch(() => {});
        }
      }

      // ====== Barbeiros: atualizar existentes e criar novos ======
      const barbeirosValidos = this.barbeiros.filter((b) => b.nome.trim());
      if (barbeirosValidos.length > 0) {
        this.etapaTexto = 'Salvando barbeiros...';
        for (const barbeiro of barbeirosValidos) {

          let barbeiroId: string;

          if (barbeiro.id) {
            // Barbeiro existente — atualizar nome
            barbeiroId = barbeiro.id;
            await this.http.put(`${this.apiUrl}/barbearias/${barbeariaId}/barbeiros/${barbeiroId}`, {
              nome: barbeiro.nome,
            }).toPromise().catch(() => {});
          } else {
            // Barbeiro novo — criar
            try {
              const res: any = await this.http.post(`${this.apiUrl}/barbearias/${barbeariaId}/barbeiros`, {
                nome: barbeiro.nome,
              }).toPromise();
              barbeiroId = res.barbeiro.id;
              barbeiro.id = barbeiroId;
            } catch (err: any) {
              const msg = err?.error?.message || 'Erro ao criar barbeiro.';
              if (!errosPlano.includes(msg)) errosPlano.push(msg);
              continue; // Pula este barbeiro e seus serviços/foto/horários
            }
          }

          // Upload foto do barbeiro (apenas se é um novo File)
          if (barbeiro.foto instanceof File) {
            const fd = new FormData();
            fd.append('foto', barbeiro.foto);
            try {
              await this.http.post(`${this.apiUrl}/barbearias/${barbeariaId}/barbeiros/${barbeiroId}/foto`, fd).toPromise();
            } catch (err: any) {
              const msg = err?.error?.message || 'Erro ao enviar foto do barbeiro.';
              if (!errosPlano.includes(msg)) errosPlano.push(msg);
            }
          }

          // Salvar horários ativos (com almoço)
          const horariosAtivos = barbeiro.horarios
            .filter((h) => h.ativo)
            .map((h) => ({
              diaSemana: h.diaSemana,
              horaInicio: h.horaInicio,
              horaFim: h.horaFim,
              almocoInicio: h.temAlmoco ? h.almocoInicio : undefined,
              almocoFim: h.temAlmoco ? h.almocoFim : undefined,
            }));

          if (horariosAtivos.length > 0) {
            await this.http.put(`${this.apiUrl}/barbeiros/${barbeiroId}/horarios`, {
              horarios: horariosAtivos,
            }).toPromise().catch(() => {});
          }
        }
      }

      // ====== Serviços: atualizar existentes e criar novos (vinculados ao barbeiro) ======
      for (const barbeiro of barbeirosValidos) {
        const barbeiroId = barbeiro.id;
        if (!barbeiroId) {
          continue;
        }

        const servicosValidos = barbeiro.servicos.filter((s) => s.nome.trim() && s.preco && s.duracao);
        if (servicosValidos.length > 0) {
          this.etapaTexto = 'Salvando serviços...';
          for (const servico of servicosValidos) {
            try {
              if (servico.id) {
                // Serviço existente — atualizar
                await this.http.put(`${this.apiUrl}/barbearias/${barbeariaId}/servicos/${servico.id}`, {
                  nome: servico.nome,
                  preco: servico.preco,
                  duracao: servico.duracao,
                  barbeiroId,
                }).toPromise();
              } else {
                // Serviço novo — criar com barbeiroId
                await this.http.post(`${this.apiUrl}/barbearias/${barbeariaId}/servicos`, {
                  nome: servico.nome,
                  preco: servico.preco,
                  duracao: servico.duracao,
                  barbeiroId,
                }).toPromise();
              }
            } catch (err: any) {
              const msg = err?.error?.message || 'Erro ao salvar serviço.';
              if (!errosPlano.includes(msg)) errosPlano.push(msg);
            }
          }
        }
      }

      this.carregando = false;

      if (errosPlano.length > 0) {
        this.erro = errosPlano.join(' | ');
        // Não navegar — mostrar o erro pro usuário
      } else {
        this.router.navigate(['/dashboard/barbearias']);
      }
    } catch (err: any) {
      this.carregando = false;
      const msg = err?.error?.message || '';
      if (msg) {
        this.erro = msg;
      } else {
        this.router.navigate(['/dashboard/barbearias']);
      }
    }
  }
}
