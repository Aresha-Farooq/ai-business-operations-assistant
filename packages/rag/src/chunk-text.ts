
export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

export interface TextChunk {
  index: number;
  text: string;
}

export function splitTextIntoChunks(
  input: string,
  options: ChunkOptions = {},
): TextChunk[] {
  const chunkSize = options.chunkSize ?? 1000;
  const overlap = options.overlap ?? 150;

  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new Error("chunkSize must be a positive integer.");
  }

  if (
    !Number.isInteger(overlap) ||
    overlap < 0 ||
    overlap >= chunkSize
  ) {
    throw new Error("overlap must be a non-negative integer smaller than chunkSize.");
  }

  const text = input.trim();

  if (!text) return [];

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Prefer ending at a word or paragraph boundary.
    if (end < text.length) {
      const boundary = Math.max(
        text.lastIndexOf("\n", end),
        text.lastIndexOf(" ", end),
      );

      if (boundary > start + chunkSize * 0.6) {
        end = boundary;
      }
    }

    const chunk = text.slice(start, end).trim();

    if (chunk) {
      chunks.push({
        index: chunks.length,
        text: chunk,
      });
    }

    if (end >= text.length) break;

    start = Math.max(start + 1, end - overlap);
  }

  return chunks;
}
