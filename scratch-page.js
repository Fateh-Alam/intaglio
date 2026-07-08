const fs = require('fs');

const pageCode = `
import { CameraJourney } from "./components/landing/CameraJourney";

export default function Home() {
  return (
    <main className="bg-[#050505] min-h-screen">
      <CameraJourney />
    </main>
  );
}
`;

fs.writeFileSync('app/page.tsx', pageCode);
console.log('page.tsx replaced');
