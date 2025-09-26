"use client"

import { Suspense, useRef, useCallback, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, Share, Zap, Maximize, Minimize, Info } from "lucide-react"
import { useKnowledgeGraph, type GraphNode } from "@/hooks/use-knowledge-graph"
import { SkeletonLoader } from "@/components/skeleton-loader" // Assuming you have this
import dynamic from "next/dynamic"

// Dynamically import ForceGraph3D to ensure it's client-side only
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
  loading: () => <GraphLoadingSkeleton />,
})

interface KnowledgeGraphVisualizationProps {
  query: string
  onNewSearch: () => void
}

function GraphLoadingSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-gray-900/80 backdrop-blur-sm">
      <Zap className="h-16 w-16 text-brand-purple-DEFAULT animate-pulse mb-4" />
      <p className="text-xl font-heading text-gray-300">Constructing Knowledge Lattice...</p>
      <div className="w-1/2 mt-4">
        <SkeletonLoader type="text" count={3} />
      </div>
    </div>
  )
}

/**
 * KnowledgeGraphVisualization component.
 * Displays research results as an interactive 3D knowledge graph.
 * @param {KnowledgeGraphVisualizationProps} props - Component props.
 */
export function KnowledgeGraphVisualization({ query, onNewSearch }: KnowledgeGraphVisualizationProps) {
  const { graphData, isLoading, regenerateData } = useKnowledgeGraph(query)
  const fgRef = useRef<any>() // For ForceGraph3D instance
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)

  const handleNodeClick = useCallback((node: any) => {
    // Aim at node from outside it
    const distance = 60
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z)
    if (fgRef.current && fgRef.current.cameraPosition) {
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
        node, // lookAt ({ x, y, z })
        2000, // ms transition duration
      )
    }
    setSelectedNode(node as GraphNode)
  }, [])

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullScreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullScreen(false)
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  if (isLoading && !graphData.nodes.length) {
    // Initial full load
    return <GraphLoadingSkeleton />
  }

  return (
    <div
      className={`relative w-full transition-all duration-500 ease-apple ${isFullScreen ? "h-screen" : "h-[calc(100vh-200px)] md:h-[700px]"}`}
    >
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          className="bg-brand-gray-800/80 border-brand-gray-700 text-gray-300 hover:bg-brand-gray-700/90 hover:text-white backdrop-blur-sm shadow-apple-soft"
          onClick={onNewSearch}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> New Search
        </Button>
      </div>

      <div className="absolute top-4 right-4 z-20 flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          className="bg-brand-gray-800/80 border-brand-gray-700 text-gray-300 hover:bg-brand-gray-700/90 hover:text-white backdrop-blur-sm shadow-apple-soft"
          onClick={toggleFullScreen}
        >
          {isFullScreen ? <Minimize className="h-4 w-4 mr-2" /> : <Maximize className="h-4 w-4 mr-2" />}
          {isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-brand-gray-800/80 border-brand-gray-700 text-gray-300 hover:bg-brand-gray-700/90 hover:text-white backdrop-blur-sm shadow-apple-soft"
        >
          <Download className="h-4 w-4 mr-2" /> Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-brand-gray-800/80 border-brand-gray-700 text-gray-300 hover:bg-brand-gray-700/90 hover:text-white backdrop-blur-sm shadow-apple-soft"
        >
          <Share className="h-4 w-4 mr-2" /> Share
        </Button>
      </div>

      <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-10 text-center max-w-xl px-4">
        <h2 className="text-2xl md:text-3xl font-heading text-gradient-brand">Knowledge Lattice</h2>
        <p className="text-sm text-gray-400 mt-1 truncate">Query: "{query}"</p>
        {!selectedNode && <p className="text-xs text-gray-500 mt-2">Click on a node to explore connections.</p>}
      </div>

      {/* Selected Node Info Panel */}
      {selectedNode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-md p-4 bg-brand-gray-800/90 border border-brand-gray-700 rounded-lg shadow-apple-medium backdrop-blur-md">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-heading text-brand-purple-light mb-1">{selectedNode.name}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-white"
              onClick={() => setSelectedNode(null)}
            >
              <Info className="h-4 w-4" /> {/* Replace with X if it's for closing */}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mb-2 capitalize">Type: {selectedNode.type}</p>
          <p className="text-sm text-gray-300">{selectedNode.details || "No additional details available."}</p>
        </div>
      )}

      {/* ForceGraph3D needs a defined size container to render properly */}
      <div className="w-full h-full">
        <Suspense fallback={<GraphLoadingSkeleton />}>
          {typeof window !== "undefined" && ( // Ensure client-side rendering for ForceGraph3D
            <ForceGraph3D
              ref={fgRef}
              graphData={graphData}
              nodeLabel="name"
              nodeAutoColorBy="type"
              nodeVal="val"
              linkDirectionalParticles={1}
              linkDirectionalParticleWidth={1.5}
              linkWidth={0.5}
              linkColor={() => "rgba(255,255,255,0.2)"}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              onNodeClick={handleNodeClick}
              backgroundColor="rgba(0,0,0,0)" // Transparent background, relies on parent
              showNavInfo={false} // Hides the default navigation info text
              width={isFullScreen ? window.innerWidth : undefined} // Use undefined for default behavior if not fullscreen
              height={isFullScreen ? window.innerHeight : undefined}
            />
          )}
        </Suspense>
      </div>
      {isLoading &&
        graphData.nodes.length > 0 && ( // Loading overlay for regeneration
          <div className="absolute inset-0 flex items-center justify-center bg-brand-gray-900/50 backdrop-blur-sm z-30">
            <Zap className="h-12 w-12 text-brand-purple-DEFAULT animate-ping" />
          </div>
        )}
    </div>
  )
}
