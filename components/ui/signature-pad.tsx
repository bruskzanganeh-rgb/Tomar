'use client'

import { useRef, useEffect, useState } from 'react'
import SignaturePad from 'signature_pad'
import { Button } from '@/components/ui/button'
import { Eraser } from 'lucide-react'

type SignaturePadProps = {
  onSignatureChange?: (dataUrl: string | null) => void
  width?: number
  height?: number
  className?: string
}

export function SignatureCanvas({ onSignatureChange, width = 400, height = 200, className }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Handle high-DPI displays
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(ratio, ratio)

    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    })

    pad.addEventListener('endStroke', () => {
      setIsEmpty(pad.isEmpty())
      onSignatureChange?.(pad.isEmpty() ? null : pad.toDataURL('image/png'))
    })

    padRef.current = pad

    return () => {
      pad.off()
    }
  }, [])

  function handleClear() {
    padRef.current?.clear()
    setIsEmpty(true)
    onSignatureChange?.(null)
  }

  // Resize handler
  useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current
      const pad = padRef.current
      if (!canvas || !pad) return

      const data = pad.toData()
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(ratio, ratio)
      pad.clear()
      pad.fromData(data)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className={className}>
      <div className="relative border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: `${height}px`, touchAction: 'none' }}
        />
        {!isEmpty && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 text-muted-foreground hover:text-destructive"
            onClick={handleClear}
          >
            <Eraser className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
      {isEmpty && (
        <p className="text-xs text-muted-foreground mt-1">
          Draw your signature above using mouse, finger, or pen
        </p>
      )}
    </div>
  )
}
