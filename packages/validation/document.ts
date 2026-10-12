import { z } from "zod";

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB

export const allowedDocumentTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const documentMetadataSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Filename is required.")
    .max(255, "Filename is too long.")
    .refine(
      (name) => !/[\\/]/.test(name) && !/[\x00-\x1F]/.test(name),
      "Filename contains invalid characters."
    ),

  mimeType: z.enum(allowedDocumentTypes),
  sizeBytes: z.number()
    .int()
    .positive()
    .max(MAX_DOCUMENT_SIZE, "File must not exceed 10 MB."),
});

export type DocumentMetadata = z.infer<
  typeof documentMetadataSchema
>;

