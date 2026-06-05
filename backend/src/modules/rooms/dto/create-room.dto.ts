import {
  IsSafeText,
  ROOM_NAME_MAX_LENGTH,
  TrimToUndefined,
} from "@/common/validation/input-safety";
import { GameType } from "@generated/prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateRoomDto {
  @IsOptional()
  @TrimToUndefined()
  @IsString()
  @MinLength(2)
  @MaxLength(ROOM_NAME_MAX_LENGTH)
  @IsSafeText()
  name?: string;

  @IsEnum(GameType)
  gameType: GameType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(10)
  maxPlayers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quizId?: number;
}
