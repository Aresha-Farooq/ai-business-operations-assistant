
import { pipeline } from "@huggingface/transformers";

export type EmbeddingVector = number[];

export interface EmbeddingProvider {
  embed(text: string): Promise<EmbeddingVector>;
}

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

function loadExtractor() {
  return pipeline("feature-extraction", MODEL_ID);
}

let extractorPromise: ReturnType<typeof loadExtractor> | undefined;

export const localEmbeddingProvider: EmbeddingProvider = {
  async embed(text: string): Promise<EmbeddingVector> {
    extractorPromise ??= loadExtractor();

    const extractor = await extractorPromise;

    const output = await extractor(text, {
      pooling: "mean",
      normalize: true,
    });

    const vectors = output.tolist() as number[][];
    const vector = vectors[0];

    if (!vector) {
      throw new Error("The embedding model returned no vector.");
    }

    return vector;
  },
};

export async function generateEmbedding(
  text: string,
  provider: EmbeddingProvider = localEmbeddingProvider
): Promise<EmbeddingVector> {
  const normalizedText = text.trim();

  if (!normalizedText) {
    throw new Error("Cannot generate an embedding for empty text.");
  }

  const vector = await provider.embed(normalizedText);

  if (
    vector.length !== 384 ||
    !vector.every(Number.isFinite)
  ) {
    throw new Error("Embedding provider returned an invalid vector.");
  }

  return vector;
}
