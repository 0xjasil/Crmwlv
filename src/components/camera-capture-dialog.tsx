"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Camera,
  RefreshCw,
  RotateCcw,
  Check,
  X,
  Upload,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { uploadDocumentFile } from "@/server/actions/upload-actions";
import { compressImageFile } from "@/lib/image-compress";
import { toast } from "sonner";

interface CameraCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  docKey: string;
  onCaptureSuccess: (url: string) => void;
}

export function CameraCaptureDialog({
  open,
  onOpenChange,
  title,
  docKey,
  onCaptureSuccess,
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileFallbackRef = useRef<HTMLInputElement | null>(null);

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Stop video stream helper
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start video stream
  const startCamera = async (mode: "environment" | "user") => {
    setIsInitializing(true);
    setCameraError(null);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.error("Video play error:", err);
        });
      }
      setIsInitializing(false);
    } catch (err: any) {
      console.warn("Could not start camera with exact constraints, trying fallback:", err);
      try {
        // Fallback constraint
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
        setIsInitializing(false);
      } catch (fallbackErr: any) {
        console.error("Camera access failed:", fallbackErr);
        setCameraError(
          fallbackErr.name === "NotAllowedError" || fallbackErr.name === "PermissionDeniedError"
            ? "Camera permission was denied. Please allow camera access in browser settings or browse to upload."
            : "Unable to access camera on this device. You can browse and select an image below."
        );
        setIsInitializing(false);
      }
    }
  };

  // Switch between front/back camera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Open/Close effect
  useEffect(() => {
    if (open) {
      setCapturedImage(null);
      setCapturedBlob(null);
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedImage(null);
      setCapturedBlob(null);
      setCameraError(null);
    }
    return () => {
      stopStream();
    };
  }, [open]);

  // Snap photo from live video feed
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If front camera, mirror it nicely
    if (facingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
          setCapturedImage(dataUrl);
          stopStream();
        }
      },
      "image/jpeg",
      0.92
    );
  };

  // Discard and retake
  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera(facingMode);
  };

  // Confirm and upload photo
  const handleUsePhoto = async (blobToUpload?: Blob) => {
    const blob = blobToUpload || capturedBlob;
    if (!blob) return;

    try {
      setIsUploading(true);
      const fileName = `${docKey}_${Date.now()}.jpg`;
      const rawFile = new File([blob], fileName, { type: "image/jpeg" });
      const file = await compressImageFile(rawFile, 1600, 1600, 0.82);

      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadDocumentFile(formData);

      if (result.success && result.url) {
        // Ensure direct link with domain name and path format
        const finalUrl = result.url.startsWith("http")
          ? result.url
          : `${window.location.origin}${result.url}`;

        onCaptureSuccess(finalUrl);
        toast.success(`${title} photo captured and saved!`);
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to save photo");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Failed to upload photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle fallback file upload
  const handleFallbackFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUsePhoto(file);
    }
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-black text-white border-zinc-800 shadow-2xl">
        {/* WhatsApp-Style Header */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white tracking-wide drop-shadow">
              {title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!capturedImage && !cameraError && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleToggleFacingMode}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white"
                title="Switch Camera (Front/Back)"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white"
              title="Close Camera"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="relative w-full aspect-[3/4] sm:aspect-[4/3] bg-zinc-950 flex items-center justify-center overflow-hidden">
          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover ${
              capturedImage || cameraError ? "hidden" : "block"
            } ${facingMode === "user" ? "-scale-x-100" : ""}`}
          />

          {/* Captured Image Preview */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured document snapshot"
              className="w-full h-full object-contain bg-black"
            />
          )}

          {/* Initializing Spinner */}
          {isInitializing && !cameraError && !capturedImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <p className="text-xs text-zinc-300">Opening camera...</p>
            </div>
          )}

          {/* Viewfinder Guide Overlay (WhatsApp / Document Scanner style) */}
          {!capturedImage && !cameraError && !isInitializing && (
            <div className="absolute inset-8 pointer-events-none border border-white/20 rounded-xl flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <span className="w-4 h-4 border-t-2 border-l-2 border-white/80 rounded-tl-sm" />
                <span className="w-4 h-4 border-t-2 border-r-2 border-white/80 rounded-tr-sm" />
              </div>
              <p className="text-[11px] text-center text-white/70 drop-shadow">
                Point camera at document & tap capture
              </p>
              <div className="flex justify-between">
                <span className="w-4 h-4 border-b-2 border-l-2 border-white/80 rounded-bl-sm" />
                <span className="w-4 h-4 border-b-2 border-r-2 border-white/80 rounded-br-sm" />
              </div>
            </div>
          )}

          {/* Camera Error / Fallback Card */}
          {cameraError && (
            <div className="p-6 text-center max-w-xs space-y-3 z-10">
              <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>
              <p className="text-xs text-zinc-300">{cameraError}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileFallbackRef.current?.click()}
                className="gap-2 text-xs w-full bg-white text-black hover:bg-zinc-200"
              >
                <Upload className="h-3.5 w-3.5" />
                Select Photo from Device
              </Button>
            </div>
          )}
        </div>

        {/* WhatsApp-Style Shutter & Action Bar */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between">
          {capturedImage ? (
            // Review Actions: Retake vs Confirm
            <div className="flex items-center justify-between w-full gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={handleRetake}
                className="flex-1 border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 gap-1.5 text-xs h-10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retake
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isUploading}
                onClick={() => handleUsePhoto()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs h-10 font-semibold"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Use Photo
                  </>
                )}
              </Button>
            </div>
          ) : (
            // Live Shutter Controls
            <div className="flex items-center justify-between w-full">
              {/* Native device file upload fallback */}
              <input
                ref={fileFallbackRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFallbackFileSelect}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileFallbackRef.current?.click()}
                className="text-xs text-zinc-400 hover:text-white hover:bg-white/10 gap-1.5"
                title="Pick file from phone gallery or files"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Gallery</span>
              </Button>

              {/* WhatsApp Large Shutter Button */}
              <button
                type="button"
                disabled={isInitializing || Boolean(cameraError)}
                onClick={handleCapture}
                className="relative flex items-center justify-center h-16 w-16 rounded-full border-4 border-white bg-transparent hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none"
                title="Capture Photo"
              >
                <span className="h-12 w-12 rounded-full bg-white shadow-lg block" />
              </button>

              {/* Facing mode toggle shortcut */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleToggleFacingMode}
                className="text-xs text-zinc-400 hover:text-white hover:bg-white/10 gap-1.5"
                title="Flip Camera"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Flip</span>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
