import { useEffect, useRef, useState } from 'react'

function ProfitChart({ profitHistory, agents }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  const handleMouseMove = (e) => {
    if (!profitHistory || profitHistory.length === 0 || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const width = canvas.width
    const height = canvas.height
    const padding = 40
    const chartWidth = width - padding * 2

    // Calculate which round the mouse is over
    const maxRound = profitHistory.length
    const xScale = chartWidth / Math.max(maxRound - 1, 1)
    const round = Math.round((x - padding) / xScale)

    if (round >= 0 && round < profitHistory.length) {
      const snapshot = profitHistory[round]

      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        round: round,
        data: snapshot
      })
    } else {
      setTooltip(null)
    }
  }

  const handleMouseLeave = () => {
    setTooltip(null)
  }

  useEffect(() => {
    if (!profitHistory || profitHistory.length === 0 || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Calculate scales
    const maxRound = profitHistory.length
    const maxProfit = Math.max(
      ...profitHistory.flatMap(snapshot => Object.values(snapshot)),
      100
    )
    const minProfit = Math.min(
      ...profitHistory.flatMap(snapshot => Object.values(snapshot)),
      0
    )

    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const xScale = chartWidth / Math.max(maxRound - 1, 1)
    const yScale = chartHeight / (maxProfit - minProfit || 1)

    // Draw axes
    ctx.strokeStyle = '#4B5563'
    ctx.lineWidth = 1

    // Y-axis
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.stroke()

    // X-axis
    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()

    // Draw grid lines and labels
    ctx.fillStyle = '#9CA3AF'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'

    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      const value = maxProfit - (maxProfit - minProfit) * (i / 5)

      // Grid line
      ctx.strokeStyle = '#374151'
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()

      // Label
      ctx.fillText(`$${value.toFixed(0)}`, padding - 5, y + 3)
    }

    // Draw lines for each agent
    agents.forEach((agent) => {
      const agentData = profitHistory.map(snapshot => snapshot[agent.name] || 0)

      ctx.strokeStyle = agent.color
      ctx.lineWidth = 2
      ctx.beginPath()

      agentData.forEach((profit, round) => {
        const x = padding + round * xScale
        const y = height - padding - (profit - minProfit) * yScale

        if (round === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })

      ctx.stroke()

      // Draw dots at each data point for better hover visibility
      agentData.forEach((profit, round) => {
        const x = padding + round * xScale
        const y = height - padding - (profit - minProfit) * yScale

        ctx.fillStyle = agent.color
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
      })
    })

    // Draw hover indicator
    if (tooltip) {
      const x = padding + tooltip.round * xScale

      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // X-axis label
    ctx.fillStyle = '#9CA3AF'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Round', width / 2, height - 10)

    // Y-axis label
    ctx.save()
    ctx.translate(15, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Profit ($)', 0, 0)
    ctx.restore()

  }, [profitHistory, agents, tooltip])

  return (
    <div className="bg-gray-800 rounded-lg p-4" ref={containerRef}>
      <h3 className="text-lg font-bold mb-3">Profit Over Time</h3>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={250}
          className="w-full cursor-crosshair"
          style={{ maxHeight: '250px' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        {tooltip && (
          <div
            className="absolute bg-black bg-opacity-90 text-white px-3 py-2 rounded text-xs pointer-events-none"
            style={{
              left: `${tooltip.x + 10}px`,
              top: `${tooltip.y - 10}px`,
              transform: 'translateY(-100%)'
            }}
          >
            <div className="font-bold mb-1">Round {tooltip.round}</div>
            {Object.entries(tooltip.data).map(([name, profit]) => {
              const agent = agents.find(a => a.name === name)
              return (
                <div key={name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: agent?.color || '#EE0000' }}
                  />
                  <span>{name}:</span>
                  <span className="font-mono">${profit.toFixed(2)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfitChart
