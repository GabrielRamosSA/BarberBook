import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<{
        nome: string;
        email: string;
        telefone: string | null;
        tipo: import("@prisma/client").$Enums.UserType;
        id: string;
        plano: import("@prisma/client").$Enums.Plano;
        avatar: string | null;
        createdAt: Date;
    }>;
    update(id: string, dto: UpdateUserDto): Promise<{
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
    updateAvatar(id: string, avatarUrl: string): Promise<{
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
    deleteAvatar(id: string): Promise<{
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
    private removeLocalAvatar;
    delete(id: string): Promise<{
        message: string;
    }>;
    updatePlano(id: string, plano: string): Promise<{
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
    getPlanoLimites(plano: string): {
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
}
