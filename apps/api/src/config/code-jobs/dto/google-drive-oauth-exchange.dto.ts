import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class GoogleDriveOauthExchangeDto {
  @ApiProperty({
    description: "Authorization code retornado pelo Google OAuth.",
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description:
      "Mesma Redirect URI usada para gerar a URL de autorização OAuth.",
    example: "https://app.seudominio.com/configuracoes/acoesagendadas/jobs",
  })
  @IsString()
  redirectUri!: string;
}
