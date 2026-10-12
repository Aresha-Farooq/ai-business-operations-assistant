import { fileTypeFromBuffer } from "file-type";

const OFFICE_MIME_TYPES = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ["[Content_Types].xml", "word/document.xml"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    ["[Content_Types].xml", "xl/workbook.xml"],
} as const;

type OfficeMimeType = keyof typeof OFFICE_MIME_TYPES;

function getZipEntries(buffer: Buffer): Set<string> | null {
  // Find the ZIP end-of-central-directory record.
  const minimumOffset = Math.max(0, buffer.length - 22 - 65535);
  let endOffset = -1;

  for (let i = buffer.length - 22; i >= minimumOffset; i--) {
    if (
      buffer.readUInt32LE(i) === 0x06054b50 &&
      i + 22 + buffer.readUInt16LE(i + 20) === buffer.length
    ) {
      endOffset = i;
      break;
    }
  }

  if (endOffset < 0 || endOffset + 22 > buffer.length) {
    return null;
  }

  const diskNumber = buffer.readUInt16LE(endOffset + 4);
  const centralDisk = buffer.readUInt16LE(endOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(endOffset + 8);
  const totalEntries = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);

  // Reject multi-disk and ZIP64 archives in this MVP validator.
  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    entriesOnDisk !== totalEntries ||
    totalEntries === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff ||
    centralOffset + centralSize > endOffset
  ) {
    return null;
  }

  const entries = new Set<string>();
  let offset = centralOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (
      offset + 46 > buffer.length ||
      buffer.readUInt32LE(offset) !== 0x02014b50
    ) {
      return null;
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const recordLength = 46 + nameLength + extraLength + commentLength;

    if (
      (flags & 0x0001) !== 0 ||
      offset + recordLength > centralOffset + centralSize
    ) {
      return null;
    }

    const name = buffer
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString("utf8");

    entries.add(name);
    offset += recordLength;
  }

  if (offset !== centralOffset + centralSize) {
    return null;
  }

  return entries;
}

export async function validateDocumentContent(
  buffer: Buffer,
  mimeType: string
): Promise<boolean> {
  const textTypes = new Set([
    "text/plain",
    "text/markdown",
    "text/csv",
  ]);

  if (textTypes.has(mimeType)) {
    try {
      const content = new TextDecoder("utf-8", {
        fatal: true,
      }).decode(buffer);

      return !content.includes("\u0000");
    } catch {
      return false;
    }
  }

  const detected = await fileTypeFromBuffer(buffer);

  if (mimeType === "application/pdf") {
    return detected?.mime === "application/pdf";
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    if (
      detected?.mime !== "application/zip" &&
      detected?.mime !== mimeType
    ) {
      return false;
    }

    const entries = getZipEntries(buffer);
    if (!entries) return false;

    const requiredEntries =
      OFFICE_MIME_TYPES[mimeType as OfficeMimeType];

    return requiredEntries.every((entry) => entries.has(entry));
  }

  return false;
}