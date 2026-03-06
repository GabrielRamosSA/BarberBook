import { HorarioService } from './horario.service';
import type { Request } from 'express';
export declare class HorarioController {
    private horarioService;
    constructor(horarioService: HorarioService);
    findAll(barbeiroId: string): Promise<{
        id: string;
        diaSemana: number;
        barbeiroId: string;
        horaInicio: string;
        horaFim: string;
        almocoInicio: string | null;
        almocoFim: string | null;
    }[]>;
    setHorarios(barbeiroId: string, body: {
        horarios: {
            diaSemana: number;
            horaInicio: string;
            horaFim: string;
            almocoInicio?: string;
            almocoFim?: string;
        }[];
    }, req: Request): Promise<{
        message: string;
        horarios: {
            id: string;
            diaSemana: number;
            barbeiroId: string;
            horaInicio: string;
            horaFim: string;
            almocoInicio: string | null;
            almocoFim: string | null;
        }[];
    }>;
}
