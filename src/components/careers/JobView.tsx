"use client";
import { useEffect } from "react";
export function JobView({ id }: { id: string }) {
  useEffect(() => { void fetch(`/api/jobs/${id}/view`, { method: "POST", keepalive: true }).catch(() => {}); }, [id]);
  return null;
}
