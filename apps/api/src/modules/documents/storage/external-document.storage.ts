import { Injectable, NotImplementedException } from "@nestjs/common";
import { DocumentStorage, StoredDocument } from "./document-storage";

@Injectable()
export class ExternalDocumentStorage implements DocumentStorage {
  async save(): Promise<StoredDocument> {
    this.notConfigured();
  }

  async delete(): Promise<void> {
    this.notConfigured();
  }

  async exists(): Promise<boolean> {
    this.notConfigured();
  }

  private notConfigured(): never {
    throw new NotImplementedException(
      "External document storage is not configured yet",
    );
  }
}
