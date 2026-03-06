export declare class EmailService {
    private transporter;
    constructor();
    sendVerificationCode(to: string, code: string, nome: string): Promise<boolean>;
    generateCode(): string;
    sendPasswordResetEmail(to: string, token: string, nome: string): Promise<boolean>;
}
