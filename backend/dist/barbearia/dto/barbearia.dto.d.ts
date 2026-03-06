export declare class CreateBarbeariaDto {
    nome: string;
    descricao?: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep?: string;
    pontoReferencia?: string;
    latitude?: number;
    longitude?: number;
    telefone?: string;
    whatsapp?: string;
    mensagemLembrete?: string;
    lembreteAtivo?: boolean;
}
export declare class UpdateBarbeariaDto {
    nome?: string;
    descricao?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    pontoReferencia?: string;
    latitude?: number;
    longitude?: number;
    telefone?: string;
    whatsapp?: string;
    mensagemLembrete?: string;
    lembreteAtivo?: boolean;
    ativa?: boolean;
}
