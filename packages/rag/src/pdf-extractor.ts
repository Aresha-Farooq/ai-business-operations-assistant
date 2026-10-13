
import { PDFParse } from "pdf-parse";
import type {
  ExtractedDocument,
  TextExtractor,
} from "./types.js";

export const pdfExtractor: TextExtractor = {
  supportedMimeTypes: ["application/pdf"],

  async extract(buffer, sourceName) {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();

      const text = result.text
        .replace(/\r\n?/g, "\n")
        .replace(/\u0000/g, "")
        .trim();

      const document: ExtractedDocument = {
        text,
        sections: text ? [{ text }] : [],
        metadata: {
          mimeType: "application/pdf",
          sourceName,
        },
      };

      return document;
    } finally {
      await parser.destroy();
    }
  },
};
