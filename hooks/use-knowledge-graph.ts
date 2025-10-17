"use client"

import { useState, useMemo } from "react"

export interface GraphNode {
  id: string
  name: string
  type: "query" | "concept" | "source" | "finding"
  val?: number // for node size
  details?: string
}

export interface GraphLink {
  source: string
  target: string
  relation?: string
}

export interface KnowledgeGraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

/**
 * Custom hook to manage and generate knowledge graph data.
 * In a real application, this would fetch or process data based on the AI's research.
 * @param {string} query - The user's research query.
 * @returns {{ graphData: KnowledgeGraphData, isLoading: boolean, regenerateData: () => void }}
 */
export function useKnowledgeGraph(query: string) {
  const [isLoading, setIsLoading] = useState(true)
  const [dataVersion, setDataVersion] = useState(0) // To trigger regeneration

  const graphData: KnowledgeGraphData = useMemo(() => {
    setIsLoading(true)
    // Simulate AI processing and graph generation
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []

    const rootId = query || "central_topic"
    nodes.push({
      id: rootId,
      name: `Query: ${query.substring(0, 30)}...`,
      type: "query",
      val: 10,
      details: `Original query: ${query}`,
    })

    const concepts = ["AI Ethics", "Machine Learning", "Data Privacy", "Neural Networks", "Future Trends"]
    concepts.forEach((concept, i) => {
      const conceptId = `concept_${i}`
      nodes.push({
        id: conceptId,
        name: concept,
        type: "concept",
        val: 6,
        details: `Key concept related to ${query}: ${concept}`,
      })
      links.push({ source: rootId, target: conceptId, relation: "explores" })

      const numFindings = Math.floor(Math.random() * 3) + 1
      for (let j = 0; j < numFindings; j++) {
        const findingId = `finding_${i}_${j}`
        nodes.push({
          id: findingId,
          name: `Finding ${j + 1}`,
          type: "finding",
          val: 3,
          details: `Specific finding about ${concept}`,
        })
        links.push({ source: conceptId, target: findingId, relation: "leads to" })
      }
    })

    const sources = ["Source A (Research Paper)", "Source B (News Article)", "Source C (Book Chapter)"]
    sources.forEach((source, i) => {
      const sourceId = `source_${i}`
      nodes.push({ id: sourceId, name: source, type: "source", val: 4, details: `A source document: ${source}` })
      // Link sources to random concepts
      const randomConceptId = `concept_${Math.floor(Math.random() * concepts.length)}`
      links.push({ source: randomConceptId, target: sourceId, relation: "supported by" })
    })

    setTimeout(() => setIsLoading(false), 1500) // Simulate loading
    return { nodes, links }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, dataVersion])

  const regenerateData = () => {
    setDataVersion((prev) => prev + 1)
  }

  return { graphData, isLoading, regenerateData }
}
