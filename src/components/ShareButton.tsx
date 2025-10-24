"use client";

import { ShareIcon } from "./icons";

interface ShareButtonProps {
  onClick: () => void;
  isCopying: boolean;
}

export function ShareButton({ onClick, isCopying }: ShareButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isCopying}
      className="w-9 h-9 flex items-center justify-center hover:opacity-70 transition-opacity disabled:opacity-50"
      title="Share conversation"
    >
      <ShareIcon />
    </button>
  );
}
