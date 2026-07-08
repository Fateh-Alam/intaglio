const fs = require('fs');

const oldContent = fs.readFileSync('page_old.tsx', 'utf-8');
const lines = oldContent.split('\n');

const getColorCastIdx = lines.findIndex(l => l.includes('const getColorCastLabel ='));
const histogramGraphIdx = lines.findIndex(l => l.includes('const HistogramGraph ='));

if (getColorCastIdx !== -1) {
  const helpersStr = lines.slice(getColorCastIdx).join('\n');
  const helpersCode = `
import React, { useEffect, useRef } from "react";
import { HistogramData } from "../types/editor";

` + helpersStr;

  fs.writeFileSync('app/editor/components/HistogramGraph.tsx', helpersCode);
  console.log('Extracted helpers to HistogramGraph.tsx');
}
