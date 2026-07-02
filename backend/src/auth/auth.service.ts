import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, VerifyEmailDto, ResendCodeDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { randomBytes } from 'crypto';
import { EmailService } from './email.service';
import { promises as dns } from 'dns';

type PendingRegistrationPayload = {
  purpose: 'email-verification';
  code: string;
  email: string;
  nome: string;
  senhaHash: string;
  telefone?: string;
  tipo: 'CLIENTE' | 'BARBEIRO';
  userId?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async checkEmailExists(email: string) {
  
    const domain = email.split('@')[1];
    if (!domain) {
      return { exists: false, valid: false, reason: 'E-mail inválido.' };
    }

    try {
      const mxRecords = await dns.resolveMx(domain);
      if (!mxRecords || mxRecords.length === 0) {
        return { exists: false, valid: false, reason: 'Este domínio de e-mail não existe.' };
      }
    } catch {
      return { exists: false, valid: false, reason: 'Este domínio de e-mail não existe.' };
    }


    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && user.emailVerified) {
      return { exists: true, valid: true, reason: 'Este e-mail já está cadastrado.' };
    }

    return { exists: false, valid: true, reason: null };
  }

  async register(dto: RegisterDto) {

    const domain = dto.email.split('@')[1];
    if (domain) {
      try {
        const mxRecords = await dns.resolveMx(domain);
        if (!mxRecords || mxRecords.length === 0) {
          throw new ConflictException('Este domínio de e-mail não existe.');
        }
      } catch (err) {
        if (err instanceof ConflictException) throw err;
        throw new ConflictException('Este domínio de e-mail não existe.');
      }
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser?.emailVerified) {
      throw new ConflictException('Email já cadastrado');
    }

    const code = this.emailService.generateCode();
    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const verificationToken = this.buildVerificationToken({
      purpose: 'email-verification',
      code,
      email: dto.email,
      nome: dto.nome,
      senhaHash,
      telefone: dto.telefone,
      tipo: dto.tipo || 'CLIENTE',
      userId: existingUser?.id,
    });

    const enviado = await this.emailService.sendVerificationCode(dto.email, code, dto.nome);

    if (!enviado) {
      throw new BadRequestException('Não foi possível enviar o código de verificação.');
    }

    return {
      message: 'Verifique seu e-mail para ativar a conta.',
      requiresVerification: true,
      email: dto.email,
      verificationToken,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    if (dto.verificationToken) {
      const pending = this.decodeVerificationToken(dto.verificationToken);

      if (pending.email !== dto.email) {
        throw new BadRequestException('E-mail não confere com o código enviado.');
      }

      if (pending.code !== dto.code) {
        throw new BadRequestException('Código incorreto.');
      }

      const existingUser = pending.userId
        ? await this.prisma.user.findUnique({ where: { id: pending.userId } })
        : await this.prisma.user.findUnique({ where: { email: pending.email } });

      const verifiedUser = existingUser
        ? await this.prisma.user.update({
            where: { id: existingUser.id },
            data: {
              nome: pending.nome,
              email: pending.email,
              senha: pending.senhaHash,
              telefone: pending.telefone,
              tipo: pending.tipo,
              emailVerified: true,
              verificationCode: null,
              verificationExpires: null,
            },
          })
        : await this.prisma.user.create({
            data: {
              nome: pending.nome,
              email: pending.email,
              senha: pending.senhaHash,
              telefone: pending.telefone,
              tipo: pending.tipo,
              emailVerified: true,
              verificationCode: null,
              verificationExpires: null,
            },
          });

      const token = this.generateToken(verifiedUser.id, verifiedUser.email, verifiedUser.tipo);

      return {
        message: 'E-mail verificado com sucesso!',
        user: {
          id: verifiedUser.id,
          nome: verifiedUser.nome,
          email: verifiedUser.email,
          telefone: verifiedUser.telefone,
          tipo: verifiedUser.tipo,
          plano: verifiedUser.plano,
          avatar: verifiedUser.avatar,
        },
        access_token: token,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    if (user.emailVerified) {
      throw new BadRequestException('E-mail já verificado.');
    }

    if (!user.verificationCode || !user.verificationExpires) {
      throw new BadRequestException('Nenhum código de verificação encontrado. Solicite um novo.');
    }

    if (new Date() > user.verificationExpires) {
      throw new BadRequestException('Código expirado. Solicite um novo.');
    }

    if (user.verificationCode !== dto.code) {
      throw new BadRequestException('Código incorreto.');
    }


    const verifiedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationExpires: null,
      },
    });

    const token = this.generateToken(verifiedUser.id, verifiedUser.email, verifiedUser.tipo);

    return {
      message: 'E-mail verificado com sucesso!',
      user: {
        id: verifiedUser.id,
        nome: verifiedUser.nome,
        email: verifiedUser.email,
        telefone: verifiedUser.telefone,
        tipo: verifiedUser.tipo,
        plano: verifiedUser.plano,
        avatar: verifiedUser.avatar,
      },
      access_token: token,
    };
  }

  async resendCode(dto: ResendCodeDto) {
    if (dto.verificationToken) {
      const pending = this.decodeVerificationToken(dto.verificationToken);

      if (pending.email !== dto.email) {
        throw new BadRequestException('E-mail não confere com o código enviado.');
      }

      const code = this.emailService.generateCode();
      const verificationToken = this.buildVerificationToken({
        ...pending,
        code,
      });

      const enviado = await this.emailService.sendVerificationCode(dto.email, code, pending.nome);

      if (!enviado) {
        throw new BadRequestException('Não foi possível reenviar o código de verificação.');
      }

      return {
        message: 'Novo código enviado para o e-mail.',
        verificationToken,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    if (user.emailVerified) {
      throw new BadRequestException('E-mail já verificado.');
    }

    const code = this.emailService.generateCode();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode: code,
        verificationExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await this.emailService.sendVerificationCode(dto.email, code, user.nome);

    return {
      message: 'Novo código enviado para o e-mail.',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.senha) {
      throw new UnauthorizedException('Email ou senha incorretos');
    }

    const passwordValid = await bcrypt.compare(dto.senha, user.senha);

    if (!passwordValid) {
      throw new UnauthorizedException('Email ou senha incorretos');
    }

  
    if (!user.emailVerified) {
      const code = this.emailService.generateCode();
      const verificationToken = this.buildVerificationToken({
        purpose: 'email-verification',
        code,
        email: user.email,
        nome: user.nome,
        senhaHash: user.senha || '',
        telefone: user.telefone || undefined,
        tipo: user.tipo,
        userId: user.id,
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          verificationCode: code,
          verificationExpires: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
      await this.emailService.sendVerificationCode(dto.email, code, user.nome);

      return {
        message: 'E-mail não verificado. Um novo código foi enviado.',
        requiresVerification: true,
        email: dto.email,
        verificationToken,
      };
    }

    const token = this.generateToken(user.id, user.email, user.tipo);

    return {
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        tipo: user.tipo,
        plano: user.plano,
        avatar: user.avatar,
      },
      access_token: token,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });


    if (!user || !user.emailVerified) {
      return { message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' };
    }

    const token = randomBytes(32).toString('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: new Date(Date.now() + 30 * 60 * 1000), // 30 min
      },
    });

    const enviado = await this.emailService.sendPasswordResetEmail(dto.email, token, user.nome);
    
    if (!enviado) {
      console.error(`❌ Falha ao enviar e-mail de redefinição para: ${dto.email}`);
    }

    return { message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: dto.token,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Token inválido ou expirado. Solicite um novo link.');
    }

    const hashedPassword = await bcrypt.hash(dto.novaSenha, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        senha: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return { message: 'Senha redefinida com sucesso! Faça login com sua nova senha.' };
  }

  async googleLogin(googleUser: {
    email: string;
    nome: string;
    googleId: string;
    avatar?: string;
  }) {
    let user = await this.prisma.user.findUnique({
      where: { googleId: googleUser.googleId },
    });

    if (!user) {
      user = await this.prisma.user.findUnique({
        where: { email: googleUser.email },
      });

      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.googleId,
            avatar: googleUser.avatar || user.avatar,
          },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            nome: googleUser.nome,
            email: googleUser.email,
            googleId: googleUser.googleId,
            avatar: googleUser.avatar,
            emailVerified: true,
            tipo: 'CLIENTE',
          },
        });
      }
    }

    if (!user.emailVerified) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          googleId: googleUser.googleId,
          avatar: googleUser.avatar || user.avatar,
        },
      });
    }

    const token = this.generateToken(user.id, user.email, user.tipo);

    return {
      message: 'Login com Google realizado com sucesso',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        tipo: user.tipo,
        plano: user.plano,
        avatar: user.avatar,
      },
      access_token: token,
    };
  }

  private generateToken(userId: string, email: string, tipo: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      tipo,
    });
  }

  private getVerificationSecret(): string {
    return this.configService.get<string>('EMAIL_VERIFICATION_JWT_SECRET')
      || this.configService.get<string>('JWT_SECRET')
      || 'verification-secret-change-me';
  }

  private buildVerificationToken(payload: PendingRegistrationPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.getVerificationSecret(),
      expiresIn: '15m',
    });
  }

  private decodeVerificationToken(token: string): PendingRegistrationPayload {
    const payload = this.jwtService.verify(token, {
      secret: this.getVerificationSecret(),
    }) as PendingRegistrationPayload;

    if (payload.purpose !== 'email-verification') {
      throw new BadRequestException('Token de verificação inválido.');
    }

    return payload;
  }
}
