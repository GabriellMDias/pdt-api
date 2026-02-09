import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class GoogleDriveOauthUrlDto {
  @ApiProperty({
    description:
      "Redirect URI que está registrada no OAuth Client do Google.",
    example: "https://app.seudominio.com/configuracoes/acoesagendadas/jobs",
  })
  @IsString()
  redirectUri!: string;

  @ApiPropertyOptional({
    description:
      "State opcional para correlacionar o retorno do OAuth no frontend.",
  })
  @IsOptional()
  @IsString()
  state?: string;
}
