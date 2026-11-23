import { Equals } from 'class-validator';

export class AcceptLegalDto {
  @Equals(true, { message: 'Debes aceptar los Términos y Condiciones' })
  terms!: boolean;

  @Equals(true, {
    message: 'Debes aceptar la Política de Tratamiento de Datos Personales',
  })
  privacy!: boolean;
}
