const fs = require('fs');

const getImports = (content) => {
  const missingIcons = [];
  const iconsToCheck = ['IconUpload', 'IconMovie', 'IconPhoto', 'IconEye', 'IconCommand', 'IconMaximize', 'IconDeviceFloppy', 'IconDownload', 'IconMinus', 'IconAdjustmentsHorizontal', 'IconHistory', 'IconLayersIntersect', 'IconInfoCircle', 'IconX', 'IconMenu2', 'IconCircle', 'IconChartLine', 'IconBrush', 'IconTypography', 'IconArrowsMaximize', 'IconSparkles', 'IconCamera', 'IconRotateClockwise', 'IconZoomIn', 'IconSun', 'IconContrast', 'IconPalette', 'IconAperture', 'IconBolt', 'IconBulb', 'IconMapPin', 'IconDeviceDesktop', 'IconPerspective', 'IconDroplet', 'IconChevronRight', 'IconFileCode', 'IconCircles', 'IconMoon', 'IconCircleFilled', 'IconChevronLeft'];
  
  iconsToCheck.forEach(icon => {
    if (content.includes(icon)) missingIcons.push(icon);
  });

  let importStr = '';
  if (missingIcons.length > 0) {
    importStr += `import { ${missingIcons.join(', ')} } from "@tabler/icons-react";\n`;
  }

  if (content.includes('<Slider')) importStr += `import Slider from "../components/Slider";\n`;
  if (content.includes('<ControlGroup')) importStr += `import ControlGroup from "../components/ControlGroup";\n`;
  if (content.includes('<CinematicEditor')) importStr += `import dynamic from "next/dynamic";\nconst CinematicEditor = dynamic(() => import("../components/CinematicEditor"), { ssr: false });\n`;
  if (content.includes('<StatusChip')) importStr += `const StatusChip = ({ label, value }: { label: string; value: string }) => (<div className="rounded-lg border border-[var(--ormond-line)] bg-white/[0.03] px-2 py-2"><div className="font-mono text-[8px] uppercase tracking-[0.26em] text-[rgba(231,223,208,0.25)]">{label}</div><div className="mt-1 font-mono text-[10px] text-[rgba(231,223,208,0.55)]">{value}</div></div>);\n`;
  if (content.includes('<HistogramGraph')) importStr += `import { HistogramGraph, ScopeMetric, getColorCastLabel } from "../components/HistogramGraph";\n`; // We will need to make these if they don't exist. Actually they were in page.tsx!

  return importStr;
};

['app/editor/components/EditorLeftSidebar.tsx', 'app/editor/components/EditorWorkspaceCanvas.tsx', 'app/editor/components/EditorRightSidebar.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace('// .. add missing imports ..', getImports(content));
  fs.writeFileSync(file, content);
});

console.log('Fixed imports');
