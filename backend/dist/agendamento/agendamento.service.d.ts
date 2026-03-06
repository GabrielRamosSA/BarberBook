import { PrismaService } from '../prisma/prisma.service';
export declare class AgendamentoService {
    private prisma;
    constructor(prisma: PrismaService);
    contarAgendamentosMes(ownerId: string): Promise<{
        usado: number;
        limite: 30 | -1;
        plano: "BASICO" | "PROFISSIONAL" | "PREMIUM";
    }>;
    create(data: {
        data: string;
        horario: string;
        nomeCliente: string;
        telefoneCliente: string;
        barbeariaId: string;
        barbeiroId: string;
        servicoId: string;
        userId?: string;
    }): Promise<{
        message: string;
        agendamento: {
            barbearia: {
                nome: string;
                telefone: string | null;
                id: string;
                endereco: string;
            };
            barbeiro: {
                nome: string;
                id: string;
                foto: string | null;
            };
            servico: {
                nome: string;
                id: string;
                preco: number;
                duracao: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            data: string;
            barbeariaId: string;
            barbeiroId: string;
            horario: string;
            status: import("@prisma/client").$Enums.AgendamentoStatus;
            nomeCliente: string;
            telefoneCliente: string;
            lembreteEnviado: boolean;
            userId: string | null;
            servicoId: string;
        };
    }>;
    findByUser(userId: string): Promise<({
        barbearia: {
            nome: string;
            telefone: string | null;
            id: string;
            endereco: string;
            slug: string | null;
        };
        barbeiro: {
            nome: string;
            id: string;
            foto: string | null;
        };
        servico: {
            nome: string;
            id: string;
            preco: number;
            duracao: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: string;
        barbeariaId: string;
        barbeiroId: string;
        horario: string;
        status: import("@prisma/client").$Enums.AgendamentoStatus;
        nomeCliente: string;
        telefoneCliente: string;
        lembreteEnviado: boolean;
        userId: string | null;
        servicoId: string;
    })[]>;
    findByBarbearia(barbeariaId: string): Promise<({
        barbeiro: {
            nome: string;
            id: string;
            foto: string | null;
        };
        servico: {
            nome: string;
            id: string;
            preco: number;
            duracao: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: string;
        barbeariaId: string;
        barbeiroId: string;
        horario: string;
        status: import("@prisma/client").$Enums.AgendamentoStatus;
        nomeCliente: string;
        telefoneCliente: string;
        lembreteEnviado: boolean;
        userId: string | null;
        servicoId: string;
    })[]>;
    findByOwner(ownerId: string, data?: string): Promise<({
        user: {
            nome: string;
            telefone: string | null;
            id: string;
            avatar: string | null;
        } | null;
        barbearia: {
            nome: string;
            id: string;
        };
        barbeiro: {
            nome: string;
            id: string;
            foto: string | null;
        };
        servico: {
            nome: string;
            id: string;
            preco: number;
            duracao: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: string;
        barbeariaId: string;
        barbeiroId: string;
        horario: string;
        status: import("@prisma/client").$Enums.AgendamentoStatus;
        nomeCliente: string;
        telefoneCliente: string;
        lembreteEnviado: boolean;
        userId: string | null;
        servicoId: string;
    })[]>;
    updateStatus(id: string, ownerId: string, status: 'CONFIRMADO' | 'CANCELADO' | 'CONCLUIDO'): Promise<{
        message: string;
        agendamento: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            data: string;
            barbeariaId: string;
            barbeiroId: string;
            horario: string;
            status: import("@prisma/client").$Enums.AgendamentoStatus;
            nomeCliente: string;
            telefoneCliente: string;
            lembreteEnviado: boolean;
            userId: string | null;
            servicoId: string;
        };
    }>;
    cancelar(id: string, userId: string): Promise<{
        message: string;
        agendamento: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            data: string;
            barbeariaId: string;
            barbeiroId: string;
            horario: string;
            status: import("@prisma/client").$Enums.AgendamentoStatus;
            nomeCliente: string;
            telefoneCliente: string;
            lembreteEnviado: boolean;
            userId: string | null;
            servicoId: string;
        };
    }>;
    findByTelefone(telefone: string): Promise<({
        barbearia: {
            nome: string;
            telefone: string | null;
            id: string;
            endereco: string;
            slug: string | null;
        };
        barbeiro: {
            nome: string;
            id: string;
            foto: string | null;
        };
        servico: {
            nome: string;
            id: string;
            preco: number;
            duracao: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: string;
        barbeariaId: string;
        barbeiroId: string;
        horario: string;
        status: import("@prisma/client").$Enums.AgendamentoStatus;
        nomeCliente: string;
        telefoneCliente: string;
        lembreteEnviado: boolean;
        userId: string | null;
        servicoId: string;
    })[]>;
    cancelarPorTelefone(id: string, telefone: string): Promise<{
        message: string;
        agendamento: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            data: string;
            barbeariaId: string;
            barbeiroId: string;
            horario: string;
            status: import("@prisma/client").$Enums.AgendamentoStatus;
            nomeCliente: string;
            telefoneCliente: string;
            lembreteEnviado: boolean;
            userId: string | null;
            servicoId: string;
        };
    }>;
    findClientesByOwner(ownerId: string): Promise<any[]>;
    horariosOcupados(barbeiroId: string, data: string): Promise<string[]>;
    findLembretesPendentes(ownerId: string): Promise<any[]>;
    marcarLembreteEnviado(id: string, ownerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        data: string;
        barbeariaId: string;
        barbeiroId: string;
        horario: string;
        status: import("@prisma/client").$Enums.AgendamentoStatus;
        nomeCliente: string;
        telefoneCliente: string;
        lembreteEnviado: boolean;
        userId: string | null;
        servicoId: string;
    }>;
}
