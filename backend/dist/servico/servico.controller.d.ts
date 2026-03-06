import { ServicoService } from './servico.service';
import type { Request } from 'express';
export declare class ServicoController {
    private servicoService;
    constructor(servicoService: ServicoService);
    findAll(barbeariaId: string): Promise<{
        nome: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        ativo: boolean;
        barbeariaId: string;
        preco: number;
        duracao: number;
        barbeiroId: string | null;
    }[]>;
    create(barbeariaId: string, body: {
        nome: string;
        preco: number;
        duracao: number;
        barbeiroId?: string;
    }, req: Request): Promise<{
        message: string;
        servico: {
            nome: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            ativo: boolean;
            barbeariaId: string;
            preco: number;
            duracao: number;
            barbeiroId: string | null;
        };
    }>;
    update(id: string, body: {
        nome?: string;
        preco?: number;
        duracao?: number;
        ativo?: boolean;
        barbeiroId?: string;
    }, req: Request): Promise<{
        message: string;
        servico: {
            nome: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            ativo: boolean;
            barbeariaId: string;
            preco: number;
            duracao: number;
            barbeiroId: string | null;
        };
    }>;
    delete(id: string, req: Request): Promise<{
        message: string;
    }>;
}
