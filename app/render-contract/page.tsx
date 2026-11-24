import type { Metadata } from "next";
import RenderContractProbe from "./RenderContractProbe";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RenderContractPage(): React.ReactElement {
  return <RenderContractProbe />;
}
