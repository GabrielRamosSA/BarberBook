"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLANO_LIMITES = void 0;
exports.PLANO_LIMITES = {
    BASICO: {
        maxBarbearias: 1,
        maxBarbeirosPorBarbearia: 2,
        maxServicosPorBarbeiro: 3,
        maxAgendamentosMes: 30,
        gestaoClientes: false,
        lembreteWhatsapp: false,
        mensagemPersonalizada: false,
        historicoMeses: 1,
        fotosBarbeiros: false,
        relatoriosReceita: false,
    },
    PROFISSIONAL: {
        maxBarbearias: 3,
        maxBarbeirosPorBarbearia: 5,
        maxServicosPorBarbeiro: 10,
        maxAgendamentosMes: -1,
        gestaoClientes: true,
        lembreteWhatsapp: true,
        mensagemPersonalizada: false,
        historicoMeses: 6,
        fotosBarbeiros: true,
        relatoriosReceita: false,
    },
    PREMIUM: {
        maxBarbearias: -1,
        maxBarbeirosPorBarbearia: -1,
        maxServicosPorBarbeiro: -1,
        maxAgendamentosMes: -1,
        gestaoClientes: true,
        lembreteWhatsapp: true,
        mensagemPersonalizada: true,
        historicoMeses: -1,
        fotosBarbeiros: true,
        relatoriosReceita: true,
    },
};
//# sourceMappingURL=plano.config.js.map