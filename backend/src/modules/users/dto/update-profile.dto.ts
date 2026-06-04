// Ce DTO decrit les informations modifiables depuis la page profil.
import {
  AUTH_USERNAME_MAX_LENGTH,
  AUTH_USERNAME_MIN_LENGTH,
  Trim,
  USERNAME_PATTERN,
} from "@/common/validation/input-safety";
import { UserStatus } from "@generated/prisma/client";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateProfileDto {
  // Nouveau pseudo choisi par l'utilisateur.
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

  // Nouveau statut de presence expose dans l'application.
  @ApiProperty({ enum: UserStatus, example: UserStatus.online })
  @IsEnum(UserStatus)
  status: UserStatus;
}
