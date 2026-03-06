import { PrismaService } from '../prisma/prisma.service';
export declare class BarbeiroService {
    private prisma;
    constructor(prisma: PrismaService);
    private verificarDono;
    create(barbeariaId: string, ownerId: string, data: {
        nome: string;
    }): Promise<{
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
    findByBarbearia(barbeariaId: string): Promise<({
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
    update(id: string, ownerId: string, data: {
        nome?: string;
        ativo?: boolean;
    }): Promise<{
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
    updateFoto(id: string, ownerId: string, fotoUrl: string): Promise<{
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
    delete(id: string, ownerId: string): Promise<{
        message: string;
    }>;
}
