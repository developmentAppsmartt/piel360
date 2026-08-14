import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  productName: string;

  @IsString()
  @IsOptional()
  productDescription?: string;

  @IsUrl()
  @IsOptional()
  productUrl?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  enablePrice?: boolean;

  @ValidateIf((o) => o.enablePrice === true)
  @IsIn(['fixed', 'variable'])
  @IsOptional()
  pricingType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  currencyCode?: string;

  @ValidateIf((o) => o.enablePrice === true)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  originalPrice?: number;

  @ValidateIf((o) => o.enablePrice === true)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  sellingPrice?: number;

  @IsNotEmpty()
  @Type(() => Number)
  categoryId: number;
}
