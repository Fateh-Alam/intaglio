"use client";

import { useEffect } from "react";
import { useSerwist } from "@serwist/turbopack/react";

export default function SerwistUpdatePrompt() {
  const { serwist } = useSerwist();

  useEffect(() => {
    if (!serwist) return;
    let acceptingUpdate = false;
    const onWaiting = (event: { isUpdate?: boolean }) => {
      if (!event.isUpdate) return;
      acceptingUpdate = window.confirm("A complete Intaglio update is ready. Reload now?");
      if (acceptingUpdate) serwist.messageSkipWaiting();
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
