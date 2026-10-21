// ─────────────────────────────────────────────────────────────────────────────
//  modules/proxy-binding/dto/register-proxies.dto.ts
// ─────────────────────────────────────────────────────────────────────────────
import { Type } from 'class-transformer';
import {
  IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested,
} from 'class-validator';

export class ProxyItemDto {
  @IsString()
  label: string;

  @IsEnum(['socks5', 'http', 'https'])
  protocol: 'socks5' | 'http' | 'https';

  @IsString()
  host: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  port: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class RegisterProxiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProxyItemDto)
  proxies: ProxyItemDto[];
}
