'use client'

import { useEffect, useRef } from 'react'

const COLORS = ['#7c3aed', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#ec4899', '#a3e635', '#ffffff']

interface Particle {
  x: number; y: number; vx: number; vy: number
  color: string; w: number; h: number
  rotation: number; rotSpeed: number
}

export default function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>()
  const particles = useRef<Particle[]>([])

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    particles.current = Array.from({ length: 64 }, () => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 40,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 3 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      w: Math.random() * 10 + 4,
      h: Math.random() * 6  + 3,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
    }))

    const ctx2d = canvas.getContext('2d')!

    function draw() {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height)
      particles.current = particles.current.filter(p => p.y < canvas.height + 20)

      for (const p of particles.current) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08
        p.rotation += p.rotSpeed
        ctx2d.save()
        ctx2d.translate(p.x, p.y)
        ctx2d.rotate((p.rotation * Math.PI) / 180)
        ctx2d.fillStyle = p.color
        ctx2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx2d.restore()
      }

      if (particles.current.length > 0) rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
    />
  )
}
