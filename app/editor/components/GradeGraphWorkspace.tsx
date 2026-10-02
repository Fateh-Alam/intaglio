"use client";

import { useCallback, useMemo } from "react";
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GradeNode, GradeGraph } from "../../types/document";
import { nodeOutputPort, validateGradeGraph } from "../../lib/gradeGraph";

type GradeFlowNode = Node<{ gradeNode: GradeNode }, "grade">;

function GradeNodeCard({ data, selected }: NodeProps<GradeFlowNode>): React.ReactElement {
  const node = data.gradeNode;
  const output = nodeOutputPort(node);
  return (
    <div className={`min-w-40 border bg-[#181713] px-3 py-2 shadow-xl ${selected ? "border-[var(--intaglio-brass)]" : "border-white/15"}`} aria-label={`${node.name} ${node.kind} node`}>
      <Handle type="target" position={Position.Left} id={output} className={output === "mask" ? "!bg-cyan-400" : "!bg-amber-400"} aria-label={`${output} input`} />
      <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-white/35">{node.kind}</div>
      <div className="mt-1 text-xs text-white/85">{node.name}</div>
      <div className="mt-2 font-mono text-[8px] uppercase tracking-widest text-white/35">{node.enabled ? "Active" : "Bypassed"} · {Math.round(node.opacity * 100)}%</div>
      <Handle type="source" position={Position.Right} id={output} className={output === "mask" ? "!bg-cyan-400" : "!bg-amber-400"} aria-label={`${output} output`} />
    </div>
  );
}

const nodeTypes = { grade: GradeNodeCard };

export function GradeGraphWorkspace({ graph, selectedNodeId, onSelectNode, onMoveNode }: { graph: GradeGraph; selectedNodeId: string | null; onSelectNode: (id: string) => void; onMoveNode: (id: string, position: { x: number; y: number }) => void }): React.ReactElement {
  const validation = useMemo(() => validateGradeGraph(graph), [graph]);
  const nodes = useMemo<GradeFlowNode[]>(() => graph.nodes.map((gradeNode, index) => ({ id: gradeNode.id, type: "grade", position: gradeNode.position ?? { x: index * 190, y: 80 }, selected: gradeNode.id === selectedNodeId, data: { gradeNode } })), [graph.nodes, selectedNodeId]);
  const edges = useMemo(() => graph.edges.map((edge) => ({ id: edge.id, source: edge.sourceNodeId, target: edge.targetNodeId, sourceHandle: edge.sourcePort, targetHandle: edge.targetPort, animated: false, style: { stroke: edge.sourcePort === "mask" ? "#67e8f9" : "#d6a848", opacity: 0.7 } })), [graph.edges]);
  const handleNodeDragStop = useCallback((_: MouseEvent | TouchEvent, node: GradeFlowNode) => onMoveNode(node.id, node.position), [onMoveNode]);
  return (
    <section className="h-[32rem] border border-white/10 bg-[#10100e]" aria-label="Advanced grade graph">
      <div className="flex h-10 items-center justify-between border-b border-white/10 px-3 font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
        <span>Grade Graph · V2</span><span className={validation.valid ? "text-emerald-400" : "text-red-400"}>{validation.valid ? "Valid" : `${validation.issues.length} issues`}</span>
      </div>
      <div className="h-[calc(100%-2.5rem)]">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} nodesConnectable={false} edgesReconnectable={false} elementsSelectable onNodeClick={(_, node) => onSelectNode(node.id)} onNodeDragStop={handleNodeDragStop} fitView minZoom={0.2} maxZoom={2} colorMode="dark" aria-label="Intaglio node graph">
          <Background color="#ffffff" gap={28} size={0.5} /><MiniMap pannable zoomable nodeColor="#d6a848" /><Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}
