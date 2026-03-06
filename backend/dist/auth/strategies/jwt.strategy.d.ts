import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(configService: ConfigService, prisma: PrismaService);
    validate(payload: {
        sub: string;
        email: string;
        tipo: string;
    }): Promise<{
        id: string;
        nome: string;
        email: string;
        telefone: string | null;
        tipo: import("@prisma/client").$Enums.UserType;
        plano: import("@prisma/client").$Enums.Plano;
        avatar: string | null;
    } | null>;
}
export {};
