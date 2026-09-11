"use client";
import { useRef } from "react";
import { adminButtonSecondary } from "./ui";
export function ResumeViewer({ id, pdf }: { id: string; pdf: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  return <div className="space-y-4"><div className="flex flex-wrap gap-3"><a className={adminButtonSecondary} href={`/api/admin/applications/${id}/resume?download=1`}>Download resume</a>{pdf && <button className={adminButtonSecondary} onClick={() => { try { frame.current?.contentWindow?.print(); } catch { window.open(`/api/admin/applications/${id}/resume`, "_blank", "noopener,noreferrer"); } }}>Print</button>}</div>{pdf ? <iframe ref={frame} title="Private candidate resume" src={`/api/admin/applications/${id}/resume`} className="h-[75vh] w-full rounded-[3px] border border-paper-300 bg-white" /> : <p className="rounded-[3px] border border-paper-300 bg-white p-5 text-sm">Word documents cannot be previewed reliably in the browser. Download this resume to open it in your document viewer.</p>}</div>;
}
