import { PrismaService } from '../prisma/prisma.service';
export declare class ServicoService {
    private prisma;
    constructor(prisma: PrismaService);
    private verificarDono;
    create(barbeariaId: string, ownerId: string, data: {
        nome: string;
        preco: number;
        duracao: number;
        barbeiroId?: string;
    }): Promise<{
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
    findByBarbearia(barbeariaId: string): Promise<{
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
    update(id: string, ownerId: string, data: {
        nome?: string;
        preco?: number;
        duracao?: number;
        ativo?: boolean;
        barbeiroId?: string;
    }): Promise<{
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
    delete(id: string, ownerId: string): Promise<{
        message: string;
    }>;
}
