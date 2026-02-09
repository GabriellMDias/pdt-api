import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, {message: 'E-mail inválido'})
  @IsNotEmpty({message: 'O campo E-mail é obrigatório'})
  @ApiProperty()
  email: string;

  @IsString({message: 'Senha inválida'})
  @IsNotEmpty({message: 'O campo senha é obrigatório'})
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  @ApiProperty()
  password: string;
}