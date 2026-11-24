import type { Metadata } from "next";
import NativeViewportProbe from "./NativeViewportProbe";

export const metadata: Metadata = {
  title: "Native Viewport Test",
  robots: { index: false, follow: false },
};

export default function NativeViewportPage(): React.ReactElement {
  return <NativeViewportProbe />;
}
