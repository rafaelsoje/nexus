import { IsIn, IsString, MaxLength } from "class-validator";

export class UploadVerificationDocumentDto {
  @IsString()
  @MaxLength(40)
  category: string;

  @IsString()
  @MaxLength(180)
  originalName: string;

  @IsString()
  @IsIn(["application/pdf", "image/jpeg", "image/png", "image/webp"])
  mimeType: string;

  @IsString()
  data: string;
}
