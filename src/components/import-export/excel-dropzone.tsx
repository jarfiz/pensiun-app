"use client";

import React, { useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExcelDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function ExcelDropzone({
  onFileSelected,
  disabled = false,
}: ExcelDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    onFileSelected(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        dragging
          ? "border-[#1E3A5F] bg-slate-100"
          : "border-slate-300 bg-slate-50/70 hover:border-[#1E3A5F]/60 hover:bg-slate-50",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="flex size-12 items-center justify-center rounded-full bg-white shadow-xs ring-1 ring-slate-200">
        <FileSpreadsheet className="size-6 text-[#1E3A5F]" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-800">
        Klik atau seret file Excel BRIDA / UPTB ke sini
      </p>
      <p className="mt-1 max-w-md text-xs text-slate-500">
        Mendukung format multi-sheet langsung (<code>PNS BRIDA</code>,{" "}
        <code>UPTB KRS BRIDA</code>, <code>UPTB STP BRIDA</code>) tanpa perlu mengubah struktur kolom terlebih dahulu.
      </p>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
        <Upload className="size-3.5" />
        <span>Pilih File (.xlsx / .xls)</span>
      </div>
    </div>
  );
}
