import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class SuporteService {
    private readonly prisma;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, configService: ConfigService);
    private getDadosUsuario;
    getStatus(userId: string): Promise<{
        plano: import("@prisma/client").$Enums.Plano;
        suporteIaDisponivel: boolean;
        canal: string;
        fallbackEmail: string;
    }>;
    enviarFallbackEmail(userId: string, assunto: string, mensagem: string): Promise<{
        ok: boolean;
        message: string;
    }>;
}
