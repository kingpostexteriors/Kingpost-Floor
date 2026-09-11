import { useEffect } from "react";
import { getFloorSnapshot } from "@/lib/floor/api";
import { useFloor } from "@/lib/floor/store";

export function LiveBridge() {
  const applyLive = useFloor((s) => s.applyLive);
  const tick = useFloor((s) => s.tick);

  useEffect(() => {
    let dead = false;
    void getFloorSnapshot()
      .then((snap) => {
        if (!dead) applyLive(snap, "full");
      })
      .catch(() => {});
    const id = setInterval(() => {
      tick();
      void getFloorSnapshot()
        .then((snap) => {
          if (!dead) applyLive(snap, "queue");
        })
        .catch(() => {});
    }, 2500);
    return () => {
      dead = true;
      clearInterval(id);
    };
  }, [applyLive, tick]);

  return null;
}
