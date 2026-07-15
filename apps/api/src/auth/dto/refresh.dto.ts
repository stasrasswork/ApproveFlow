import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class RefreshDto {
  @ValidateIf((dto: RefreshDto) => dto.refresh_token !== undefined)
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  refresh_token?: string;
}
