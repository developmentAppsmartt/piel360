import { IsEmail, IsIn, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsIn(['register', 'reset'])
  purpose!: 'register' | 'reset';

  @IsString()
  @Length(5, 5)
  code!: string;
}
