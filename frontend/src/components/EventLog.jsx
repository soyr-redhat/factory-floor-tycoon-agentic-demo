import { useEffect, useRef, useState } from 'react'

function EventLog({ events, actions }) {
  const logRef = useRef(null)
  const [expandedItems, setExpandedItems] = useState(new Set())

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [events, actions])

  // Combine and sort events and actions by timestamp
  const combined = [
    ...events.map(e => ({ ...e, type: 'event' })),
    ...actions.map(a => ({ ...a, type: 'action' }))
  ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 50)

  const toggleExpand = (index) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      newSet.has(index) ? newSet.delete(index) : newSet.add(index)
      return newSet
    })
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">Activity Log</h3>
      <div
        ref={logRef}
        className="bg-gray-900 rounded p-4 h-96 overflow-y-auto font-mono text-sm space-y-2"
      >
        {combined.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            Waiting for activity...
          </div>
        )}
        {combined.map((item, index) => {
          if (item.type === 'event') {
            return (
              <div key={index} className="text-yellow-400 border-l-2 border-yellow-400 pl-2">
                <span className="text-gray-500">[EVENT]</span> {item.description}
              </div>
            )
          } else {
            const isExpanded = expandedItems.has(index)
            return (
              <div
                key={index}
                className={`border-l-2 pl-2 ${
                  item.success ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'
                }`}
              >
                <div
                  className="flex items-start gap-2 cursor-pointer hover:opacity-80"
                  onClick={() => toggleExpand(index)}
                  title="Click to expand/collapse"
                >
                  <span className="text-gray-400 select-none text-xs">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <div className="flex-grow">
                    <span className="text-gray-500">[{item.agent}]</span> {item.action}
                  </div>
                </div>
                {item.reasoning && (
                  <div className="text-xs text-gray-500 ml-6 mt-1">
                    💭 {isExpanded ? item.reasoning : `${item.reasoning.substring(0, 100)}...`}
                  </div>
                )}
                {item.result && (
                  <div className="text-xs ml-6">→ {item.result}</div>
                )}
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}

export default EventLog
