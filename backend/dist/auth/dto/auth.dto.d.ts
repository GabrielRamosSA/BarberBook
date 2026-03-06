export declare enum UserType {
    CLIENTE = "CLIENTE",
    BARBEIRO = "BARBEIRO"
}
export declare class RegisterDto {
    nome: string;
    email: string;
    senha: string;
    telefone?: string;
    tipo?: UserType;
}
export declare class LoginDto {
    email: string;
    senha: string;
}
export declare class VerifyEmailDto {
    email: string;
    code: string;
}
export declare class ResendCodeDto {
    email: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
    novaSenha: string;
}
