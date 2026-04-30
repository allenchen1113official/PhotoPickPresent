'use client'
import { useEffect, useRef, useState } from 'react'

interface HistogramProps {
  imageUrl: string
}

export default function Histogram({ imageUrl }: HistogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return
    setLoading(true)
    setError(false)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        // Offscreen canvas to sample pixels
        const off = document.createElement('canvas')
        off.width = img.naturalWidth
        off.height = img.naturalHeight
        const ctx = off.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, off.width, off.height).data

        const r = new Array(256).fill(0)
        const g = new Array(256).fill(0)
        const b = new Array(256).fill(0)

        for (let i = 0; i < data.length; i += 4) {
          r[data[i]]++
          g[data[i + 1]]++
          b[data[i + 2]]++
        }

        drawHistogram(r, g, b)
        setLoading(false)
      } catch {
        setError(true)
        setLoading(false)
      }
    }
    img.onerror = () => { setError(true); setLoading(false) }
    img.src = imageUrl
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl])

  function drawHistogram(r: number[], g: number[], b: number[]) {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)

    // Background
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, W, H)

    // Grid lines
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1
    for (let x = 0; x <= W; x += W / 4) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    for (let y = 0; y <= H; y += H / 4) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    const maxVal = Math.max(...r, ...g, ...b, 1)

    const drawChannel = (data: number[], color: string) => {
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.75
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * W
        const h = (data[i] / maxVal) * H
        if (i === 0) ctx.moveTo(x, H - h)
        else ctx.lineTo(x, H - h)
      }
      ctx.stroke()

      // Fill
      ctx.globalAlpha = 0.25
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(0, H)
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * W
        const h = (data[i] / maxVal) * H
        ctx.lineTo(x, H - h)
      }
      ctx.lineTo(W, H)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
    }

    drawChannel(b, '#3b82f6')
    drawChannel(g, '#22c55e')
    drawChannel(r, '#ef4444')
  }

  return (
    <div className="rounded-lg overflow-hidden border border-[#2e2e2e] bg-[#111]">
      <div className="px-3 py-1.5 text-xs text-gray-500 flex gap-3 border-b border-[#2e2e2e]">
        <span className="text-red-400">■ R</span>
        <span className="text-green-400">■ G</span>
        <span className="text-blue-400">■ B</span>
      </div>
      {loading && (
        <div className="w-full h-[100px] flex items-center justify-center text-gray-600 text-xs">
          計算中…
        </div>
      )}
      {error && (
        <div className="w-full h-[100px] flex items-center justify-center text-gray-600 text-xs">
          無法載入直方圖
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={256}
        height={100}
        className={`w-full h-auto ${loading || error ? 'hidden' : ''}`}
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  )
}
