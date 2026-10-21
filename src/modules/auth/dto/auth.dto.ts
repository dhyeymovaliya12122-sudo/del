import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

/**
 * LoginDto
 * Enforces strict typing and max length to prevent Long Password DoS (Bcrypt CPU exhaustion)
 * and NoSQL/SQL operator injection.
 */
export class LoginDto {
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @MaxLength(100, { message: 'Username cannot exceed 100 characters' })
  username: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(1, { message: 'Password cannot be empty' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  password: string;
}

/**
 * CreateAdminDto
 * Restricts administrative account creation payloads.
 */
export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}

/**
 * UpdatePasswordDto
 * Enforces strict 128-char ceiling preventing Bcrypt DoS attacks.
 */
export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  newPassword: string;
}

/**
 * ForgotPasswordDto
 */
export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identity: string;
}

/**
 * ResetPasswordDto
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  newPassword: string;
}

/**
 * LogoutDto
 */
export class LogoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}
