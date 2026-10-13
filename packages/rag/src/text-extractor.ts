
import type {
  ExtractedDocument,
  TextExtractor,
} from "./types.js";

const TEXT_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
] as const;

export const textExtractor: TextExtractor = {
  supportedMimeTypes: TEXT_MIME_TYPES,

  async extract(buffer, sourceName) {
    const text = new TextDecoder("utf-8", {
      fatal: true,
    }).decode(buffer);

    const normalizedText = text
      .replace(/\r\n?/g, "\n")
      .replace(/\u0000/g, "")
      .trim();

    const result: ExtractedDocument = {
      text: normalizedText,
      sections: normalizedText
        ? [{ text: normalizedText }]
        : [],
      metadata: {
        mimeType: "text/plain",
        sourceName,
      },
    };

    return result;
  },
};
