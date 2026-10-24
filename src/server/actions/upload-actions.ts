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

    const originalName = file.name || "document.jpg";
    const extension = path.extname(originalName) || ".jpg";
    const baseName = path
      .basename(originalName, extension)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const uniqueFileName = `${Date.now()}-${baseName}${extension}`;

    let relativePath: string | null = null;

    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "documents");
      await mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, uniqueFileName);
      await writeFile(filePath, buffer);
      relativePath = `/uploads/documents/${uniqueFileName}`;
    } catch (fsErr) {
      console.warn("Public directory is read-only (serverless environment). Using embedded URL format:", fsErr);
    }

    if (relativePath) {
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
    }

    // Fallback: If running on serverless lambda without writable public disk,
    // return direct data URL format that renders everywhere without 404
    const mimeType = file.type || (extension === ".pdf" ? "application/pdf" : "image/jpeg");
    const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return {
      success: true,
      url: dataUrl,
    };
  } catch (error: any) {
    console.error("Document upload error:", error);
    return {
      success: false,
      error: error?.message || "Failed to upload document",
    };
  }
}
