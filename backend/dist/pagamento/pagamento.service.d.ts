import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class PagamentoService {
    private configService;
    private prisma;
    private client;
    private preApproval;
    private planosPreco;
    constructor(configService: ConfigService, prisma: PrismaService);
    criarAssinatura(userId: string, data: {
        plano: string;
        email: string;
        card_token_id: string;
    }): Promise<{
        status: string;
        subscriptionId: string | undefined;
        message: string;
    }>;
    cancelarAssinatura(userId: string): Promise<{
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
    consultarAssinatura(userId: string): Promise<{
        plano: import("@prisma/client").$Enums.Plano;
        subscriptionId: string | null;
        subscriptionStatus: string | null;
        planoExpiraEm: Date | null;
        assinaturaAtiva: boolean;
    }>;
    processarWebhook(data: {
        type: string;
        data: {
            id: string;
        };
    }): Promise<{
        ok: boolean;
    }>;
    verificarPlanosExpirados(): Promise<{
        downgraded: number;
    }>;
}
