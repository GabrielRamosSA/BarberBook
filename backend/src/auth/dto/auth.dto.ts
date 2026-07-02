import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsEnum,
  Length,
  Matches,
} from 'class-validator';

export enum UserType {
  CLIENTE = 'CLIENTE',
  BARBEIRO = 'BARBEIRO',
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  senha: string;

  @IsString()
  @IsNotEmpty({ message: 'Telefone é obrigatório' })
  @Matches(/^(\(?\d{2}\)?\s?\d{4,5}-?\d{4}|\d{10,11})$/, {
    message: 'Telefone inválido',
  })
  telefone: string;

  @IsOptional()
  @IsEnum(UserType, { message: 'Tipo deve ser CLIENTE ou BARBEIRO' })
  tipo?: UserType;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Senha é obrigatória' })
  senha: string;
}

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Código deve ter 6 dígitos' })
  code: string;

  @IsOptional()
  @IsString()
  verificationToken?: string;
}

export class ResendCodeDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;

  @IsOptional()
  @IsString()
  verificationToken?: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty({ message: 'Email é obrigatório' })
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Token é obrigatório' })
  token: string;

  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  novaSenha: string;
}
