export declare const PLANO_LIMITES: {
    readonly BASICO: {
        readonly maxBarbearias: 1;
        readonly maxBarbeirosPorBarbearia: 2;
        readonly maxServicosPorBarbeiro: 3;
        readonly maxAgendamentosMes: 30;
        readonly gestaoClientes: false;
        readonly lembreteWhatsapp: false;
        readonly mensagemPersonalizada: false;
        readonly historicoMeses: 1;
        readonly fotosBarbeiros: false;
        readonly relatoriosReceita: false;
    };
    readonly PROFISSIONAL: {
        readonly maxBarbearias: 3;
        readonly maxBarbeirosPorBarbearia: 5;
        readonly maxServicosPorBarbeiro: 10;
        readonly maxAgendamentosMes: -1;
        readonly gestaoClientes: true;
        readonly lembreteWhatsapp: true;
        readonly mensagemPersonalizada: false;
        readonly historicoMeses: 6;
        readonly fotosBarbeiros: true;
        readonly relatoriosReceita: false;
    };
    readonly PREMIUM: {
        readonly maxBarbearias: -1;
        readonly maxBarbeirosPorBarbearia: -1;
        readonly maxServicosPorBarbeiro: -1;
        readonly maxAgendamentosMes: -1;
        readonly gestaoClientes: true;
        readonly lembreteWhatsapp: true;
        readonly mensagemPersonalizada: true;
        readonly historicoMeses: -1;
        readonly fotosBarbeiros: true;
        readonly relatoriosReceita: true;
    };
};
export type PlanoType = keyof typeof PLANO_LIMITES;
