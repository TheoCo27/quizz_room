// Ce DTO decrit le contenu d'un message prive entre amis.
import {
  IsSafeText,
  PRIVATE_MESSAGE_MAX_LENGTH,
  Trim,
} from "@/common/validation/input-safety";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class SendPrivateMessageDto {
  // Contenu texte du message prive.
  @ApiProperty({
    example: "Salut, on joue ce soir ?",
    minLength: 1,
    maxLength: 1000,
  })
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(PRIVATE_MESSAGE_MAX_LENGTH)
  @IsSafeText()
  content: string;
}
