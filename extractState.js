const fs = require('fs');

const pageContent = fs.readFileSync('app/editor/page.tsx', 'utf-8');
const lines = pageContent.split('\n');

const homeStart = lines.findIndex(l => l.includes('export default function Home() {'));
const mainReturn = lines.findIndex((l, i) => i > homeStart && l.includes('return (') && lines[i-1].includes('if (!imageSrc) {'));

// Extract imports up to line 90 roughly (before CinematicEditor)
const importsAndTypes = lines.slice(0, 739).join('\n');

const stateContent = lines.slice(homeStart + 1, mainReturn - 2).join('\n');

// Try to find all the state variable names to return them
const stateDeclarations = stateContent.match(/const \[[a-zA-Z0-9]+, set[a-zA-Z0-9]+\] = useState/g) || [];
const variables = stateDeclarations.map(d => d.replace('const [', '').split(',')[0]);
const setters = stateDeclarations.map(d => d.replace('const [', '').split(',')[1].split(']')[0].trim());

const callbacks = [...stateContent.matchAll(/const ([a-zA-Z0-9]+) = (useCallback|useMemo|\(|async \()/g)].map(m => m[1]);
const nonStateVars = ['historyTimeoutRef', 'fileInputRef', 'lutInputRef'];

// we can just return everything that looks like a function or a ref
const hookCode = `
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
// ... imports ...

export function useEditorState() {
${stateContent}

  return {
    ${variables.join(',\n    ')},
    ${setters.join(',\n    ')},
    ${callbacks.join(',\n    ')}
    // (We will manually fix up the return block later)
  };
}
`;

fs.writeFileSync('app/editor/hooks/useEditorState.ts', hookCode);
console.log('Extracted state to useEditorState.ts');
