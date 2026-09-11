import { Allow, IsOptional, IsString, ValidateIf } from 'class-validator';

export class AssignPatientDoctorDto {
  /**
   * Id del doctor (`doctors.id` / columna `doctor_id`).
   * `null` o string vacío desasigna.
   */
  @Allow()
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  doctor_id?: string | null;
}
