// Ce DTO decrit les donnees minimales necessaires a une connexion invite.
import {
  AUTH_USERNAME_MAX_LENGTH,
  AUTH_USERNAME_MIN_LENGTH,
  Trim,
  USERNAME_PATTERN,
} from "@/common/validation/input-safety";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class GuestLoginDto {
  // Pseudo souhaite pour la session invite.
  @ApiProperty({ example: "guest_player", minLength: 2 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MinLength(AUTH_USERNAME_MIN_LENGTH)
  @MaxLength(AUTH_USERNAME_MAX_LENGTH, { message: "nickname too long" })
  @Matches(USERNAME_PATTERN, {
    message: "Le pseudo ne peut contenir que des lettres, chiffres, points, tirets et underscores",
  })
  username: string;
}
