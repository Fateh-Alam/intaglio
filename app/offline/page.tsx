import Link from "next/link";

export default function OfflinePage(): React.ReactElement {
  return <main className="intaglio-page flex min-h-screen items-center justify-center px-6 text-center"><div className="max-w-lg"><div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--intaglio-brass)]">Intaglio is offline</div><h1 className="mt-5 font-intaglio-serif text-5xl text-[var(--intaglio-paper)]">The darkroom remains local.</h1><p className="mt-5 text-sm leading-7 text-white/55">The requested page was not in the installed shell. Your photographs and projects have not been uploaded. Return to the editor or reconnect once to finish installing this version.</p><Link className="mt-8 inline-block border border-[var(--intaglio-brass)] px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-[var(--intaglio-brass)]" href="/editor">Open editor</Link></div></main>;
}
