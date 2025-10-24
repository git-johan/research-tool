"use client";

import Link from "next/link";
import { EditIcon } from "./icons";

interface EditButtonProps {
  href: string;
}

export function EditButton({ href }: EditButtonProps) {
  return (
    <Link
      href={href}
      className="w-9 h-9 flex items-center justify-center hover:opacity-70 transition-opacity"
      title="Edit persona"
    >
      <EditIcon />
    </Link>
  );
}
