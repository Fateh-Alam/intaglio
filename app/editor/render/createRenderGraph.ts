import { RenderGraph } from "./RenderGraph";
import { GeometryPass } from "./passes/GeometryPass";
import { InputTransformPass } from "./passes/InputTransformPass";
import { BaseDevelopPass } from "./passes/BaseDevelopPass";
import { ToneCurvePass } from "./passes/ToneCurvePass";
import { OklchMixerPass } from "./passes/OklchMixerPass";
import { ColorWheelsPass } from "./passes/ColorWheelsPass";
import { LutPass } from "./passes/LutPass";
import { MaskBlendPass } from "./passes/MaskBlendPass";
import { FilmEmulationPass } from "./passes/FilmEmulationPass";
import { HalationPass } from "./passes/HalationPass";
import { BloomPass } from "./passes/BloomPass";
import { OpticalFXPass } from "./passes/OpticalFXPass";
import { SharpenPass } from "./passes/SharpenPass";
import { DisplayTransformPass } from "./passes/DisplayTransformPass";
import { CreativeEffectsPass } from "./passes/CreativeEffectsPass";

export function createRenderGraph(): RenderGraph {
  const graph = new RenderGraph();
  graph.addSourcePass(new GeometryPass());
  graph.addSourcePass(new InputTransformPass());
  graph.addPlatePass(new BaseDevelopPass());
  graph.addPlatePass(new ToneCurvePass());
  graph.addPlatePass(new OklchMixerPass());
  graph.addPlatePass(new ColorWheelsPass());
  graph.addPlatePass(new LutPass());
  graph.setMaskBlendPass(new MaskBlendPass());
  graph.addGlobalPass(new FilmEmulationPass());
  graph.addGlobalPass(new HalationPass());
  graph.addGlobalPass(new BloomPass());
  graph.addGlobalPass(new OpticalFXPass());
  graph.addGlobalPass(new SharpenPass());
  graph.addGlobalPass(new DisplayTransformPass());
  graph.addGlobalPass(new CreativeEffectsPass());
  return graph;
}
