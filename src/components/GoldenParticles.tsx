'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  r: number
  alpha: number
  twinkleSpeed: number
}

export default function GoldenParticles({
  active = true,
  density = 50,
  className = '',
}: {
  active?: boolean
  density?: number
  className?: string
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const rafRef      = useRef<number | null>(null)
  const particles   = useRef<Particle[]>([])

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const w = canvas.width
    const h = canvas.height
    const ctx = canvas.getContext('2d')!

    particles.current = Array.from({ length: density }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.6 - 0.1,
      r: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.6 + 0.3,
      twinkleSpeed: Math.random() * 0.05 + 0.01,
    }))

    let phase = 0

    function draw() {
      phase += 1
      ctx.clearRect(0, 0, w, h)

      for (const p of particles.current) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -5)  p.y = h + 5
        if (p.x < -5)  p.x = w + 5
        if (p.x > w+5) p.x = -5

        const a = p.alpha * (0.7 + 0.3 * Math.sin(phase * p.twinkleSpeed))
        ctx.beginPath()
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
        grad.addColorStop(0,    `rgba(253, 224, 71, ${a})`)
        grad.addColorStop(0.5,  `rgba(251, 191, 36, ${a * 0.4})`)
        grad.addColorStop(1,    'rgba(251, 191, 36, 0)')
        ctx.fillStyle = grad
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.fillStyle = `rgba(254, 240, 138, ${a})`
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [active, density])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-10 ${className}`}
    />
  )
}
