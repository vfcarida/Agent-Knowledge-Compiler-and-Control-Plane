/**
 * @module components/knowledge-graph/KnowledgeGraph
 * @description Interactive D3.js force-directed graph visualizing skills, experiences, and relationships.
 */

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { CareerBundleData, OKFDoc } from "../../types/career.js";

interface KnowledgeGraphProps {
  data: CareerBundleData;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: string;
  doc: OKFDoc;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export function KnowledgeGraph({ data }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // 1. Process OKF documents into Nodes and Links
    const nodes: GraphNode[] = [];
    const nodeMap = new Map<string, GraphNode>();

    const addNode = (doc: OKFDoc, type: string) => {
      const id = doc.conceptId;
      const label =
        doc.frontmatter.title || doc.conceptId.split("/").pop() || id;
      const node: GraphNode = { id, label, type, doc };
      nodes.push(node);
      nodeMap.set(id, node);
    };

    // Add all nodes
    data.skills.forEach((s) => addNode(s, "Skill"));
    data.experiences.forEach((e) => addNode(e, "Experience"));
    data.applications.forEach((a) => addNode(a, "Application"));
    data.preferences.forEach((p) => addNode(p, "Preference"));

    // Automatically derive links based on links/references/tags
    const links: GraphLink[] = [];

    // Link experiences/applications to skills via tags & text analysis
    nodes.forEach((node) => {
      const tags = node.doc.frontmatter.tags || [];
      const bodyText = node.doc.body.toLowerCase();

      // Check for skill references
      data.skills.forEach((skill) => {
        const skillId = skill.conceptId;
        const skillName = (skill.frontmatter.title || "").toLowerCase();
        const skillSlug = skill.conceptId.split("/").pop() || "";

        if (node.id === skillId) return; // skip self link

        // Check if node has a tag matching the skill name/slug, or if the text references it
        const hasTagMatch = tags.some(
          (t) => t.toLowerCase() === skillSlug || t.toLowerCase() === skillName,
        );
        const hasTextMatch =
          bodyText.includes(skillName) || bodyText.includes(skillSlug);

        if (hasTagMatch || hasTextMatch) {
          links.push({
            source: node.id,
            target: skillId,
          });
        }
      });

      if (node.type === "Application") {
        const appCompany = (
          (node.doc.frontmatter.company as string | undefined) || ""
        ).toLowerCase();
        data.experiences.forEach((exp) => {
          const expCompany = (
            (exp.frontmatter.company as string | undefined) || ""
          ).toLowerCase();
          if (appCompany && expCompany && expCompany.includes(appCompany)) {
            links.push({
              source: node.id,
              target: exp.conceptId,
            });
          }
        });
      }
    });

    // 2. Set up SVG dimension
    const width = containerRef.current.clientWidth;
    const height = 500;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove(); // clear canvas

    // Group for zoom operations
    const g = svg.append("g");

    // Add zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // 3. Define color scheme based on node type
    const getNodeColor = (type: string) => {
      switch (type) {
        case "Skill":
          return "#6366f1"; // electric indigo
        case "Experience":
          return "#06b6d4"; // cyan
        case "Preference":
          return "#a855f7"; // neon purple
        case "Application":
          return "#f97316"; // orange
        default:
          return "#71717a";
      }
    };

    // 4. Force Simulation setup
    const simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));

    // 5. Draw Links (Edges)
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#27272a")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5);

    // 6. Draw Nodes (G elements containing circles + labels)
    const node = g
      .append("g")
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any,
      )
      .on("click", (_event, d) => {
        setSelectedNode(d);
      });

    // Add circle to node
    node
      .append("circle")
      .attr("r", (d) => (d.type === "Preference" ? 14 : 10))
      .attr("fill", (d) => getNodeColor(d.type))
      .attr("stroke", "#09090b")
      .attr("stroke-width", 2)
      .attr("class", "cursor-pointer transition-all hover:scale-125")
      .style("filter", (d) => `drop-shadow(0 0 4px ${getNodeColor(d.type)}80)`);

    // Add text label to node
    node
      .append("text")
      .text((d) => d.label)
      .attr("dx", 15)
      .attr("dy", 4)
      .attr("fill", "#e4e4e7")
      .attr("font-size", "10px")
      .attr("font-weight", "500")
      .attr("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(0,0,0,0.8)");

    // 7. Simulation tick updating coordinates
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x!)
        .attr("y1", (d) => (d.source as GraphNode).y!)
        .attr("x2", (d) => (d.target as GraphNode).x!)
        .attr("y2", (d) => (d.target as GraphNode).y!);

      node.attr("transform", (d) => `translate(${d.x!},${d.y!})`);
    });

    // Drag behavior helper events
    function dragstarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]" ref={containerRef}>
      {/* Graph Display Canvas */}
      <div className="flex-1 glass-panel rounded-2xl relative overflow-hidden flex flex-col justify-between">
        <div className="p-5 border-b border-dark-border/40">
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">
            Semantic Knowledge Graph
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Drag nodes to explore associations. Zoom with mouse scroll. Click a
            node for details.
          </p>
        </div>

        <svg ref={svgRef} className="flex-1 w-full" />

        {/* Legend Panel */}
        <div className="flex justify-start gap-5 p-4 border-t border-dark-border/40 bg-zinc-950/20 text-[10px] uppercase font-semibold tracking-wider text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neon-indigo block" />
            Skills
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neon-blue block" />
            Experiences
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neon-purple block" />
            Preferences
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 block" />
            Applications
          </div>
        </div>
      </div>

      {/* Details Side Drawer */}
      <div className="w-96 glass-panel rounded-2xl p-6 overflow-y-auto flex flex-col justify-between">
        {selectedNode ? (
          <div>
            <div className="flex items-center justify-between border-b border-dark-border/40 pb-4 mb-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                {selectedNode.type} Details
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                {selectedNode.id}
              </span>
            </div>

            <h3 className="text-lg font-bold text-zinc-100 mb-2">
              {selectedNode.label}
            </h3>

            {/* Custom attributes display based on type */}
            {selectedNode.type === "Skill" && (
              <div className="space-y-1 mb-4 text-xs">
                {selectedNode.doc.frontmatter["level"] && (
                  <p>
                    <span className="text-zinc-500">Proficiency:</span>{" "}
                    {selectedNode.doc.frontmatter["level"] as string}
                  </p>
                )}
                {selectedNode.doc.frontmatter["yearsOfExperience"] && (
                  <p>
                    <span className="text-zinc-500">Years of Experience:</span>{" "}
                    {
                      selectedNode.doc.frontmatter[
                        "yearsOfExperience"
                      ] as string
                    }{" "}
                    yrs
                  </p>
                )}
                {selectedNode.doc.frontmatter["category"] && (
                  <p>
                    <span className="text-zinc-500">Category:</span>{" "}
                    {selectedNode.doc.frontmatter["category"] as string}
                  </p>
                )}
              </div>
            )}

            {selectedNode.type === "Experience" && (
              <div className="space-y-1 mb-4 text-xs">
                {selectedNode.doc.frontmatter["company"] && (
                  <p>
                    <span className="text-zinc-500">Company:</span>{" "}
                    {selectedNode.doc.frontmatter["company"] as string}
                  </p>
                )}
                {selectedNode.doc.frontmatter["role"] && (
                  <p>
                    <span className="text-zinc-500">Role:</span>{" "}
                    {selectedNode.doc.frontmatter["role"] as string}
                  </p>
                )}
                {selectedNode.doc.frontmatter["startDate"] && (
                  <p>
                    <span className="text-zinc-500">Period:</span>{" "}
                    {selectedNode.doc.frontmatter["startDate"] as string} -{" "}
                    {selectedNode.doc.frontmatter["current"]
                      ? "Present"
                      : (selectedNode.doc.frontmatter["endDate"] as string)}
                  </p>
                )}
              </div>
            )}

            <div className="text-xs text-zinc-400 mt-4 leading-relaxed prose prose-invert max-w-none">
              <h4 className="text-zinc-200 font-semibold mb-1 text-[11px] uppercase tracking-wide">
                Document Body
              </h4>
              <p className="whitespace-pre-line bg-zinc-950/20 p-3 border border-dark-border/40 rounded-lg text-zinc-300">
                {selectedNode.doc.body || "No details provided."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="text-zinc-500 text-xs">
              Click a node on the graph to inspect metadata and content.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
