"use client";

import { useState } from "react";
import { ImagePlus, Film, Images } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import MediaUpload from "../compose/media-upload";
import { cn } from "@/lib/utils";

interface MediaPickerSheetProps {
  mediaUrls: string[];
  onChange: (urls: string[]) => void;
  organizationId: string;
  maxImages?: number;
  /** Trigger variant - compact pentru chat bar */
  variant?: "compact" | "full";
  className?: string;
}

function isVideoUrl(url: string): boolean {
  const exts = ["mp4", "mov", "avi", "m4v", "webm"];
  return exts.some((ext) => url.split("?")[0].toLowerCase().endsWith(`.${ext}`));
}

export default function MediaPickerSheet({
  mediaUrls,
  onChange,
  organizationId,
  maxImages = 10,
  variant = "compact",
  className,
}: MediaPickerSheetProps) {
  const [open, setOpen] = useState(false);

  const count = mediaUrls.length;
  const hasVideo = mediaUrls.some(isVideoUrl);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center rounded-xl transition-all duration-200",
            "bg-white/[0.04] border border-white/[0.06] text-white/50",
            "hover:border-white/20 hover:text-white hover:bg-white/[0.08]",
            variant === "compact" && "w-9 h-9",
            className
          )}
          aria-label="Adaugă imagini sau video"
        >
          {variant === "compact" ? (
            <span className="relative inline-flex">
              {hasVideo ? (
                <Film className="w-4 h-4" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-4 px-1 rounded-full bg-orange-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {count}
                </span>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-2">
              <Images className="w-4 h-4" />
              <span className="text-sm">Media</span>
              {count > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs font-medium">
                  {count}
                </span>
              )}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="h-[70vh] rounded-t-2xl border-t border-white/[0.08] bg-[hsl(var(--surface-overlay))]/95 backdrop-blur-xl"
      >
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-lg font-semibold text-white">
            Imagini și video
          </SheetTitle>
          <p className="text-sm text-white/50">
            Trage fișiere aici sau alege din discul local. Max {maxImages} fișiere.
          </p>
        </SheetHeader>
        <div className="overflow-y-auto -mx-6 px-6">
          <MediaUpload
            mediaUrls={mediaUrls}
            onChange={(urls) => {
              onChange(urls);
              if (urls.length >= maxImages) setOpen(false);
            }}
            organizationId={organizationId}
            maxImages={maxImages}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
