// Ce DTO decrit le formulaire de connexion classique par email.
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  NormalizeEmail,
} from "@/common/validation/input-safety";
import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class LoginDto {
  // Email du compte a authentifier.
  @ApiProperty({ example: "alex@example.com" })
  @NormalizeEmail()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  // Mot de passe en clair fourni au moment du login.
  @ApiProperty({ example: "supersecurepass", minLength: 12, writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @MinLength(AUTH_PASSWORD_MIN_LENGTH)
  @MaxLength(AUTH_PASSWORD_MAX_LENGTH)
  password: string;
}
