// Configuração dos limites de cada plano
export const PLANO_LIMITES = {
  BASICO: {
    maxBarbearias: 1,
    maxBarbeirosPorBarbearia: 2,
    maxServicosPorBarbeiro: 3,
    maxAgendamentosMes: 30,
    gestaoClientes: false,
    lembreteWhatsapp: false,
    mensagemPersonalizada: false,
    historicoMeses: 1, // 30 dias
    fotosBarbeiros: false,
    relatoriosReceita: false,
  },
  PROFISSIONAL: {
    maxBarbearias: 3,
    maxBarbeirosPorBarbearia: 5,
    maxServicosPorBarbeiro: 10,
    maxAgendamentosMes: -1, // ilimitado
    gestaoClientes: true,
    lembreteWhatsapp: true,
    mensagemPersonalizada: false,
    historicoMeses: 6,
    fotosBarbeiros: true,
    relatoriosReceita: false,
  },
  PREMIUM: {
    maxBarbearias: -1, // ilimitado
    maxBarbeirosPorBarbearia: -1,
    maxServicosPorBarbeiro: -1,
    maxAgendamentosMes: -1,
    gestaoClientes: true,
    lembreteWhatsapp: true,
    mensagemPersonalizada: true,
    historicoMeses: -1, // ilimitado
    fotosBarbeiros: true,
    relatoriosReceita: true,
  },
} as const;

export type PlanoType = keyof typeof PLANO_LIMITES;
