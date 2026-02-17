"use client";

import { useCallback } from "react";
import { useToast } from "@/components/ui/toast";

export function useCopy() {
  const { success, error } = useToast();

  const copy = useCallback(
    async (text: string, label?: string) => {
      try {
        await navigator.clipboard.writeText(text);
        success(label || "Copiat!", "Conținutul a fost copiat în clipboard.");
        return true;
      } catch {
        error("Eroare", "Nu s-a putut copia în clipboard.");
        return false;
      }
    },
    [success, error]
  );

  return copy;
}
