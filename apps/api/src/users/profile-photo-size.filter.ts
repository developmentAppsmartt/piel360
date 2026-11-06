import {
  BadRequestException,
  Catch,
  PayloadTooLargeException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { PROFILE_PHOTO_SIZE_ERROR } from '@piel360/shared';
import type { Response } from 'express';

/** Multer corta la subida con un 413 «File too large»; se responde como el
 * resto de validaciones de la foto: 400 y el mensaje en español. */
@Catch(PayloadTooLargeException)
export class ProfilePhotoSizeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    const error = new BadRequestException(PROFILE_PHOTO_SIZE_ERROR);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(error.getStatus())
      .json(error.getResponse());
  }
}
