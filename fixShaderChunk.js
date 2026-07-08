const fs = require('fs');
let file = fs.readFileSync('app/lib/filmShaderChunk.ts', 'utf-8');

const blocks = [];
const regex = /(?:else )?if \(filmType == (\d+)\) \{([\s\S]*?)\}/g;
let match;
while ((match = regex.exec(file)) !== null) {
  const typeId = parseInt(match[1]);
  if (typeId === 0) continue;
  blocks.push({ id: typeId, code: match[2] });
}

let newShader = "export const FILM_EMULATION_SHADER_CHUNK = `\n";
const CHUNK_SIZE = 10;
const numChunks = Math.ceil(blocks.length / CHUNK_SIZE);

for (let i = 0; i < numChunks; i++) {
  newShader += "  vec3 applyFilmChunk_" + i + "(vec3 color, int filmType, float strength) {\n";
  newShader += "    vec3 filmColor = color;\n";
  const chunkBlocks = blocks.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
  for (const b of chunkBlocks) {
    newShader += "    if (filmType == " + b.id + ") {" + b.code + "      return mix(color, filmColor, strength);\n    }\n";
  }
  newShader += "    return color;\n  }\n";
}

newShader += "  vec3 applyFilmEmulation(vec3 color, int filmType, float strength) {\n";
newShader += "    if (filmType == 0) return color;\n";

for (let i = 0; i < numChunks; i++) {
  const chunkBlocks = blocks.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
  const maxId = chunkBlocks[chunkBlocks.length - 1].id;
  newShader += "    if (filmType <= " + maxId + ") return applyFilmChunk_" + i + "(color, filmType, strength);\n";
}

newShader += "    return color;\n  }\n`;\n";

fs.writeFileSync('app/lib/filmShaderChunk.ts', newShader);
console.log('Successfully chunked the shader!');
