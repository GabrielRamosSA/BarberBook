import { PagamentoService } from './pagamento.service';
import type { Request, Response } from 'express';
export declare class PagamentoController {
    private pagamentoService;
    constructor(pagamentoService: PagamentoService);
    retorno(res: Response): void;
    assinar(req: Request, body: {
        plano: string;
        email: string;
        card_token_id: string;
    }): Promise<{
        status: string;
        subscriptionId: string | undefined;
        message: string;
    }>;
    cancelar(req: Request): Promise<{
        status: string;
        message: string;
        user: {
            nome: string;
            email: string;
            telefone: string | null;
            tipo: import("@prisma/client").$Enums.UserType;
            id: string;
            plano: import("@prisma/client").$Enums.Plano;
            avatar: string | null;
        };
    }>;
    status(req: Request): Promise<{
        plano: import("@prisma/client").$Enums.Plano;
        subscriptionId: string | null;
        subscriptionStatus: string | null;
        planoExpiraEm: Date | null;
        assinaturaAtiva: boolean;
    }>;
    webhook(body: {
        type: string;
        data: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
}
