"use client";

import ImageEditor from "../components/image-editor";

export default function ImageEditorPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-xl bg-card border border-border p-4">
        <ImageEditor />
      </div>
    </div>
  );
}
