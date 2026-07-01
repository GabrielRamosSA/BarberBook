import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, VerifyEmailDto, ResendCodeDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import type { Request, Response } from 'express';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    private getCookieOptions;
    private getClearCookieOptions;
    checkEmail(email: string): Promise<{
        exists: boolean;
        valid: boolean;
        reason: string;
    } | {
        exists: boolean;
        valid: boolean;
        reason: null;
    }>;
    register(dto: RegisterDto): Promise<{
        message: string;
        requiresVerification: boolean;
        email: string;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        message: string;
        user: {
            id: string;
            nome: string;
            email: string;
            telefone: string | null;
            tipo: import("@prisma/client").$Enums.UserType;
            plano: import("@prisma/client").$Enums.Plano;
            avatar: string | null;
        };
        access_token: string;
    }>;
    resendCode(dto: ResendCodeDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto, res: Response): Promise<{
        message: string;
        user: {
            id: string;
            nome: string;
            email: string;
            telefone: string | null;
            tipo: import("@prisma/client").$Enums.UserType;
            plano: import("@prisma/client").$Enums.Plano;
            avatar: string | null;
        } | undefined;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    googleAuth(): Promise<void>;
    googleAuthCallback(req: Request, res: Response): Promise<void>;
    getMe(req: Request): Promise<Express.User | undefined>;
    logout(res: Response): Promise<{
        message: string;
    }>;
}
