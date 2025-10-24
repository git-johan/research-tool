"use client";

import { TrashIcon } from "./icons";

interface ClearButtonProps {
  onClick: () => void;
}

export function ClearButton({ onClick }: ClearButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 flex items-center justify-center hover:opacity-70 transition-opacity"
      title="Clear conversation"
    >
      <TrashIcon />
    </button>
  );
}
