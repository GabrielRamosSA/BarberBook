import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';

type TipoFiltro = 'TODOS' | 'CLIENTE' | 'BARBEIRO';
type Plano = 'BASICO' | 'PROFISSIONAL' | 'PREMIUM';

@Injectable()
export class AdminDevService {
  private readonly loginAttempts = new Map<string, { count: number; startedAt: number; blockedUntil?: number }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
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

  private resolveClientIp(request?: any): string {
    const forwarded = request?.headers?.['x-forwarded-for'];
    const fromForwarded =
      typeof forwarded === 'string' && forwarded.length > 0
        ? forwarded.split(',')[0]
        : '';
    const ip = fromForwarded || request?.ip || request?.socket?.remoteAddress || '';
    return this.normalizeIp(ip);
  }

  private ensureIpAllowed(request?: any) {
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

  private checkRateLimit(ip: string) {
    const windowMs = Number(this.configService.get<string>('DEV_ADMIN_RATE_LIMIT_WINDOW_MS') || 600000);
    const maxAttempts = Number(this.configService.get<string>('DEV_ADMIN_RATE_LIMIT_MAX_ATTEMPTS') || 5);
    const blockMs = Number(this.configService.get<string>('DEV_ADMIN_RATE_LIMIT_BLOCK_MS') || 900000);

    const now = Date.now();
    const current = this.loginAttempts.get(ip);

    if (current?.blockedUntil && current.blockedUntil > now) {
      const waitSeconds = Math.ceil((current.blockedUntil - now) / 1000);
      throw new HttpException(
        `Muitas tentativas de login. Tente novamente em ${waitSeconds}s.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!current || now - current.startedAt > windowMs) {
      this.loginAttempts.set(ip, { count: 1, startedAt: now });
      return;
    }

    current.count += 1;
    if (current.count > maxAttempts) {
      current.blockedUntil = now + blockMs;
      this.loginAttempts.set(ip, current);
      throw new HttpException(
        'Limite de tentativas atingido para este IP.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.loginAttempts.set(ip, current);
  }

  login(username: string, password: string, request?: any) {
    this.ensureIpAllowed(request);

    const ip = this.resolveClientIp(request);
    this.checkRateLimit(ip);

    const user = (username || '').trim();
    const pass = (password || '').trim();

    const configuredUser = this.configService.get<string>('DEV_ADMIN_USERNAME') || 'admin123';
    const configuredPass = this.configService.get<string>('DEV_ADMIN_PASSWORD') || '72003131Aq@';

    if (user !== configuredUser || pass !== configuredPass) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    this.loginAttempts.delete(ip);

    const secret = this.configService.get<string>('DEV_ADMIN_JWT_SECRET') || 'dev-admin-secret-change-me';
    const expiresIn = (this.configService.get<string>('DEV_ADMIN_JWT_EXPIRES_IN') || '12h') as StringValue;

    const accessToken = this.jwtService.sign(
      {
        role: 'DEV_ADMIN',
        username: configuredUser,
      },
      { secret, expiresIn },
    );

    return {
      accessToken,
      expiresIn,
    };
  }

  async listarContas(tipo: string = 'TODOS') {
    const filtro = (tipo || 'TODOS').toUpperCase() as TipoFiltro;
    if (!['TODOS', 'CLIENTE', 'BARBEIRO'].includes(filtro)) {
      throw new BadRequestException('Filtro invalido. Use TODOS, CLIENTE ou BARBEIRO.');
    }

    const where: any = {};
    if (filtro === 'TODOS') {
      where.tipo = { in: ['CLIENTE', 'BARBEIRO'] };
    } else {
      where.tipo = filtro;
    }

    const contas = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        plano: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { contas };
  }

  async atualizarPlanoBarbeiro(userId: string, plano: string) {
    const planoNovo = (plano || '').toUpperCase() as Plano;
    if (!['BASICO', 'PROFISSIONAL', 'PREMIUM'].includes(planoNovo)) {
      throw new BadRequestException('Plano invalido.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Conta nao encontrada.');
    }

    if (user.tipo !== 'BARBEIRO') {
      throw new BadRequestException('Apenas contas de barbeiro podem ter plano alterado aqui.');
    }

    const atualizado = await this.prisma.user.update({
      where: { id: userId },
      data: { plano: planoNovo },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        plano: true,
      },
    });

    return {
      message: 'Plano atualizado com sucesso.',
      conta: atualizado,
    };
  }
}
