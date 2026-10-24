"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { headers } from "next/headers";

export async function uploadDocumentFile(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
    await mkdir(uploadDir, { recursive: true });

    const originalName = file.name || "document.jpg";
    const extension = path.extname(originalName) || ".jpg";
    const baseName = path
      .basename(originalName, extension)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const uniqueFileName = `${Date.now()}-${baseName}${extension}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    await writeFile(filePath, buffer);

    const relativePath = `/uploads/documents/${uniqueFileName}`;

    // Format full domain name + path URL so it stores as direct hosted link in DB
    let fullUrl = relativePath;
    try {
      const headerList = await headers();
      const host = headerList.get("x-forwarded-host") || headerList.get("host");
      const proto =
        headerList.get("x-forwarded-proto") ||
        (host?.includes("localhost") ? "http" : "https");

      if (host) {
        fullUrl = `${proto}://${host}${relativePath}`;
      }
    } catch (headerErr) {
      console.warn("Could not read host headers for upload:", headerErr);
    }

    return {
      success: true,
      url: fullUrl,
    };
  } catch (error: any) {
    console.error("Document upload error:", error);
    return {
      success: false,
      error: error?.message || "Failed to upload document",
    };
  }
}
