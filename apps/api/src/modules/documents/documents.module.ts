import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { DOCUMENT_STORAGE } from "./storage/document-storage";
import { ExternalDocumentStorage } from "./storage/external-document.storage";
import { LocalDocumentStorage } from "./storage/local-document.storage";

@Module({
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    {
      provide: DOCUMENT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const provider = config.get<string>(
          "DOCUMENT_STORAGE_PROVIDER",
          "local",
        );

        if (provider === "local") {
          return new LocalDocumentStorage(config);
        }

        if (provider === "s3" || provider === "r2") {
          return new ExternalDocumentStorage();
        }

        throw new Error(`Unknown document storage provider "${provider}"`);
      },
    },
  ],
  exports: [DOCUMENT_STORAGE],
})
export class DocumentsModule {}
