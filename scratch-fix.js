const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', 'components', 'landing', 'CameraHUD.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the invalid MotionValue children with a small animated counter component
const fix = `
function MotionNumber({ value, prefix = "", suffix = "", decimal = 0 }: { value: MotionValue<number>; prefix?: string; suffix?: string; decimal?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  
  React.useEffect(() => {
    return value.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = prefix + latest.toFixed(decimal) + suffix;
      }
    });
  }, [value, prefix, suffix, decimal]);

  return <span ref={ref}>{prefix + value.get().toFixed(decimal) + suffix}</span>;
}
`;

content = content.replace('import { motion, useTransform, MotionValue } from "framer-motion";', 'import React from "react";\nimport { motion, useTransform, MotionValue } from "framer-motion";\n' + fix);

content = content.replace('<motion.span>ISO {useTransform(iso, v => Math.floor(v))}</motion.span>', '<MotionNumber value={iso} prefix="ISO " />');
content = content.replace('<motion.span>1/{useTransform(shutterSpeed, v => Math.floor(v))}</motion.span>', '<MotionNumber value={shutterSpeed} prefix="1/" />');
content = content.replace('<motion.span>F/{useTransform(fStop, v => v.toFixed(1))}</motion.span>', '<MotionNumber value={fStop} prefix="F/" decimal={1} />');

fs.writeFileSync(filePath, content);
console.log('Fixed CameraHUD');
