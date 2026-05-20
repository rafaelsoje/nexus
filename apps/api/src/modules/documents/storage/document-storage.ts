export const DOCUMENT_STORAGE = Symbol("DOCUMENT_STORAGE");

export type StoredDocument = {
  fileName: string;
  storagePath: string;
};

export interface DocumentStorage {
  save(input: { fileName: string; data: Buffer }): Promise<StoredDocument>;
  delete(storagePath: string): Promise<void>;
  exists(storagePath: string): Promise<boolean>;
}
