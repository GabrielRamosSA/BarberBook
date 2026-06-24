import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class PagamentoService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private prisma;
    private readonly logger;
    private client;
    private preApproval;
    private expiracaoTimer;
    private planosPreco;
    constructor(configService: ConfigService, prisma: PrismaService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    private agendarProximaVerificacao;
    private executarVerificacaoExpirados;
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
        planoExpiraEm: Date;
        planoAtual: import("@prisma/client").$Enums.Plano;
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
