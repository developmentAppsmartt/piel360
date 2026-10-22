import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const HEX = /^#[0-9A-Fa-f]{6}$/;

/** `null` restablece el color por defecto. */
export class BrandingColorsDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  background?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  primary?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  primaryText?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  secondaryText?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  icon?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  secondary?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  button?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  buttonHover?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  gradientStart?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  gradientEnd?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  gradientHoverStart?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  gradientHoverEnd?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  buttonText?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  gradientText?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  link?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  loginText?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(HEX)
  menuBackground?: string | null;
}

export class UpdateBrandingDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingColorsDto)
  colors?: BrandingColorsDto;

  @IsOptional()
  @IsBoolean()
  loginOverlay?: boolean;
}
