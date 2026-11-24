import Link from "next/link";
import { BrandMark } from "../editor/shell/TopBar";

export default function OfflinePage(): React.ReactElement {
  return (
    <main className="ui-root flex min-h-screen items-center justify-center bg-[#0b0b0c] px-6 text-center text-white">
      <div className="max-w-md rounded-[22px] bg-white/[0.025] p-8 ring-1 ring-inset ring-white/[0.07]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-white/[0.05] text-white/85 ring-1 ring-inset ring-white/[0.08]">
          <BrandMark size={24} />
        </div>
        <p className="mt-5 text-[11.5px] font-medium uppercase tracking-[0.14em] text-[#7aafff]">
          Etch is offline
        </p>
        <h1 className="type-display mt-3 text-[42px] leading-[1.04] text-white">
          The darkroom remains local.
        </h1>
        <p className="mt-4 text-[14px] leading-[1.65] text-white/55">
          The requested page was not in the installed shell. Your photographs and projects stay on your device. Return to the editor or reconnect once to finish installing this version.
        </p>
        <Link
          className="ui-focus mt-7 inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-[13.5px] font-semibold text-[#0c0c0d] transition-colors hover:bg-[#ececee]"
          href="/editor"
        >
          Open editor
        </Link>
      </div>
    </main>
  );
}
