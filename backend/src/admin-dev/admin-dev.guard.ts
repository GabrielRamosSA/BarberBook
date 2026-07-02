import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminDevGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getEnvList(key: string): string[] {
    const raw = this.configService.get<string>(key) || '';
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  private normalizeIp(value: string): string {
    if (!value) return '';
    return value.replace('::ffff:', '').trim();
  }

  private resolveClientIp(request: any): string {
    const forwarded = request?.headers?.['x-forwarded-for'];
    const fromForwarded =
      typeof forwarded === 'string' && forwarded.length > 0
        ? forwarded.split(',')[0]
        : '';
    const ip = fromForwarded || request?.ip || request?.socket?.remoteAddress || '';
    return this.normalizeIp(ip);
  }

  private ensureIpAllowed(request: any) {
    const ip = this.resolveClientIp(request);

    const blocked = this.getEnvList('DEV_ADMIN_BLOCKED_IPS').map((item) => this.normalizeIp(item));
    if (blocked.includes(ip)) {
      throw new ForbiddenException('Acesso bloqueado para este IP.');
    }

    const configuredAllowed = this.getEnvList('DEV_ADMIN_ALLOWED_IPS').map((item) => this.normalizeIp(item));
    const defaultAllowed = ['127.0.0.1', '::1', 'localhost'].map((item) => this.normalizeIp(item));

    if (process.env.NODE_ENV === 'production' && configuredAllowed.length === 0) {
      return;
    }

    const allowed = configuredAllowed.length > 0 ? configuredAllowed : defaultAllowed;

    if (!allowed.includes(ip)) {
      throw new ForbiddenException('Acesso permitido apenas por IP autorizado.');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    this.ensureIpAllowed(request);
    const authHeader = request.headers?.authorization as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acesso do admin dev nao informado.');
    }

    const token = authHeader.slice(7);
    const secret = this.configService.get<string>('DEV_ADMIN_JWT_SECRET') || 'dev-admin-secret-change-me';

    try {
      const payload = this.jwtService.verify(token, { secret }) as any;
      if (payload?.role !== 'DEV_ADMIN') {
        throw new UnauthorizedException('Token invalido para admin dev.');
      }
      request.devAdmin = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado.');
    }
  }
}
