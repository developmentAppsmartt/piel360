import { SUPPORT_REQUEST_TYPE_VALUES } from '@piel360/shared';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Llega como multipart (por el adjunto): todos los campos son texto. */
export class CreateSupportRequestDto {
  @Transform(trim)
  @IsEmail({}, { message: 'Escribe un correo válido' })
  @MaxLength(200)
  email!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Escribe tu nombre completo' })
  @MaxLength(150)
  fullName!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Escribe el asunto' })
  @MaxLength(200)
  subject!: string;

  @IsIn(SUPPORT_REQUEST_TYPE_VALUES, { message: 'Elige el tipo de solicitud' })
  type!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Escribe el mensaje' })
  @MaxLength(5000)
  message!: string;
}
