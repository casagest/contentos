"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  Film,
  GripVertical,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MediaUploadProps {
  mediaUrls: string[];
  onChange: (urls: string[]) => void;
  organizationId: string;
  maxImages?: number;
}

interface PreviewItem {
  url: string;
  type: "image" | "video";
  uploading?: boolean;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "avi", "m4v", "webm"];
const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

function getFileType(file: File): "image" | "video" | null {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (IMAGE_EXTENSIONS.includes(ext) || file.type.startsWith("image/")) return "image";
  if (VIDEO_EXTENSIONS.includes(ext) || file.type.startsWith("video/")) return "video";
  return null;
}

function isVideoUrl(url: string): boolean {
  const clean = url.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => clean.endsWith(`.${ext}`));
}

export default function MediaUpload({
  mediaUrls,
  onChange,
  organizationId,
  maxImages = 10,
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const items: PreviewItem[] = mediaUrls.map((url) => ({
    url,
    type: isVideoUrl(url) ? "video" : "image",
  }));

  const hasVideo = items.some((i) => i.type === "video");

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      setError(null);

      // Validate files
      for (const file of fileArr) {
        const type = getFileType(file);
        if (!type) {
          setError(`Format invalid: ${file.name}. Acceptate: jpg, png, webp, gif, mp4, mov.`);
          return;
        }
        if (type === "image" && file.size > MAX_IMAGE_SIZE) {
          setError(`${file.name} depaseste limita de 8MB.`);
          return;
        }
        if (type === "video" && file.size > MAX_VIDEO_SIZE) {
          setError(`${file.name} depaseste limita de 100MB.`);
          return;
        }
        if (type === "video" && (hasVideo || fileArr.filter((f) => getFileType(f) === "video").length > 1)) {
          setError("Se poate urca doar un singur video.");
          return;
        }
      }

      // Check total count
      const totalAfter = mediaUrls.length + fileArr.length;
      if (totalAfter > maxImages) {
        setError(`Maximum ${maxImages} fisiere. Ai deja ${mediaUrls.length}.`);
        return;
      }

      setUploading(true);
      const supabase = createClient();
      const newUrls: string[] = [];

      try {
        for (const file of fileArr) {
          const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
          const fileName = `${organizationId}/${crypto.randomUUID()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("media")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          const { data: publicUrlData } = supabase.storage
            .from("media")
            .getPublicUrl(fileName);

          newUrls.push(publicUrlData.publicUrl);
        }

        onChange([...mediaUrls, ...newUrls]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare la upload.");
      } finally {
        setUploading(false);
      }
    },
    [mediaUrls, onChange, organizationId, maxImages, hasVideo]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files);
        e.target.value = ""; // Reset input
      }
    },
    [uploadFiles]
  );

  const removeItem = (index: number) => {
    const updated = mediaUrls.filter((_, i) => i !== index);
    onChange(updated);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= mediaUrls.length) return;
    const updated = [...mediaUrls];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onChange(updated);
  };

  // Determine content type indicator
  const contentTypeLabel = items.length === 0
    ? null
    : items.length === 1 && items[0].type === "video"
      ? "Reel"
      : items.length === 1
        ? "Imagine"
        : `Carousel (${items.length})`;

  return (
    <div className="space-y-3">
      {/* Content type indicator */}
      {contentTypeLabel && (
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-brand-600/15 text-brand-300 border border-brand-500/30">
            {items[0].type === "video" ? (
              <Film className="w-3 h-3 inline mr-1" />
            ) : (
              <ImageIcon className="w-3 h-3 inline mr-1" />
            )}
            {contentTypeLabel}
          </span>
        </div>
      )}

      {/* Preview grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {items.map((item, index) => (
            <div
              key={item.url}
              className="relative group aspect-square rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.08]"
            >
              {item.type === "video" ? (
                <div className="w-full h-full flex items-center justify-center bg-black/40">
                  <Film className="w-8 h-8 text-white/60" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                {items.length > 1 && index > 0 && (
                  <button
                    onClick={() => moveItem(index, index - 1)}
                    className="p-1 rounded bg-black/60 text-white hover:bg-black/80 transition"
                    title="Muta inainte"
                  >
                    <GripVertical className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => removeItem(index)}
                  className="p-1 rounded bg-red-600/80 text-white hover:bg-red-500 transition"
                  title="Sterge"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Index badge */}
              {items.length > 1 && (
                <span className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {index + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {mediaUrls.length < maxImages && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition ${
            dragOver
              ? "border-brand-500/50 bg-brand-500/5"
              : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]"
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
              <span className="text-sm text-gray-400">Se incarca...</span>
            </div>
          ) : (
            <div className="py-2">
              <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-400">
                Trage fisiere aici sau <span className="text-brand-400">alege</span>
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                JPG, PNG, WebP, GIF, MP4, MOV - max {maxImages} fisiere
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
