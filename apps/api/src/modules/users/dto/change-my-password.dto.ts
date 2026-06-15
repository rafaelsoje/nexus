import { IsString, MinLength } from "class-validator";

export class ChangeMyPasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
