import { createServerFn } from "@tanstack/react-start";
import type { FloorControl, FloorSnapshot, ReviewStatus } from "./types";

export const getFloorSnapshot = createServerFn({ method: "POST" }).handler(
  async (): Promise<FloorSnapshot> => {
    const { readSnapshot } = await import("./jim-files.server.ts");
    return readSnapshot();
  },
);
