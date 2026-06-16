import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
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
    @Req() request: Request,
    @Body() dto: UploadVerificationDocumentDto,
  ) {
    return this.documentsService.uploadVerificationDocument(
      user,
      dto,
      this.auditContext(user, request),
    );
  }

  @Delete(":id")
  deleteVerificationDocument(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
    @Param("id") id: string,
  ) {
    return this.documentsService.deleteVerificationDocument(
      user,
      id,
      this.auditContext(user, request),
    );
  }

  @Get(":id/file")
  @Header("Cache-Control", "private, max-age=300")
  async getVerificationDocumentFile(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    const document = await this.documentsService.getVerificationDocumentFile(
      user,
      id,
    );

    response.contentType(document.mimeType);
    response.setHeader(
      "Content-Disposition",
      `inline; filename="${document.originalName.replaceAll('"', "")}"`,
    );
    createReadStream(document.storagePath).pipe(response);
  }

  private auditContext(user: CurrentUserPayload, request: Request) {
    return {
      userId: user.sub,
      role: user.role,
      ip: request.ip,
      userAgent: request.get("user-agent"),
    };
  }
}
