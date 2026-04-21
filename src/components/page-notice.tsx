"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PageNotice({ message }: { message?: string }) {
  const [open, setOpen] = useState(Boolean(message));

  if (!message || !open) {
    return null;
  }

  return (
    <div className="app-card flex items-start justify-between gap-3 border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-white text-emerald-700">
          <CheckCircle2 className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-900">Action completed</p>
          <p className="mt-1 text-sm text-emerald-800">{message}</p>
        </div>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-emerald-900" onClick={() => setOpen(false)}>
        <X className="size-4" />
      </Button>
    </div>
  );
}
