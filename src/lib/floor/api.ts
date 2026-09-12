import { createServerFn } from "@tanstack/react-start";
import type { FloorControl, FloorSnapshot, FixTicket, ReviewStatus } from "./types";

export const getFloorSnapshot = createServerFn({ method: "POST" }).handler(async (): Promise<FloorSnapshot> => {
  const { readSnapshot } = await import("./jim-files.server.ts");
  return readSnapshot();
});

export const postReviewStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: ReviewStatus }) => d)
  .handler(async ({ data }): Promise<FloorSnapshot> => {
    const { setReview } = await import("./jim-files.server.ts");
    const snap = await setReview(data.id, data.status);
    if (data.status === "approved") {
      const { sendApprovedNow } = await import("./hermes.server.ts");
      await sendApprovedNow();
    }
    return snap;
  });

export const postFloorControl = createServerFn({ method: "POST" })
  .inputValidator((d: Partial<FloorControl>) => d)
  .handler(async ({ data }): Promise<FloorSnapshot> => {
    const { writeControl, readSnapshot } = await import("./jim-files.server.ts");
    await writeControl(data);
    const { startHermes, stopHermes } = await import("./hermes.server.ts");
    if (data.systemOn === true) await startHermes();
    if (data.systemOn === false) await stopHermes();
    return readSnapshot();
  });

export const postJimDraft = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; reply: string }) => d)
  .handler(async ({ data }): Promise<FloorSnapshot> => {
    const { setDraft } = await import("./jim-files.server.ts");
    return setDraft(data.id, data.reply);
  });

export const postMichaelFix = createServerFn({ method: "POST" })
  .inputValidator((d: { queueId?: string; from: string; customer: string; jimSaid: string; benWants: string; note: string; test: boolean }) => d)
  .handler(async ({ data }): Promise<FloorSnapshot> => {
    const { addFix } = await import("./jim-files.server.ts");
    return addFix(data);
  });

export const postGrokFix = createServerFn({ method: "POST" })
  .inputValidator((d: { from: string; customer: string; jimSaid: string; note: string; test: boolean }) => d)
  .handler(async ({ data }) => {
    const { rewriteWithGrok } = await import("./grok.server.ts");
    return rewriteWithGrok(data);
  });

export const postFixStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: FixTicket["status"] }) => d)
  .handler(async ({ data }): Promise<FloorSnapshot> => {
    const { setFixStatus } = await import("./jim-files.server.ts");
    return setFixStatus(data.id, data.status);
  });
