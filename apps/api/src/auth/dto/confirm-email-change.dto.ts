import { IsEmail, IsString } from 'class-validator';

/**
 * Último paso del cambio de correo. El código ya se envió y verificó contra el
 * correo NUEVO con `otp/send` + `otp/verify` (`purpose: 'register'`, que es el
 * que rechaza un correo ya registrado); aquí solo se canjea el ticket.
 */
export class ConfirmEmailChangeDto {
  @IsEmail({}, { message: 'Correo inválido' })
  email!: string;

  @IsString()
  emailTicket!: string;
}
