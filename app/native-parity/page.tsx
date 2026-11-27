import type { Metadata } from "next";
import NativeParityProbe from "./NativeParityProbe";

export const metadata: Metadata = {
  title: "Native Parity",
  robots: { index: false, follow: false },
};

export default function NativeParityPage(): React.ReactElement {
  return <NativeParityProbe />;
}
