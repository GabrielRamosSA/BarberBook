import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
export declare class AdminDevGuard implements CanActivate {
    private readonly jwtService;
    private readonly configService;
    constructor(jwtService: JwtService, configService: ConfigService);
    private getEnvList;
    private normalizeIp;
    private resolveClientIp;
    private ensureIpAllowed;
    canActivate(context: ExecutionContext): boolean;
}
