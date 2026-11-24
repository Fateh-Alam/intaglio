"use client";

import { useCallback, useMemo, useState } from "react";
import { Background, Controls, Handle, MiniMap, Position, ReactFlow, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { GradeNode, GradeGraph } from "../../types/document";
import { nodeOutputPort, validateGradeGraph } from "../../lib/gradeGraph";

type GradeFlowNode = Node<{ gradeNode: GradeNode }, "grade">;

function GradeNodeCard({ data, selected }: NodeProps<GradeFlowNode>): React.ReactElement {
  const node = data.gradeNode;
  const output = nodeOutputPort(node);
  return (
    <div
      className={`min-w-40 rounded-[10px] bg-[var(--ui-panel)] px-3 py-2 shadow-xl ring-1 ring-inset ${
        selected ? "ring-[var(--ui-accent)]" : "ring-[var(--ui-line-strong)]"
      }`}
      aria-label={`${node.name} ${node.kind} node`}
    >
      {node.kind !== "source" && (output === "image" || ["mask-add", "mask-subtract", "mask-intersect"].includes(node.kind)) && (
        <Handle
          type="target"
          position={Position.Left}
          id={output}
          className={output === "mask" ? "!bg-cyan-400" : "!bg-[#5b9bff]"}
          aria-label={`${output} input`}
        />
      )}
      {node.kind === "plate-composite" && (
        <Handle type="target" position={Position.Top} id="mask" className="!bg-cyan-400" aria-label="mask input" />
      )}
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ui-text-3)]">{node.kind}</div>
      <div className="mt-0.5 text-[12.5px] font-medium text-[var(--ui-text)]">{node.name}</div>
      <div className="ui-num mt-1.5 text-[10.5px] text-[var(--ui-text-3)]">
        {output === "mask" ? "Mask reference" : `${node.enabled ? "Active" : "Bypassed"} · ${Math.round(node.opacity * 100)}%`}
      </div>
      {node.kind !== "output" && (
        <Handle
          type="source"
          position={Position.Right}
          id={output}
          className={output === "mask" ? "!bg-cyan-400" : "!bg-[#5b9bff]"}
          aria-label={`${output} output`}
        />
      )}
    </div>
  );
}

const nodeTypes = { grade: GradeNodeCard };

export function GradeGraphWorkspace({
  graph,
  selectedNodeId,
  onSelectNode,
  onMoveNode,
}: {
  graph: GradeGraph;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onMoveNode: (id: string, position: { x: number; y: number }) => void;
}): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const validation = useMemo(() => validateGradeGraph(graph), [graph]);
  const nodes = useMemo<GradeFlowNode[]>(
    () =>
      graph.nodes.map((gradeNode, index) => ({
        id: gradeNode.id,
        type: "grade",
        position: gradeNode.position ?? { x: index * 190, y: 80 },
        selected: gradeNode.id === selectedNodeId,
        data: { gradeNode },
      })),
    [graph.nodes, selectedNodeId]
  );
  const edges = useMemo(
    () =>
      graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        sourceHandle: edge.sourcePort,
        targetHandle: edge.targetPort,
        animated: false,
        style: { stroke: edge.sourcePort === "mask" ? "#67e8f9" : "#5b9bff", opacity: 0.75 },
      })),
    [graph.edges]
  );
  const handleNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: GradeFlowNode) => onMoveNode(node.id, node.position),
    [onMoveNode]
  );
  return (
    <section
      className={
        expanded
          ? "fixed inset-4 z-[80] overflow-hidden rounded-[14px] bg-[var(--ui-chrome)] ring-1 ring-inset ring-[var(--ui-line-strong)] shadow-[var(--ui-shadow-pop)]"
          : "h-[22rem] overflow-hidden rounded-[12px] bg-[var(--ui-chrome)] ring-1 ring-inset ring-[var(--ui-line)]"
      }
      aria-label="Advanced grade graph"
    >
      <div className="flex h-10 items-center justify-between border-b border-[var(--ui-line)] px-3 text-[11px] font-medium text-[var(--ui-text-2)]">
        <span>Grade Graph</span>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="ui-focus rounded-[6px] px-2 py-1 text-[11px] text-[var(--ui-text)] hover:bg-white/[0.06]"
        >
          {expanded ? "Close expanded graph" : "Expand graph"}
        </button>
        <span className={validation.valid ? "text-[var(--ui-success)]" : "text-[var(--ui-danger)]"}>
          {validation.valid ? "Valid" : `${validation.issues.length} issues`}
        </span>
      </div>
      <div className="h-[calc(100%-2.5rem)]">
        <ReactFlow
          key={String(expanded)}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesConnectable={false}
          edgesReconnectable={false}
          elementsSelectable
          onNodeClick={(_, node) => onSelectNode(node.id)}
          onNodeDragStop={handleNodeDragStop}
          fitView
          fitViewOptions={{ nodes: selectedNodeId ? [{ id: selectedNodeId }] : undefined, minZoom: 0.7, maxZoom: 1, padding: 0.4 }}
          minZoom={0.2}
          maxZoom={2}
          colorMode="dark"
          aria-label="Etch node graph"
        >
          <Background color="#ffffff" gap={28} size={0.5} />
          <MiniMap pannable zoomable nodeColor="#5b9bff" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}
