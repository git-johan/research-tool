"use client";

import Link from "next/link";
import { SearchIcon } from "./icons";

export function SearchButton() {
  return (
    <Link
      href="/search"
      className="w-9 h-9 flex items-center justify-center hover:opacity-70 transition-opacity"
      title="Search Documents"
    >
      <SearchIcon />
    </Link>
  );
}