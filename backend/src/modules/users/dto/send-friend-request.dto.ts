// Ce DTO decrit la demande d'ajout d'un ami par pseudo.
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

export class SendFriendRequestDto {
  // Pseudo cible auquel envoyer la demande d'ami.
  @ApiProperty({ example: "friend42", minLength: 2 })
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MinLength(AUTH_USERNAME_MIN_LENGTH)
  @MaxLength(AUTH_USERNAME_MAX_LENGTH)
  @Matches(USERNAME_PATTERN, {
    message: "Le pseudo ne peut contenir que des lettres, chiffres, points, tirets et underscores",
  })
  username: string;
}
