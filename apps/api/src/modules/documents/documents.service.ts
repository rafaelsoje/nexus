import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import { basename, extname, join, resolve } from "path";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { UploadVerificationDocumentDto } from "./dto/upload-verification-document.dto";

const allowedMimeTypes = new Map([
  ["application/pdf", ".pdf"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const maxFileSizeBytes = 5 * 1024 * 1024;

type RequestUser = {
  sub: string;
  role: string;
};

@Injectable()
export class DocumentsService {
  private readonly uploadDir = resolve(
    process.cwd(),
    "uploads",
    "verification-documents",
  );

  constructor(private readonly prisma: PrismaService) {}

  async uploadVerificationDocument(
    user: RequestUser,
    dto: UploadVerificationDocumentDto,
  ) {
    if (user.role !== UserRole.COMPANY && user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException("Only companies and freelancers can upload documents");
    }

    const extension = allowedMimeTypes.get(dto.mimeType);
    if (!extension) {
      throw new BadRequestException("Unsupported file type");
    }

    const buffer = this.parseBase64File(dto.data);
    if (!buffer.length || buffer.length > maxFileSizeBytes) {
      throw new BadRequestException("File must be up to 5 MB");
    }

    const owner =
      user.role === UserRole.COMPANY
        ? await this.prisma.companyProfile.findUnique({
            where: { userId: user.sub },
            select: { id: true },
          })
        : await this.prisma.freelancerProfile.findUnique({
            where: { userId: user.sub },
            select: { id: true },
          });

    if (!owner) {
      throw new NotFoundException("Profile not found");
    }

    await mkdir(this.uploadDir, { recursive: true });
    const fileName = `${randomUUID()}${extension}`;
    const storagePath = join(this.uploadDir, fileName);
    await writeFile(storagePath, buffer, { flag: "wx" });

    return this.prisma.verificationDocument.create({
      data: {
        category: dto.category.trim(),
        originalName: basename(dto.originalName),
        fileName,
        mimeType: dto.mimeType,
        sizeBytes: buffer.length,
        storagePath,
        uploadedById: user.sub,
        companyId: user.role === UserRole.COMPANY ? owner.id : undefined,
        freelancerId: user.role === UserRole.FREELANCER ? owner.id : undefined,
      },
    });
  }

  async deleteVerificationDocument(user: RequestUser, id: string) {
    const document = await this.findAuthorizedDocument(user, id);
    await this.prisma.verificationDocument.delete({ where: { id } });

    try {
      await unlink(document.storagePath);
    } catch {
      // The database record is authoritative; a missing local file should not block deletion.
    }

    return { ok: true };
  }

  async getVerificationDocumentFile(user: RequestUser, id: string) {
    const document = await this.findAuthorizedDocument(user, id);

    try {
      await stat(document.storagePath);
    } catch {
      throw new NotFoundException("Document file not found");
    }

    return document;
  }

  private parseBase64File(data: string) {
    const base64 = data.includes(",") ? data.split(",").at(-1) : data;

    if (!base64) {
      throw new BadRequestException("Invalid file data");
    }

    try {
      return Buffer.from(base64, "base64");
    } catch {
      throw new BadRequestException("Invalid file data");
    }
  }

  private async findAuthorizedDocument(user: RequestUser, id: string) {
    const document = await this.prisma.verificationDocument.findUnique({
      where: { id },
      include: {
        company: { select: { userId: true } },
        freelancer: { select: { userId: true } },
      },
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    const ownsDocument =
      document.uploadedById === user.sub ||
      document.company?.userId === user.sub ||
      document.freelancer?.userId === user.sub;

    if (user.role !== UserRole.ADMIN && !ownsDocument) {
      throw new ForbiddenException("You cannot access this document");
    }

    return document;
  }
}
