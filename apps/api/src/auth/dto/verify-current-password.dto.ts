import { IsString, MinLength } from 'class-validator';

/**
 * Camino por defecto para cambiar la contraseña con la sesión abierta: en vez
 * de un código, se prueba la identidad con la contraseña actual. Devuelve el
 * mismo token que la ruta del OTP, así que el cambio lo escribe
 * `reset-password` en los dos casos.
 */
export class VerifyCurrentPasswordDto {
  @IsString()
  @MinLength(1, { message: 'Escribe tu contraseña actual' })
  currentPassword!: string;
}
