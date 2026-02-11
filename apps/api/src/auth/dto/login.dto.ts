import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString({ message: 'Login invalido' })
  @IsNotEmpty({ message: 'O campo login e obrigatorio' })
  @ApiProperty({
    required: false,
    description: 'E-mail ou login do usuario no VRMaster',
    example: 'joao.silva',
  })
  login?: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail invalido' })
  @IsNotEmpty({ message: 'O campo E-mail e obrigatorio' })
  @ApiProperty({
    required: false,
    description: 'Campo legado de e-mail',
    example: 'usuario@empresa.com',
  })
  email?: string;

  @IsString({ message: 'Senha invalida' })
  @IsNotEmpty({ message: 'O campo senha e obrigatorio' })
  @MinLength(6, { message: 'A senha deve ter no minimo 6 caracteres.' })
  @ApiProperty()
  password: string;
}
