import { IsString, MinLength } from "class-validator";

export class AnonymizeMyAccountDto {
  @IsString()
  @MinLength(8)
  password: string;
}
