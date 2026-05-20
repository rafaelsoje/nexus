import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import { join, resolve } from "path";
import { DocumentStorage, StoredDocument } from "./document-storage";

@Injectable()
export class LocalDocumentStorage implements DocumentStorage {
  private readonly uploadDir: string;

  constructor(config: ConfigService) {
    this.uploadDir = resolve(
      config.get<string>("DOCUMENT_STORAGE_LOCAL_DIR") ??
        join(process.cwd(), "uploads", "verification-documents"),
    );
  }

  async save(input: {
    fileName: string;
    data: Buffer;
  }): Promise<StoredDocument> {
    await mkdir(this.uploadDir, { recursive: true });
    const storagePath = join(this.uploadDir, input.fileName);
    await writeFile(storagePath, input.data, { flag: "wx" });

    return {
      fileName: input.fileName,
      storagePath,
    };
  }

  async delete(storagePath: string) {
    await unlink(storagePath);
  }

  async exists(storagePath: string) {
    try {
      await stat(storagePath);
      return true;
    } catch {
      return false;
    }
  }
}
