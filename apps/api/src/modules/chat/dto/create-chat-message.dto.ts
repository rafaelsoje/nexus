import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;
}
