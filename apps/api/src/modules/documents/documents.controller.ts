import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { createReadStream } from "fs";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UploadVerificationDocumentDto } from "./dto/upload-verification-document.dto";
import { DocumentsService } from "./documents.service";

@UseGuards(JwtAuthGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post("verification")
  uploadVerificationDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UploadVerificationDocumentDto,
  ) {
    return this.documentsService.uploadVerificationDocument(user, dto);
  }

  @Delete(":id")
  deleteVerificationDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.documentsService.deleteVerificationDocument(user, id);
  }

  @Get(":id/file")
  @Header("Cache-Control", "private, max-age=300")
  async getVerificationDocumentFile(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    const document =
      await this.documentsService.getVerificationDocumentFile(user, id);

    response.contentType(document.mimeType);
    response.setHeader(
      "Content-Disposition",
      `inline; filename="${document.originalName.replaceAll('"', "")}"`,
    );
    createReadStream(document.storagePath).pipe(response);
  }
}
