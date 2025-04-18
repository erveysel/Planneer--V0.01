"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import Matter from "matter-js"

export function useMatter(containerRef: React.RefObject<HTMLElement>) {
  const engineRef = useRef<Matter.Engine>()
  const renderRef = useRef<Matter.Render>()
  const worldRef = useRef<Matter.World>()

  useEffect(() => {
    if (!containerRef.current) return

    // Module aliases
    const Engine = Matter.Engine
    const Render = Matter.Render
    const World = Matter.World
    const Bodies = Matter.Bodies

    // Create engine
    const engine = Engine.create()
    engineRef.current = engine

    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Create renderer
    const render = Render.create({
      element: container,
      engine: engine,
      options: {
        width: containerWidth,
        height: containerHeight,
        wireframes: false,
        background: "transparent",
      },
    })
    renderRef.current = render

    // Run the engine
    Engine.run(engine)
    Render.run(render)

    // Cleanup
    return () => {
      Render.stop(render)
      World.clear(engine.world, false)
      Engine.clear(engine)

      if (render.canvas) {
        render.canvas.remove()
      }
    }
  }, [containerRef])

  return { engineRef, renderRef, worldRef }
}
