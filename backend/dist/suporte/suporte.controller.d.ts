import type { Request } from 'express';
import { SuporteService } from './suporte.service';
export declare class SuporteController {
    private readonly suporteService;
    constructor(suporteService: SuporteService);
    status(req: Request): Promise<{
        plano: import("@prisma/client").$Enums.Plano;
        suporteIaDisponivel: boolean;
        canal: string;
        fallbackEmail: string;
    }>;
    fallbackEmail(req: Request, body: {
        assunto: string;
        mensagem: string;
    }): Promise<{
        ok: boolean;
        message: string;
    }>;
}
