"use client";

import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Meter } from "@/components/floor/meter";
import { LiveBridge } from "@/components/floor/live-bridge";
import { healthOf, useFloor } from "@/lib/floor/store";
import { TEST_LINE } from "@/lib/floor/types";
import type { QueueItem, ShopMode } from "@/lib/floor/types";

export const Route = createFileRoute("/")({ component: Home });

const modeCopy: Record<ShopMode, { label: string; tone: "ok" | "warn" | "muted" | "live" }> = {
  open: { label: "Shop open", tone: "ok" },
  closed: { label: "Closed", tone: "muted" },
  kid: { label: "Kid mode", tone: "warn" },
  night: { label: "Night off", tone: "muted" },
  creed: { label: "Sunday Creed", tone: "live" },
};

function Home() {
  return (
    <>
      <LiveBridge />
      <Command />
    </>
  );
}

function Command() {
  const [tab, setTab] = useState<"jim" | "michael" | "shop">("jim");
  const mode = useFloor((s) => s.mode);
  const pair = useFloor((s) => s.pair);
  const testMode = useFloor((s) => s.testMode);
  const systemOn = useFloor((s) => s.systemOn);
  const flags = useFloor((s) => s.flags);
  const models = useFloor((s) => s.models);
  const health = healthOf({ systemOn, testMode, mode, flags, models });
  return (
    <div className="min-h-dvh bg-bg pb-16">
      <header className="border-b border-border px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">Kingpost Exteriors</p>
            <h1 className="mt-1 font-display text-3xl font-medium text-cream">Command</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              {pair === "paired" ? "Jim’s desk — edit, approve, or Fix with Grok." : "Waiting to read KingpostJim on this PC."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={health.tone === "ok" ? "ok" : health.tone === "warn" ? "warn" : "muted"}>{health.label}</Badge>
            <Badge tone={modeCopy[mode].tone}>{modeCopy[mode].label}</Badge>
            {testMode ? <Badge tone="warn">TEST · {TEST_LINE}</Badge> : null}
            {pair === "paired" ? <Badge tone="ok">Live queue</Badge> : <Badge>Demo</Badge>}
          </div>
        </div>
        <nav className="mx-auto mt-4 flex max-w-6xl gap-2">
          {(["jim", "michael", "shop"] as const).map((id) => (
            <Button key={id} variant={tab === id ? "default" : "ghost"} size="sm" onClick={() => setTab(id)}>
              {id}
            </Button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-8">
        {tab === "jim" ? <JimDesk /> : null}
        {tab === "michael" ? <MichaelDesk /> : null}
        {tab === "shop" ? <ShopDesk /> : null}
      </main>
    </div>
  );
}

function CommandBar() {
  const [text, setText] = useState("");
  const ask = useFloor((s) => s.ask);
  const reply = useFloor((s) => s.commandReply);
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    ask(text);
    setText("");
  }
  return (
    <Card>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          className="min-h-11 flex-1 rounded-sm border border-border bg-raised px-3 text-sm text-cream"
          placeholder="Tell Command — pause Jim or what is wrong with a reply"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit">Do it</Button>
      </form>
      {reply ? <p className="mt-3 text-sm text-muted">{reply}</p> : null}
    </Card>
  );
}

function JimDesk() {
  const queue = useFloor((s) => s.queue);
  const flags = useFloor((s) => s.flags);
  const resolveFlag = useFloor((s) => s.resolveFlag);
  const pending = queue.filter((q) => q.status === "pending");
  return (
    <div className="space-y-4">
      <CommandBar />
      {flags.length ? (
        <Card>
          <h2 className="font-display text-xl text-cream">Hold</h2>
          <ul className="mt-3 space-y-2">
            {flags.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{f.reason}</span>
                <Button size="sm" variant="quiet" onClick={() => resolveFlag(f.id)}>Cleared</Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-cream">Jim’s replies</h2>
          <Badge tone={pending.length ? "warn" : "ok"}>{pending.length} need you</Badge>
        </div>
        <ul className="mt-4 space-y-4">
          {queue.length === 0 ? <li className="text-sm text-muted">Queue is empty.</li> : null}
          {queue.map((q) => (
            <JimCard key={q.id} item={q} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function JimCard({ item }: { item: QueueItem }) {
  const [reply, setReply] = useState(item.reply ?? "");
  const [note, setNote] = useState("");
  const [paste, setPaste] = useState("");
  const saveDraft = useFloor((s) => s.saveDraft);
  const approveReview = useFloor((s) => s.approveReview);
  const rejectReview = useFloor((s) => s.rejectReview);
  const askGrok = useFloor((s) => s.askGrok);
  const useGrokDraft = useFloor((s) => s.useGrokDraft);
  const dismissGrok = useFloor((s) => s.dismissGrok);
  const grok = useFloor((s) => s.grokById[item.id]);
  return (
    <li className="rounded-lg border border-border bg-raised p-4">
      {item.test ? <Badge tone="warn">TEST</Badge> : null}
      {grok?.status === "working" ? <Badge tone="live">Grok…</Badge> : null}
      {grok?.status === "ready" ? <Badge tone="ok">Grok rewrite</Badge> : null}
      <p className="mt-2 text-sm text-muted">{item.from}</p>
      <p className="mt-1 text-cream">{item.preview}</p>
      <textarea className="mt-3 w-full rounded-sm border border-border bg-bg p-3 text-sm text-cream" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => { saveDraft(item.id, reply); approveReview(item.id); }}>Approve</Button>
        <Button size="sm" variant="quiet" onClick={() => saveDraft(item.id, reply)}>Save edit</Button>
        <Button size="sm" variant="danger" onClick={() => rejectReview(item.id)}>Don’t send</Button>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <p className="label">Fix with Grok</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input className="min-h-11 min-w-0 flex-1 rounded-sm border border-border bg-bg px-3 text-sm text-cream" placeholder="What is wrong (or leave blank)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" variant="outline" disabled={grok?.status === "working"} onClick={() => { saveDraft(item.id, reply); askGrok(item.id, note.trim()); }}>
            {grok?.status === "working" ? "Asking…" : "Fix with Grok"}
          </Button>
        </div>
        {grok?.status === "ready" && grok.draft ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-muted">Grok rewrite</p>
            <p className="text-pretty text-sm text-cream">{grok.draft}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { useGrokDraft(item.id); setReply(grok.draft ?? reply); }}>Use this</Button>
              <Button size="sm" variant="quiet" onClick={() => dismissGrok(item.id)}>Ignore</Button>
            </div>
          </div>
        ) : null}
        {grok?.status === "needs-chat" ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-muted">No Grok key on this PC yet. Copy into your Grok chat, paste the rewrite below.</p>
            {grok.error ? <p className="text-sm text-danger">{grok.error}</p> : null}
            <Button size="sm" variant="quiet" onClick={() => grok.bundle && void navigator.clipboard.writeText(grok.bundle)}>Copy for Grok chat</Button>
            <textarea className="min-h-20 w-full rounded-sm border border-border bg-bg p-3 text-sm" placeholder="Paste Grok rewrite here" value={paste} onChange={(e) => setPaste(e.target.value)} />
            <Button size="sm" disabled={!paste.trim()} onClick={() => { saveDraft(item.id, paste.trim()); setReply(paste.trim()); setPaste(""); dismissGrok(item.id); }}>Use this</Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function MichaelDesk() {
  const fixes = useFloor((s) => s.fixes);
  const markFix = useFloor((s) => s.markFix);
  return (
    <Card>
      <h2 className="font-display text-xl text-cream">Michael — local FAQ surgery</h2>
      <ul className="mt-4 space-y-3">
        {fixes.length === 0 ? <li className="text-sm text-muted">No tickets.</li> : null}
        {fixes.map((f) => (
          <li key={f.id} className="rounded-lg border border-border p-3 text-sm">
            {f.test ? <Badge tone="warn">TEST</Badge> : null}
            <p className="mt-1 text-muted">Customer: {f.customer}</p>
            <p className="mt-1">Jim said: {f.jimSaid}</p>
            <p className="mt-1 text-cream">Ben wants: {f.benWants}</p>
            <p className="mt-2 label">{f.status}</p>
            {f.status === "for-michael" ? (
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => markFix(f.id, "applied")}>Applied</Button>
                <Button size="sm" variant="quiet" onClick={() => markFix(f.id, "discarded")}>Discard</Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ShopDesk() {
  const hw = useFloor((s) => s.hardware);
  const openShop = useFloor((s) => s.openShop);
  const closeShop = useFloor((s) => s.closeShop);
  const kidMode = useFloor((s) => s.kidMode);
  const nightOff = useFloor((s) => s.nightOff);
  const pauseJim = useFloor((s) => s.pauseJim);
  const warmJim = useFloor((s) => s.warmJim);
  const startSystem = useFloor((s) => s.startSystem);
  const stopSystem = useFloor((s) => s.stopSystem);
  const testMode = useFloor((s) => s.testMode);
  const setTestMode = useFloor((s) => s.setTestMode);
  const models = useFloor((s) => s.models);
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-display text-xl text-cream">Controls</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={openShop}>Open shop</Button>
          <Button size="sm" variant="quiet" onClick={closeShop}>Close</Button>
          <Button size="sm" variant="outline" onClick={kidMode}>Kid mode</Button>
          <Button size="sm" variant="outline" onClick={nightOff}>Night off</Button>
          <Button size="sm" variant="quiet" onClick={warmJim}>Warm Jim</Button>
          <Button size="sm" variant="quiet" onClick={pauseJim}>Pause Jim</Button>
          <Button size="sm" onClick={startSystem}>Start</Button>
          <Button size="sm" variant="danger" onClick={stopSystem}>Stop</Button>
          <Button size="sm" variant={testMode ? "default" : "outline"} onClick={() => setTestMode(!testMode)}>Test {testMode ? "on" : "off"}</Button>
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-xl text-cream">Hardware</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Meter label="GPU temp" value={hw.gpuTemp} max={90} unit="°C" warnAt={75} hotAt={83} />
          <Meter label="CPU temp" value={hw.cpuTemp} max={90} unit="°C" warnAt={75} hotAt={85} />
          <Meter label="VRAM" value={hw.vramUsed} max={hw.vramTotal} unit=" GB" warnAt={5} hotAt={5.5} />
          <Meter label="RAM" value={hw.ramUsed} max={hw.ramTotal} unit=" GB" warnAt={28} hotAt={30} />
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-xl text-cream">Models</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {models.map((m) => (
            <li key={m.id}>{m.tag} {m.loaded ? "· loaded" : ""} {m.onDisk ? "· on disk" : ""}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
