import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn, IsInt, Min, Max, IsBoolean } from 'class-validator';

/**
 * LogCallDto
 * Enforces strict boundaries on incoming call telemetry to prevent
 * database bloat, Unicode/emoji flooding, and invalid status values.
 */
export class LogCallDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  accountId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  callerJid: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  callerName?: string;

  @IsOptional()
  @IsIn(['incoming', 'outgoing'])
  direction?: 'incoming' | 'outgoing';

  @IsOptional()
  @IsIn(['connected', 'missed', 'rejected', 'never_attended', 'not_pickup'])
  status?: 'connected' | 'missed' | 'rejected' | 'never_attended' | 'not_pickup';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400) // max 24 hours
  duration?: number;

  @IsOptional()
  @IsBoolean()
  isVideo?: boolean;
}

/**
 * SimulateEventDto
 * Restricts simulation payloads in development/testing.
 */
export class SimulateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  accountId: string;

  @IsOptional()
  @IsIn(['call', 'message'])
  type?: 'call' | 'message';
}
