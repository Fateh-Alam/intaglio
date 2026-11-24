"use client";

import { useEffect } from "react";
import { useSerwist } from "@serwist/turbopack/react";
import { askConfirm } from "../lib/platform";

export default function SerwistUpdatePrompt() {
  const { serwist } = useSerwist();

  useEffect(() => {
    if (!serwist) return;
    let acceptingUpdate = false;
    const onWaiting = (event: { isUpdate?: boolean }) => {
      if (!event.isUpdate) return;
      void askConfirm("A complete Etch update is ready. Reload now?", { confirmLabel: "Reload" }).then((accepted) => {
        acceptingUpdate = accepted;
        if (accepted) serwist.messageSkipWaiting();
      });
    };
    const onControlling = () => {
      if (acceptingUpdate) window.location.reload();
    };
    serwist.addEventListener("waiting", onWaiting);
    serwist.addEventListener("controlling", onControlling);
    return () => {
      serwist.removeEventListener("waiting", onWaiting);
      serwist.removeEventListener("controlling", onControlling);
    };
  }, [serwist]);

  return null;
}
