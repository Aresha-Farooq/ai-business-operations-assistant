export interface ExtractedSection {
  text: string;
  pageNumber?: number;
  sectionTitle?: string;
}

export interface ExtractedDocument {
  text: string;
  sections: ExtractedSection[];
  metadata: {
    mimeType: string;
    pageCount?: number;
    sourceName?: string;
  };
}

export interface TextExtractor {
  supportedMimeTypes: readonly string[];

  extract(
    buffer: Buffer,
    sourceName?: string
  ): Promise<ExtractedDocument>;
}
