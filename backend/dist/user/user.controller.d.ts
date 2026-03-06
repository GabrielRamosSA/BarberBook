import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import type { Request } from 'express';
export declare class UserController {
    private userService;
    constructor(userService: UserService);
    getProfile(req: Request): Promise<{
        nome: string;
        email: string;
        telefone: string | null;
        tipo: import("@prisma/client").$Enums.UserType;
        id: string;
        plano: import("@prisma/client").$Enums.Plano;
        avatar: string | null;
        createdAt: Date;
    }>;
    updateProfile(req: Request, dto: UpdateUserDto): Promise<{
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
    uploadAvatar(req: Request, file: Express.Multer.File): Promise<{
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
    deleteAvatar(req: Request): Promise<{
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
    deleteProfile(req: Request): Promise<{
        message: string;
    }>;
    updatePlano(req: Request, plano: string): Promise<{
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
    getPlanoLimites(req: Request): Promise<{
        plano: any;
        limites: {
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
        } | {
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
        } | {
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
    }>;
}
