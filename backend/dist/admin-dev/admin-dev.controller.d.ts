import type { Request } from 'express';
import { AdminDevService } from './admin-dev.service';
export declare class AdminDevController {
    private readonly adminDevService;
    constructor(adminDevService: AdminDevService);
    login(req: Request, body: {
        username: string;
        password: string;
    }): {
        accessToken: string;
        expiresIn: import("ms").StringValue;
    };
    listarContas(tipo?: string): Promise<{
        contas: {
            nome: string;
            email: string;
            telefone: string | null;
            tipo: import("@prisma/client").$Enums.UserType;
            id: string;
            plano: import("@prisma/client").$Enums.Plano;
            createdAt: Date;
        }[];
    }>;
    atualizarPlanoBarbeiro(id: string, body: {
        plano: string;
    }): Promise<{
        message: string;
        conta: {
            nome: string;
            email: string;
            tipo: import("@prisma/client").$Enums.UserType;
            id: string;
            plano: import("@prisma/client").$Enums.Plano;
        };
    }>;
}
