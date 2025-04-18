"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

type Task = {
  id: string
  text: string
  priority: "high" | "medium" | "low"
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  isDragging: boolean
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState("")
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium")
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const draggedTaskRef = useRef<string | null>(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const lastMousePositionRef = useRef({ x: 0, y: 0 })

  // Generate random position within the container
  const generateRandomPosition = () => {
    if (!containerRef.current) return { x: 100, y: 100 }

    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    // Ensure the task is fully visible within the container
    const maxSize = 80 // Size of the largest task
    const padding = 20

    return {
      x: Math.random() * (containerWidth - maxSize - padding * 2) + padding + maxSize,
      y: Math.random() * 100 + 50, // Start from top
    }
  }

  // Get radius based on priority
  const getRadiusByPriority = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return 70
      case "medium":
        return 55
      case "low":
        return 40
      default:
        return 55
    }
  }

  const handleAddTask = () => {
    if (newTask.trim() === "") return

    const position = generateRandomPosition()
    const radius = getRadiusByPriority(priority)

    const task: Task = {
      id: Date.now().toString(),
      text: newTask,
      priority: priority,
      x: position.x,
      y: position.y,
      vx: 0,
      vy: 0,
      radius: radius,
      isDragging: false,
    }

    setTasks([...tasks, task])
    setNewTask("")
    setPriority("medium")
  }

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id))
  }

  // Mouse event handlers
  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault()

    if (!containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - containerRect.left
    const mouseY = e.clientY - containerRect.top

    mousePositionRef.current = { x: mouseX, y: mouseY }
    lastMousePositionRef.current = { x: mouseX, y: mouseY }

    draggedTaskRef.current = id

    setTasks(tasks.map((task) => (task.id === id ? { ...task, isDragging: true, vx: 0, vy: 0 } : task)))
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current || !draggedTaskRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const mouseX = e.clientX - containerRect.left
    const mouseY = e.clientY - containerRect.top

    lastMousePositionRef.current = { ...mousePositionRef.current }
    mousePositionRef.current = { x: mouseX, y: mouseY }

    setTasks(tasks.map((task) => (task.id === draggedTaskRef.current ? { ...task, x: mouseX, y: mouseY } : task)))
  }

  const handleMouseUp = () => {
    if (!draggedTaskRef.current) return

    // Calculate velocity based on mouse movement
    const vx = (mousePositionRef.current.x - lastMousePositionRef.current.x) * 0.5
    const vy = (mousePositionRef.current.y - lastMousePositionRef.current.y) * 0.5

    setTasks(tasks.map((task) => (task.id === draggedTaskRef.current ? { ...task, isDragging: false, vx, vy } : task)))

    draggedTaskRef.current = null
  }

  // Physics simulation
  const updatePhysics = (time: number) => {
    if (!containerRef.current) return

    const deltaTime = lastTimeRef.current ? (time - lastTimeRef.current) / 16 : 1
    lastTimeRef.current = time

    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    setTasks((prevTasks) => {
      const updatedTasks = [...prevTasks]

      // Update positions based on velocity
      for (let i = 0; i < updatedTasks.length; i++) {
        const task = updatedTasks[i]

        if (task.isDragging) continue

        // Apply gravity
        task.vy += 0.2 * deltaTime

        // Update position
        task.x += task.vx * deltaTime
        task.y += task.vy * deltaTime

        // Boundary collision
        if (task.x - task.radius < 0) {
          task.x = task.radius
          task.vx = Math.abs(task.vx) * 0.8
        } else if (task.x + task.radius > containerWidth) {
          task.x = containerWidth - task.radius
          task.vx = -Math.abs(task.vx) * 0.8
        }

        if (task.y - task.radius < 0) {
          task.y = task.radius
          task.vy = Math.abs(task.vy) * 0.8
        } else if (task.y + task.radius > containerHeight) {
          task.y = containerHeight - task.radius
          task.vy = -Math.abs(task.vy) * 0.8

          // Apply friction when on ground
          task.vx *= 0.95
        }

        // Apply air resistance
        task.vx *= 0.99
        task.vy *= 0.99
      }

      // Check for collisions between tasks
      for (let i = 0; i < updatedTasks.length; i++) {
        for (let j = i + 1; j < updatedTasks.length; j++) {
          const taskA = updatedTasks[i]
          const taskB = updatedTasks[j]

          // Skip if either task is being dragged
          if (taskA.isDragging || taskB.isDragging) continue

          // Calculate distance between centers
          const dx = taskB.x - taskA.x
          const dy = taskB.y - taskA.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          // Check for collision
          const minDistance = taskA.radius + taskB.radius

          if (distance < minDistance) {
            // Calculate collision response
            const angle = Math.atan2(dy, dx)
            const targetX = taskA.x + Math.cos(angle) * minDistance
            const targetY = taskA.y + Math.sin(angle) * minDistance
            const ax = (targetX - taskB.x) * 0.05
            const ay = (targetY - taskB.y) * 0.05

            // Apply forces in opposite directions
            taskA.vx -= ax
            taskA.vy -= ay
            taskB.vx += ax
            taskB.vy += ay

            // Move them apart slightly to prevent sticking
            const percent = 0.2
            const slx = dx * percent
            const sly = dy * percent
            taskA.x -= slx
            taskA.y -= sly
            taskB.x += slx
            taskB.y += sly
          }
        }
      }

      return updatedTasks
    })

    animationRef.current = requestAnimationFrame(updatePhysics)
  }

  // Set up animation loop
  useEffect(() => {
    animationRef.current = requestAnimationFrame(updatePhysics)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [tasks])

  // Set up mouse event listeners
  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [tasks])

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Fiziksel Hatırlatıcı Uygulaması</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Yeni Görev Ekle</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="task">Görev</Label>
              <Input
                id="task"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Yapılacak görevi girin..."
                className="mt-1"
              />
            </div>

            <div>
              <Label>Öncelik Derecesi</Label>
              <RadioGroup
                value={priority}
                onValueChange={(value) => setPriority(value as "high" | "medium" | "low")}
                className="flex space-x-4 mt-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="high" />
                  <Label htmlFor="high" className="text-red-500 font-medium">
                    Yüksek
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="text-amber-500 font-medium">
                    Orta
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="low" />
                  <Label htmlFor="low" className="text-green-500 font-medium">
                    Düşük
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button onClick={handleAddTask} className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Görev Ekle
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6">Görevlerim</h2>

          <div
            ref={containerRef}
            className="relative h-[500px] border border-dashed border-gray-300 rounded-lg overflow-hidden"
          >
            {tasks.length === 0 ? (
              <p className="absolute inset-0 flex items-center justify-center text-gray-500">
                Henüz görev eklenmedi. Görev ekleyin ve fiziksel balonları izleyin.
              </p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "absolute rounded-full flex items-center justify-center text-white font-medium text-center p-4 select-none",
                    task.isDragging ? "cursor-grabbing z-10" : "cursor-grab",
                    task.priority === "high"
                      ? "bg-red-500"
                      : task.priority === "medium"
                        ? "bg-amber-500"
                        : "bg-green-500",
                  )}
                  style={{
                    left: `${task.x}px`,
                    top: `${task.y}px`,
                    width: `${task.radius * 2}px`,
                    height: `${task.radius * 2}px`,
                    transform: "translate(-50%, -50%)",
                    boxShadow: task.isDragging ? "0 8px 16px rgba(0,0,0,0.2)" : "0 4px 8px rgba(0,0,0,0.1)",
                    transition: "box-shadow 0.2s ease",
                  }}
                  onMouseDown={(e) => handleMouseDown(task.id, e)}
                  onDoubleClick={() => handleDeleteTask(task.id)}
                  title="Sürükleyerek taşıyın, silmek için çift tıklayın"
                >
                  {task.text}
                </div>
              ))
            )}
          </div>

          <p className="text-sm text-gray-500 mt-2 text-center">
            İpucu: Balonları sürükleyebilir, fırlatabilir ve birbirleriyle çarpıştırabilirsiniz. Silmek için çift
            tıklayın.
          </p>
        </div>
      </div>
    </main>
  )
}
