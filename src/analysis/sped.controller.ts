import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
  UseGuards,
  Req,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { SpedService } from './sped.service';
import { extname } from 'path';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { Permissions } from 'src/auth/decorators/permissions.decorator';
import { ArquivoAnaliseEntity } from './entities/arquivo-analise.entity';
import { SpedAnaliseEntity } from './entities/sped-analise.entity';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('sped')
@ApiBearerAuth()
@Controller('sped')
export class SpedController {
  constructor(private readonly spedService: SpedService) {}

  @Post('upload')
  @Permissions('sped:upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (_, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      }
    }),
    fileFilter: (_, file, cb) => {
      if (!file.originalname.match(/\.txt$/i)) {
        return cb(new HttpException('Apenas arquivos .txt são permitidos.', HttpStatus.BAD_REQUEST), false);
      }
      cb(null, true);
    }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadSpedFile(@UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) {
      throw new HttpException('Nenhum arquivo foi enviado.', HttpStatus.BAD_REQUEST);
    }

    const userId = req.user.id;

    const result = await this.spedService.processarArquivo(file.path, file.filename, userId);
    return { sucesso: true, resumo: result };
  }

  @Get('arquivo')
  @Permissions('sped:consultarRelatorioSPED')
  @ApiOkResponse({type: ArquivoAnaliseEntity})
  async getAllArquivoAnalise() {
    return await this.spedService.getAllArquivoAnalise()
  }

  @Get('sped-analise/:arquivoAnaliseId')
  @Permissions('sped:consultarRelatorioSPED')
  @ApiOkResponse({type: Object})
  async getSpedAnalise (@Param('arquivoAnaliseId', ParseIntPipe) arquivoAnaliseId: number) {
    return await this.spedService.getSpedAnalise(arquivoAnaliseId)
  }
}
