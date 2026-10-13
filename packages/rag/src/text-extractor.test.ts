import { describe, expect, it } from "vitest";
import { textExtractor } from "./text-extractor.js";

describe("textExtractor", () => {
  it("extracts plain text", async () => {
    const buffer = Buffer.from("Hello business assistant!");

    const result = await textExtractor.extract(
      buffer,
      "test.txt"
    );

    expect(result.text).toBe("Hello business assistant!");
    expect(result.sections).toHaveLength(1);
    expect(result.metadata.sourceName).toBe("test.txt");
  });

  it("normalizes line endings and trims whitespace", async () => {
    const buffer = Buffer.from("  First line\r\nSecond line  ");

    const result = await textExtractor.extract(buffer);

    expect(result.text).toBe("First line\nSecond line");
  });

  it("rejects invalid UTF-8", async () => {
    const buffer = Buffer.from([0xff, 0xfe, 0xff]);

    await expect(textExtractor.extract(buffer)).rejects.toThrow();
  });

  it("returns no sections for empty text", async () => {
    const result = await textExtractor.extract(Buffer.from("  "));

    expect(result.text).toBe("");
    expect(result.sections).toHaveLength(0);
  });
});
