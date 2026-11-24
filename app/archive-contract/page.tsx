import type { Metadata } from "next";
import ArchiveContractProbe from "./ArchiveContractProbe";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ArchiveContractPage(): React.ReactElement {
  return <ArchiveContractProbe />;
}
