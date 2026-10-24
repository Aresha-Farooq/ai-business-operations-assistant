import { NextResponse } from "next/server";
import { requireRole } from "@business-platform/auth/authorization";
import { db, getDbRuntime } from "@business-platform/database";
import { readDocumentFile } from "@/lib/document-storage";
import { processDocument } from "@business-platform/rag/processing";
import {
  saveDocumentChunks,
  deleteDocumentChunks,
} from "@business-platform/rag/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireRole(["OWNER"]);
    const { id } = await context.params;

    if (!/^[1-9]\d*$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid document ID." },
        { status: 400 },
      );
    }

    const documentId = Number(id);

    if (!Number.isSafeInteger(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID." },
        { status: 400 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "A valid JSON body is required." },
        { status: 400 },
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("approvalStatus" in body) ||
      (body.approvalStatus !== "APPROVED" &&
        body.approvalStatus !== "REJECTED")
    ) {
      return NextResponse.json(
        { error: "approvalStatus must be APPROVED or REJECTED." },
        { status: 400 },
      );
    }

    const approvalStatus = body.approvalStatus;
    const runtime = await getDbRuntime();

    const findPlan = db.sql.public.document
      .select(
        "id",
        "name",
        "mimeType",
        "storagePath",
        "status",
        "approvalStatus",
      )
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.id, documentId),
          fns.eq(fields.organizationId, user.organizationId),
        ),
      )
      .build();

    const matches = await runtime.query(findPlan);
    const existingDocument = matches[0];

    if (!existingDocument) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 },
      );
    }

    if (
      existingDocument.approvalStatus !== "PENDING" ||
      existingDocument.status !== "UPLOADED"
    ) {
      return NextResponse.json(
        {
          error:
            "Only pending, uploaded documents can be reviewed. Already approved documents require a separate reprocessing action.",
        },
        { status: 409 },
      );
    }

    const nextStatus =
      approvalStatus === "APPROVED" ? "PROCESSING" : "UPLOADED";

    const updatePlan = db.sql.public.document
      .update({ approvalStatus, status: nextStatus })
      .where((fields, fns) =>
        fns.and(
          fns.eq(fields.id, documentId),
          fns.eq(fields.organizationId, user.organizationId),
          fns.eq(fields.approvalStatus, "PENDING"),
          fns.eq(fields.status, "UPLOADED"),
        ),
      )
      .returning(
        "id",
        "name",
        "mimeType",
        "status",
        "approvalStatus",
        "updatedAt",
      )
      .build();

    const updatedDocuments = await runtime.query(updatePlan);
    const document = updatedDocuments[0];

    if (!document) {
      return NextResponse.json(
        { error: "The document was already reviewed or is no longer available." },
        { status: 409 },
      );
    }

    if (approvalStatus === "REJECTED") {
      return NextResponse.json({
        message: "Document rejected. It will not enter the RAG pipeline.",
        document,
      });
    }

    try {
      const buffer = await readDocumentFile(existingDocument.storagePath);

      const processed = await processDocument(
        buffer,
        existingDocument.mimeType,
        {
          documentId,
          organizationId: user.organizationId,
          documentType: existingDocument.mimeType,
          source: existingDocument.name,
        },
      );

      if (processed.chunks.length === 0) {
        throw new Error("No extractable text was found in the document.");
      }

      await saveDocumentChunks(processed.chunks);

      const completePlan = db.sql.public.document
        .update({ status: "PROCESSED" })
        .where((fields, fns) =>
          fns.and(
            fns.eq(fields.id, documentId),
            fns.eq(fields.organizationId, user.organizationId),
            fns.eq(fields.approvalStatus, "APPROVED"),
            fns.eq(fields.status, "PROCESSING"),
          ),
        )
        .returning(
          "id",
          "name",
          "status",
          "approvalStatus",
          "updatedAt",
        )
        .build();

      const completed = await runtime.query(completePlan);

      if (!completed[0]) {
        throw new Error(
          "Processing finished, but the document status could not be updated.",
        );
      }

      return NextResponse.json({
        message: "Document approved, processed, and indexed successfully.",
        document: completed[0],
        chunkCount: processed.chunks.length,
      });
    } catch (processingError) {
      console.error("Document indexing failed:", processingError);

      try {
        await deleteDocumentChunks(documentId, user.organizationId);
      } catch (cleanupError) {
        console.error("Failed to clean up partial document chunks:", cleanupError);
      }

      try {
        const failedPlan = db.sql.public.document
          .update({ status: "FAILED" })
          .where((fields, fns) =>
            fns.and(
              fns.eq(fields.id, documentId),
              fns.eq(fields.organizationId, user.organizationId),
              fns.eq(fields.approvalStatus, "APPROVED"),
              fns.eq(fields.status, "PROCESSING"),
            ),
          )
          .build();

        await runtime.query(failedPlan);
      } catch (statusError) {
        console.error("Failed to update document status:", statusError);
      }

      return NextResponse.json(
        {
          error:
            "Document was approved, but indexing failed. Check the server logs.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Document approval failed:", error);

    return NextResponse.json(
      { error: "Unable to update document approval." },
      { status: 500 },
    );
  }
}