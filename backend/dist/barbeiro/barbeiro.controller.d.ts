import { BarbeiroService } from './barbeiro.service';
import type { Request } from 'express';
export declare class BarbeiroController {
    private barbeiroService;
    constructor(barbeiroService: BarbeiroService);
    findAll(barbeariaId: string): Promise<({
        servicos: {
            nome: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            ativo: boolean;
            barbeariaId: string;
            preco: number;
            duracao: number;
            barbeiroId: string | null;
        }[];
        horarios: {
            id: string;
            diaSemana: number;
            barbeiroId: string;
            horaInicio: string;
            horaFim: string;
            almocoInicio: string | null;
            almocoFim: string | null;
        }[];
    } & {
        nome: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        foto: string | null;
        ativo: boolean;
        barbeariaId: string;
    })[]>;
    create(barbeariaId: string, body: {
        nome: string;
    }, req: Request): Promise<{
        message: string;
        barbeiro: {
            nome: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            foto: string | null;
            ativo: boolean;
            barbeariaId: string;
        };
    }>;
    update(id: string, body: {
        nome?: string;
        ativo?: boolean;
    }, req: Request): Promise<{
        message: string;
        barbeiro: {
            nome: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            foto: string | null;
            ativo: boolean;
            barbeariaId: string;
        };
    }>;
    uploadFoto(id: string, file: Express.Multer.File, req: Request): Promise<{
        message: string;
        barbeiro: {
            nome: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            foto: string | null;
            ativo: boolean;
            barbeariaId: string;
        };
    }>;
    delete(id: string, req: Request): Promise<{
        message: string;
    }>;
}
