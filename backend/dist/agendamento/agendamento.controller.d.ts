import { JwtService } from '@nestjs/jwt';
import { AgendamentoService } from './agendamento.service';
import type { Request } from 'express';
export declare class AgendamentoController {
    private agendamentoService;
    private jwtService;
    constructor(agendamentoService: AgendamentoService, jwtService: JwtService);
    create(body: {
        data: string;
        horario: string;
        nomeCliente: string;
        telefoneCliente: string;
        barbeariaId: string;
        barbeiroId: string;
        servicoId: string;
    }, authHeader?: string): Promise<{
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
    meus(req: Request): Promise<({
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
    usoMensal(req: Request): Promise<{
        usado: number;
        limite: 30 | -1;
        plano: "BASICO" | "PROFISSIONAL" | "PREMIUM";
    }>;
    agenda(req: Request, params: any): Promise<({
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
    consultarPorTelefone(req: Request): Promise<({
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
    horariosOcupados(barbeiroId: string, req: Request): Promise<string[]>;
    porBarbearia(barbeariaId: string): Promise<({
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
    updateStatus(id: string, status: 'CONFIRMADO' | 'CANCELADO' | 'CONCLUIDO', req: Request): Promise<{
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
    cancelar(id: string, req: Request): Promise<{
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
    lembretesPendentes(req: Request): Promise<any[]>;
    clientes(req: Request): Promise<any[]>;
    marcarLembreteEnviado(id: string, req: Request): Promise<{
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
