import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CriarAssinaturaDto {
  @IsIn(['PROFISSIONAL', 'PREMIUM'])
  plano: 'PROFISSIONAL' | 'PREMIUM';

  @IsString()
  @IsNotEmpty()
  card_token_id: string;
}
