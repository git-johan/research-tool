"use client";

import Link from "next/link";
import { SettingsIcon } from "./icons";

export function SettingsButton() {
  return (
    <Link
      href="/setup"
      className="w-9 h-9 flex items-center justify-center hover:opacity-70 transition-opacity"
      title="Settings"
    >
      <SettingsIcon />
    </Link>
  );
}
