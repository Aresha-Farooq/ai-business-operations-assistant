
import type { ExtractedDocument, TextExtractor } from "./types.js";
import { textExtractor } from "./text-extractor.js";
import { pdfExtractor } from "./pdf-extractor.js";
import { docxExtractor } from "./docx-extractor.js";
import { xlsxExtractor } from "./xlsx-extractor.js";

const extractors: TextExtractor[] = [
  textExtractor,
  pdfExtractor,
  docxExtractor,
  xlsxExtractor,
];

export async function extractDocument(
  buffer: Buffer,
  mimeType: string,
  sourceName?: string,
): Promise<ExtractedDocument> {
  const extractor = extractors.find((item) =>
    item.supportedMimeTypes.includes(mimeType),
  );

  if (!extractor) {
    throw new Error(`Unsupported document type: ${mimeType}`);
  }

  return extractor.extract(buffer, sourceName);
}
