import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateBarbeariaDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome da barbearia é obrigatório' })
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsString()
  @IsNotEmpty({ message: 'Endereço é obrigatório' })
  endereco: string;

  @IsString()
  @IsNotEmpty({ message: 'Cidade é obrigatória' })
  cidade: string;

  @IsString()
  @IsNotEmpty({ message: 'Estado é obrigatório' })
  estado: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  pontoReferencia?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  mensagemLembrete?: string;

  @IsOptional()
  @IsBoolean()
  lembreteAtivo?: boolean;
}

export class UpdateBarbeariaDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  endereco?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  pontoReferencia?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  mensagemLembrete?: string;

  @IsOptional()
  @IsBoolean()
  lembreteAtivo?: boolean;

  @IsOptional()
  @IsBoolean()
  ativa?: boolean;
}
