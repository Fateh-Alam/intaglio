import { readFileSync } from "node:fs";

const path = process.env.ETCH_VIEWPORT_BENCH_LOG;
if (!path) throw new Error("Set ETCH_VIEWPORT_BENCH_LOG to a completed local Etch viewport run log.");
const lines = readFileSync(path, "utf8").split("\n");
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const percentile = (values, fraction) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1];

const runs = lines.flatMap((line) => {
  if (line.includes("editor-bench {")) return [JSON.parse(line.slice(line.indexOf("{")))];
  if (!line.includes("All frames were shown on screen.")) return [];
  const drag = line.split("120 Hz drag")[1];
  const match = drag?.match(/engine: median [\d.]+ ms, p95 ([\d.]+) ms · seen from the page: median ([\d.]+) ms, p95 ([\d.]+) ms/);
  return match ? [{ photo: "sample", mode: "fit", engineP95: +match[1], median: +match[2], p95: +match[3] }] : [];
});

const metric = (label, description, value, hero = false) => ({ label, description, value, unit: "ms", better: "lower", hero });
const results = {};
for (const [source, mode, label] of [
  ["sample", "fit", "5 MP fitted photo"],
  ["large", "fit", "24 MP fitted photo"],
  ["large", "zoom-mask", "24 MP at 100% with mask overlay"],
  ["large-custom", "fit", "24 MP Display P3 and reordered grade at Fit"],
  ["large-custom", "zoom-mask", "24 MP Display P3 and reordered grade at 100% with mask overlay"],
]) {
  const group = runs.filter((run) => run.photo === source && run.mode === mode);
  if (group.length === 0) continue;
  if (group.length !== 5) throw new Error(`Expected five visible runs for ${label}, got ${group.length}.`);
  const key = source + mode;
  results[`${key}P95`] = metric(`${label} typical run p95`, "Median of five run-level 95th percentiles, from exposure input to GPU completion and a queued presentation.", median(group.map((run) => run.p95)), source === "sample");
  results[`${key}WorstP95`] = metric(`${label} worst run p95`, "Highest 95th-percentile delay in the five visible runs.", Math.max(...group.map((run) => run.p95)));
  if (group.every((run) => run.inputLatencies?.length === 120 && run.inputLatencies.every((delay) => Number.isFinite(delay) && delay >= 0))) {
    results[`${key}InputP95`] = metric(`${label} slider p95`, "95th-percentile latency across all 600 timed exposure inputs, through GPU completion and a queued presentation.", percentile(group.flatMap((run) => run.inputLatencies), 0.95));
  }
  results[`${key}Median`] = metric(`${label} median slider delay`, "Median of five run-level input-to-frame medians.", median(group.map((run) => run.median)));
  results[`${key}Engine`] = metric(`${label} native p95`, "Median of five run-level 95th percentiles after the last input in the rendered frame reaches Rust.", median(group.map((run) => run.engineP95)));
}
if (Object.keys(results).length === 0) throw new Error("The log contains no completed benchmark with a visible Metal window.");
console.log(JSON.stringify({
  title: "Etch for Mac slider latency",
  description: "Five visible-window Apple Metal runs of 120 exposure inputs over one second, with curves, color mixer, grading and a radial adjustment.",
  metrics: results,
}));

if (process.argv.includes("--check")) {
  const workloads = [results.samplefitInputP95, results.largefitInputP95, results["largezoom-maskInputP95"]];
  if (process.argv.includes("--check-custom")) workloads.push(results["large-customzoom-maskInputP95"]);
  if (process.argv.includes("--check-zoom-runs")) {
    workloads.push(results["largezoom-maskWorstP95"]);
    if (process.argv.includes("--check-custom")) workloads.push(results["large-customzoom-maskWorstP95"]);
  }
  if (workloads.some((workload) => !workload)) {
    console.error("The slider gate requires 600 timed inputs for every checked visible main-editor workload.");
    process.exitCode = 1;
  } else {
    for (const workload of workloads.filter(({ value }) => value >= 16)) {
      console.error(`${workload.label} measured ${workload.value} ms. The target is under 16 ms.`);
      process.exitCode = 1;
    }
  }
}
