import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const STORAGE_DIR = path.join(
  process.cwd(),
  ".private-storage",
  "documents"
);

const EXTENSIONS: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/csv": ".csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    ".xlsx",
};

export async function saveDocumentFile(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const extension = EXTENSIONS[mimeType];

  if (!extension) {
    throw new Error("Unsupported document type.");
  }

  await mkdir(STORAGE_DIR, { recursive: true });

  const storageKey = `${randomUUID()}${extension}`;
  const filePath = path.join(STORAGE_DIR, storageKey);

  await writeFile(filePath, buffer, { flag: "wx" });

  return storageKey;
}

export async function deleteDocumentFile(
  storageKey: string
): Promise<void> {
  if (path.basename(storageKey) !== storageKey) {
    throw new Error("Invalid storage key.");
  }

  const filePath = path.join(STORAGE_DIR, storageKey);

  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function readDocumentFile(
  storageKey: string
): Promise<Buffer> {
  if (
    !storageKey ||
    path.basename(storageKey) !== storageKey ||
    storageKey.includes("..")
  ) {
    throw new Error("Invalid storage key.");
  }

  const filePath = path.join(STORAGE_DIR, storageKey);
  return readFile(filePath);
}