export declare enum UserType {
    CLIENTE = "CLIENTE",
    BARBEIRO = "BARBEIRO"
}
export declare class UpdateUserDto {
    nome?: string;
    telefone?: string;
    tipo?: UserType;
    avatar?: string;
}
