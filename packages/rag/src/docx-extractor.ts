
import mammoth from "mammoth";
import type {
  ExtractedDocument,
  TextExtractor,
} from "./types.js";

export const docxExtractor: TextExtractor = {
  supportedMimeTypes: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],

  async extract(buffer, sourceName) {
    const result = await mammoth.extractRawText({ buffer });

    const text = result.value
      .replace(/\r\n?/g, "\n")
      .replace(/\u0000/g, "")
      .trim();

    const document: ExtractedDocument = {
      text,
      sections: text ? [{ text }] : [],
      metadata: {
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sourceName,
      },
    };

    return document;
  },
};
