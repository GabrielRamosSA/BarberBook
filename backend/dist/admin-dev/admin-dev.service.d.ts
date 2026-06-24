import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
export declare class AdminDevService {
    private readonly configService;
    private readonly jwtService;
    private readonly prisma;
    private readonly loginAttempts;
    constructor(configService: ConfigService, jwtService: JwtService, prisma: PrismaService);
    private getEnvList;
    private normalizeIp;
    private resolveClientIp;
    private ensureIpAllowed;
    private checkRateLimit;
    login(username: string, password: string, request?: any): {
        accessToken: string;
        expiresIn: StringValue;
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
    atualizarPlanoBarbeiro(userId: string, plano: string): Promise<{
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
