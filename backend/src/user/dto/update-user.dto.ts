import { IsOptional, IsString, IsEnum } from 'class-validator';

export enum UserType {
  CLIENTE = 'CLIENTE',
  BARBEIRO = 'BARBEIRO',
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEnum(UserType)
  tipo?: UserType;

  @IsOptional()
  @IsString()
  avatar?: string;
}
