import type { Metadata } from "next";
import { Landing } from "./components/landing/Landing";

export const metadata: Metadata = {
  title: "Intaglio — The darkroom, in a browser tab",
  description: "A professional photo editor that runs in your browser. Familiar sliders, masks, a true 1:1 loupe, node grading and LUTs. Your photos are never uploaded.",
};

export default function Home() {
  return <Landing />;
}
