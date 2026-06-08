import {
  IsSafeText,
  QUIZ_ANSWER_MAX_LENGTH,
  ROOM_MESSAGE_MAX_LENGTH,
  Trim,
} from "@/common/validation/input-safety";
import { Type } from "class-transformer";
import {
  IsDefined,
  IsInt,
  IsObject,
  IsString,
  IsOptional,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class RoomIdDto {
  @Trim()
  @IsString()
  @IsUUID("4")
  roomId: string;
}

export class SubmitAnswerDto extends RoomIdDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(QUIZ_ANSWER_MAX_LENGTH)
  @IsSafeText()
  answer: string;
}

export class UpdateRoomConfigPayloadDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quizId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(10)
  maxPlayers?: number;

  @IsOptional()
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @IsSafeText()
  name?: string;
}

export class UpdateRoomConfigDto extends RoomIdDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateRoomConfigPayloadDto)
  config: UpdateRoomConfigPayloadDto;
}

export class RoomMessageDto extends RoomIdDto {
  @Trim()
  @IsString()
  @MinLength(1)
  @MaxLength(ROOM_MESSAGE_MAX_LENGTH)
  @IsSafeText()
  content: string;
}

export class KickPlayerDto extends RoomIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetUserId: number;
}
