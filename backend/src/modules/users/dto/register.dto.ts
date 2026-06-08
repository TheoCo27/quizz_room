// Ce DTO decrit le formulaire d'inscription classique.
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_USERNAME_MAX_LENGTH,
  AUTH_USERNAME_MIN_LENGTH,
  NormalizeEmail,
  Trim,
  USERNAME_PATTERN,
} from "@/common/validation/input-safety";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  // Email unique du nouveau compte.
  @ApiProperty({ example: "alex@example.com" })
  @NormalizeEmail()
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255, { message: "email too long" })
  email: string;

  // Pseudo choisi pour le nouveau compte.
  @ApiProperty({ example: "alex42", minLength: 2 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MinLength(AUTH_USERNAME_MIN_LENGTH)
  @MaxLength(AUTH_USERNAME_MAX_LENGTH, { message: "nickname too long" })
  @Matches(USERNAME_PATTERN, {
    message: "Le pseudo ne peut contenir que des lettres, chiffres, points, tirets et underscores",
  })
  username: string;

  // Mot de passe initial du nouveau compte.
  @ApiProperty({ example: "supersecurepass", minLength: 12, writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @MinLength(AUTH_PASSWORD_MIN_LENGTH)
  @MaxLength(AUTH_PASSWORD_MAX_LENGTH, { message: "password too long" })
  password: string;
}
