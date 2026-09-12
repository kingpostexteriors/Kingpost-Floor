"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFloor } from "@/lib/floor/store";
import { formatWhen } from "@/lib/floor/preview";
import type { QueueItem } from "@/lib/floor/types";

export function JimCard({ item }: { item: QueueItem }) {
  const pending = item.status === "pending" && !item.sent;
  const [open, setOpen] = useState(pending);
  const [reply, setReply] = useState(item.reply ?? "");
  const [note, setNote] = useState("");
  const saveDraft = useFloor((s) => s.saveDraft);
  const approveReview = useFloor((s) => s.approveReview);
  const rejectReview = useFloor((s) => s.rejectReview);
  const askGrok = useFloor((s) => s.askGrok);
  const grok = useFloor((s) => s.grokById[item.id]);
  const when = formatWhen(item.at);

  if (!open) {
    return (
      <li className="flex items-center gap-2 border-b border-border py-2 text-sm">
        {item.test ? <Badge tone="warn">TEST</Badge> : null}
        {item.status === "rejected" ? <Badge tone="danger">Won't send</Badge> : null}
        {item.sent ? <Badge>Sent</Badge> : null}
        <span className="shrink-0 text-muted">{item.from}</span>
        <span className="w-36 shrink-0 text-xs text-muted">{when}</span>
        <span className="min-w-0 flex-1 truncate text-cream">{item.preview}</span>
        <Button size="sm" variant="quiet" onClick={() => setOpen(true)}>Open</Button>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-border bg-raised p-3">
      <div className="flex flex-wrap items-center gap-2">
        {item.test ? <Badge tone="warn">TEST</Badge> : null}
        {item.status === "rejected" ? <Badge tone="danger">Won't send</Badge> : null}
        {item.sent ? <Badge>Sent</Badge> : null}
        <button type="button" className="ml-auto text-xs text-muted" onClick={() => setOpen(false)}>Close</button>
      </div>
      <p className="mt-1 text-sm text-muted">{item.from}{when ? " · " + when : ""}</p>
      <p className="mt-1 text-cream">{item.preview}</p>
      <textarea className="mt-2 w-full rounded-sm border border-border bg-bg p-2 text-sm text-cream" rows={2} value={reply} onChange={(e) => setReply(e.target.value)} />
      {pending ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { saveDraft(item.id, reply); approveReview(item.id); }}>Approve</Button>
          <Button size="sm" variant="quiet" onClick={() => saveDraft(item.id, reply)}>Save</Button>
          <Button size="sm" variant="danger" onClick={() => rejectReview(item.id)}>Don't send</Button>
        </div>
      ) : null}
      <div className="mt-2 flex gap-2">
        <input className="min-h-9 min-w-0 flex-1 rounded-sm border border-border bg-bg px-2 text-sm" placeholder="Fix with Grok" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" variant="outline" disabled={grok?.status === "working"} onClick={() => { saveDraft(item.id, reply); askGrok(item.id, note.trim()); }}>Grok</Button>
      </div>
    </li>
  );
}
