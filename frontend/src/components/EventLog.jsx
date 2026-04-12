import { useEffect, useRef, useState, useMemo } from 'react'

function EventLog({ events, actions, agents }) {
  const logRef = useRef(null)
  const [expandedItems, setExpandedItems] = useState(new Set())
  const [selectedAgent, setSelectedAgent] = useState('all')

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [events, actions])

  // Extract unique agent names from actions
  const agentNames = useMemo(() => {
    const names = new Set()
    actions.forEach(action => {
      if (action.agent) names.add(action.agent)
    })
    return Array.from(names).sort()
  }, [actions])

  // Combine and sort events and actions by timestamp
  const combined = useMemo(() => {
    let items = [
      ...events.map(e => ({ ...e, type: 'event' })),
      ...actions.map(a => ({ ...a, type: 'action' }))
    ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

    // Filter by selected agent
    if (selectedAgent !== 'all') {
      items = items.filter(item =>
        item.type === 'event' || item.agent === selectedAgent
      )
    }

    return items.slice(0, 50)
  }, [events, actions, selectedAgent])

  const toggleExpand = (index) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      newSet.has(index) ? newSet.delete(index) : newSet.add(index)
      return newSet
    })
  }

  // Get agent color from the agents prop
  const getAgentColor = (agentName) => {
    const agent = agents?.find(a => a.name === agentName)
    return agent?.color || '#EE0000'
  }

  return (
    <div className="bg-redhat-dark-surface rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">Activity Log</h3>
        {agentNames.length > 1 && (
          <div className="text-sm text-redhat-text-secondary">
            {selectedAgent === 'all' ? 'All Agents' : selectedAgent}
          </div>
        )}
      </div>

      {/* Agent filter bar */}
      {agentNames.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedAgent('all')}
            className={`px-3 py-1 rounded text-sm font-medium transition ${
              selectedAgent === 'all'
                ? 'bg-redhat-red text-white'
                : 'bg-redhat-dark-surface/80 text-redhat-text-secondary hover:bg-redhat-red/20'
            }`}
          >
            All
          </button>
          {agentNames.map(agentName => (
            <button
              key={agentName}
              onClick={() => setSelectedAgent(agentName)}
              className={`px-3 py-1 rounded text-sm font-medium transition flex items-center gap-2 ${
                selectedAgent === agentName
                  ? 'bg-redhat-dark-elevated text-white ring-2'
                  : 'bg-redhat-dark-surface/80 text-redhat-text-secondary hover:bg-redhat-red/20'
              }`}
              style={selectedAgent === agentName ? { ringColor: getAgentColor(agentName) } : {}}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getAgentColor(agentName) }}
              />
              {agentName}
            </button>
          ))}
        </div>
      )}
      <div
        ref={logRef}
        className="bg-redhat-dark-elevated rounded p-4 h-96 overflow-y-auto font-mono text-sm space-y-2"
      >
        {combined.length === 0 && (
          <div className="text-redhat-text-secondary text-center py-8">
            Waiting for activity...
          </div>
        )}
        {combined.map((item, index) => {
          if (item.type === 'event') {
            return (
              <div key={index} className="text-yellow-400 border-l-2 border-yellow-400 pl-2">
                <span className="text-redhat-text-secondary">[EVENT]</span> {item.description}
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
                  <span className="text-redhat-text-secondary select-none text-xs">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: getAgentColor(item.agent) }}
                  />
                  <div className="flex-grow">
                    <span className="text-redhat-text-secondary">[{item.agent}]</span> {item.action}
                  </div>
                </div>
                {item.reasoning && (
                  <div className="text-xs text-redhat-text-secondary ml-6 mt-1">
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
