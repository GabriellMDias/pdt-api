import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  private getUniqueConstraintMessage(
    exception: Prisma.PrismaClientKnownRequestError,
  ) {
    const target = exception.meta?.target;
    const fields = Array.isArray(target)
      ? target.map(String)
      : target != null
        ? [String(target)]
        : [];

    if (fields.includes('codigoUsuarioVrMaster')) {
      return 'O codigo de usuario VRMaster informado ja esta vinculado a outro usuario.';
    }

    if (fields.includes('email')) {
      return 'Ja existe um usuario cadastrado com este e-mail.';
    }

    return 'Ja existe um registro com os mesmos dados unicos.';
  }

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    console.error(exception.message);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const message = exception.message.replace(/\n/g, '');

    switch (exception.code) {
      case 'P2002': {
        const status = HttpStatus.CONFLICT;
        response.status(status).json({
          statusCode: status,
          message: this.getUniqueConstraintMessage(exception),
        });
        break;
      }
      case 'P2025': {
        const status = HttpStatus.NOT_FOUND;
        response.status(status).json({
          statusCode: status,
          message: message
        });
        break;
      }
      case 'P2003': {
        const status = HttpStatus.BAD_REQUEST;
        response.status(status).json({
          statusCode: status,
          message: message
        });
        break;
      }
      default:
        super.catch(exception, host);
        break;
    }
  }
}
