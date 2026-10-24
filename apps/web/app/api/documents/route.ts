import { NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import { requireRole } from "@business-platform/auth/authorization";
import { documentMetadataSchema } from "@business-platform/validation/document";
import {
  saveDocumentFile,
  deleteDocumentFile,
} from "@/lib/document-storage";
import { db, getDbRuntime } from "@business-platform/database";
import { validateDocumentContent } from "@/lib/document-content-validation";


export const runtime = "nodejs";

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
]);

export async function POST(request: Request) {
  try {
    // 1. Only authenticated owners can upload official documents.
    const user = await requireRole(["OWNER"]);

    // 2. Read the multipart form data.
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a document." },
        { status: 400 }
      );
    }

    // 3. Validate the declared filename, MIME type, and file size.
    const validation = documentMetadataSchema.safeParse({
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ??
            "Invalid document.",
        },
        { status: 400 }
      );
    }

    // 4. Read the file contents.
    const buffer = Buffer.from(await file.arrayBuffer());


    const isValidContent = await validateDocumentContent(
  buffer,
  validation.data.mimeType
);

if (!isValidContent) {
  return NextResponse.json(
    { error: "The uploaded file content is invalid." },
    { status: 400 }
  );
}




    // Confirm the actual byte count matches the reported size.
    if (buffer.length !== validation.data.sizeBytes) {
      return NextResponse.json(
        { error: "The uploaded file size is invalid." },
        { status: 400 }
      );
    }

    // 5. Validate text files as UTF-8 and reject binary content.
    if (TEXT_MIME_TYPES.has(validation.data.mimeType)) {
      try {
        const decoder = new TextDecoder("utf-8", { fatal: true });
        const content = decoder.decode(buffer);

        if (content.includes("\u0000")) {
          return NextResponse.json(
            { error: "Binary content is not allowed in text documents." },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Text documents must contain valid UTF-8 text." },
          { status: 400 }
        );
      }
    } else {
      // 6. Detect binary file type from its contents, not its filename.
      const detectedType = await fileTypeFromBuffer(buffer);

      if (!detectedType ||
          detectedType.mime !== validation.data.mimeType) {
        return NextResponse.json(
          {
            error:
              "The file contents do not match the declared file type.",
          },
          { status: 400 }
        );
      }
    }

    // 7. Save the file privately, then create its database record.
    let storageKey: string | undefined;

    try {
      storageKey = await saveDocumentFile(
        buffer,
        validation.data.mimeType
      );

      const runtime = await getDbRuntime();

      const insertPlan = db.sql.public.document
        .insert([
          {
            organizationId: user.organizationId,
            name: validation.data.name,
            mimeType: validation.data.mimeType,
            sizeBytes: validation.data.sizeBytes,
            storagePath: storageKey,
            status: "UPLOADED",
            approvalStatus: "PENDING",
            uploadedBy: user.userId,
          },
        ])
        .returning(
          "id",
          "name",
          "mimeType",
          "sizeBytes",
          "status",
          "approvalStatus",
          "createdAt"
        )
        .build();

      const documents = await runtime.query(insertPlan);
      const document = documents[0];

      if (!document) {
        throw new Error("Failed to save document metadata.");
      }

      // The file and database record now exist successfully.
      return NextResponse.json(
        {
          message: "Document uploaded successfully.",
          document,
        },
        { status: 201 }
      );
    } catch (error) {
      // Clean up the file if creating its database record fails.
      if (storageKey) {
        try {
          await deleteDocumentFile(storageKey);
        } catch (cleanupError) {
          console.error(
            "Failed to clean up document storage:",
            cleanupError
          );
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("Document upload failed:", error);

    return NextResponse.json(
      { error: "Unable to upload document." },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    const user = await requireRole(["OWNER"]);
    const runtime = await getDbRuntime();

    const query = db.sql.public.document
      .select(
        "id",
        "name",
        "mimeType",
        "sizeBytes",
        "status",
        "approvalStatus",
        "createdAt",
        "updatedAt",
      )
      .where((fields, fns) =>
        fns.eq(fields.organizationId, user.organizationId),
      )
      .build();

    const documents = await runtime.query(query);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Document listing failed:", error);

    return NextResponse.json(
      { error: "Unable to load documents." },
      { status: 500 },
    );
  }
}