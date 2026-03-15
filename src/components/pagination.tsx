"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ totalPages, currentPage }: { totalPages: number; currentPage: number }) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function pageUrl(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Link href={pageUrl(currentPage - 1)} aria-disabled={currentPage <= 1}>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </Link>
      <span className="text-sm text-muted-foreground">
        {currentPage} / {totalPages}
      </span>
      <Link href={pageUrl(currentPage + 1)} aria-disabled={currentPage >= totalPages}>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
