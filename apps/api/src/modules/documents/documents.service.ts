import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole, VerificationStatus } from "@prisma/client";
import { basename } from "path";
import { randomUUID } from "crypto";
import {
  CompanyAccessService,
  companyReadRoles,
} from "../company-access/company-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { UploadVerificationDocumentDto } from "./dto/upload-verification-document.dto";
import { DOCUMENT_STORAGE, DocumentStorage } from "./storage/document-storage";

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyAccess: CompanyAccessService,
    @Inject(DOCUMENT_STORAGE)
    private readonly storage: DocumentStorage,
  ) {}

  async uploadVerificationDocument(
    user: RequestUser,
    dto: UploadVerificationDocumentDto,
  ) {
    if (user.role !== UserRole.COMPANY && user.role !== UserRole.FREELANCER) {
      throw new ForbiddenException(
        "Only companies and freelancers can upload documents",
      );
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
        ? await this.companyAccess.findCompanyForUser(
            user.sub,
            companyReadRoles,
          )
        : await this.prisma.freelancerProfile.findUnique({
            where: { userId: user.sub },
            select: { id: true },
          });

    if (!owner) {
      throw new NotFoundException("Profile not found");
    }

    const fileName = `${randomUUID()}${extension}`;
    const stored = await this.storage.save({ fileName, data: buffer });

    return this.prisma.verificationDocument.create({
      data: {
        category: dto.category.trim(),
        originalName: basename(dto.originalName),
        fileName: stored.fileName,
        mimeType: dto.mimeType,
        sizeBytes: buffer.length,
        storagePath: stored.storagePath,
        uploadedById: user.sub,
        companyId: user.role === UserRole.COMPANY ? owner.id : undefined,
        freelancerId: user.role === UserRole.FREELANCER ? owner.id : undefined,
      },
    });
  }

  async deleteVerificationDocument(user: RequestUser, id: string) {
    const document = await this.findAuthorizedDocument(user, id);
    const isVerifiedDocument =
      document.company?.verificationStatus === VerificationStatus.VERIFIED ||
      document.freelancer?.verificationStatus === VerificationStatus.VERIFIED;

    if (user.role !== UserRole.ADMIN && isVerifiedDocument) {
      throw new ForbiddenException(
        "Verified profiles cannot delete verification documents",
      );
    }

    await this.prisma.verificationDocument.delete({ where: { id } });

    try {
      await this.storage.delete(document.storagePath);
    } catch {
      // The database record is authoritative; a missing local file should not block deletion.
    }

    return { ok: true };
  }

  async getVerificationDocumentFile(user: RequestUser, id: string) {
    const document = await this.findAuthorizedDocument(user, id);

    if (!(await this.storage.exists(document.storagePath))) {
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
        company: {
          select: {
            verificationStatus: true,
            members: {
              where: { userId: user.sub, isActive: true },
              select: { id: true },
            },
          },
        },
        freelancer: { select: { userId: true, verificationStatus: true } },
      },
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    const ownsDocument =
      document.uploadedById === user.sub ||
      Boolean(document.company?.members.length) ||
      document.freelancer?.userId === user.sub;

    if (user.role !== UserRole.ADMIN && !ownsDocument) {
      throw new ForbiddenException("You cannot access this document");
    }

    return document;
  }
}
