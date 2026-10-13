
import * as XLSX from "xlsx";
import type {
  ExtractedDocument,
  TextExtractor,
} from "./types.js";

export const xlsxExtractor: TextExtractor = {
  supportedMimeTypes: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],

  async extract(buffer, sourceName) {
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sections = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];

      const text = sheet
        ? XLSX.utils.sheet_to_csv(sheet).trim()
        : "";

      return {
        text,
        sectionTitle: sheetName,
      };
    }).filter((section) => section.text.length > 0);

    return {
      text: sections
        .map((section) => `Sheet: ${section.sectionTitle}\n${section.text}`)
        .join("\n\n"),
      sections,
      metadata: {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sourceName,
      },
    };
  },
};
