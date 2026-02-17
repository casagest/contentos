"use client";

import { Image as ImageIcon } from "lucide-react";
import ImageEditor from "../components/image-editor";

export default function ImageEditorPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/10">
          <ImageIcon className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Editor Imagine</h1>
          <p className="text-xs text-gray-500">
            Creează imagini cu text overlay pentru social media
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
        <ImageEditor />
      </div>
    </div>
  );
}
