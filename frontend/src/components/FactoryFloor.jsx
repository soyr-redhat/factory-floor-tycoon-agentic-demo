function FactoryFloor({ state, agents, roundData, recentEvents = [] }) {
  if (!state) return null

  const getMachineStatus = (machine) => {
    return state.machine_status[machine] ? '✓' : '✗'
  }

  const getMachineColor = (machine) => {
    return state.machine_status[machine] ? 'text-green-400' : 'text-red-400'
  }

  return (
    <div className="bg-redhat-dark-surface rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Factory Floor</h2>
        <div className="text-lg font-mono">
          Round: <span className="text-redhat-red">{roundData?.round || 0}</span> / 50
        </div>
      </div>

      {/* Active Events Alert */}
      {recentEvents.length > 0 && (
        <div className="mb-4 bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-3">
          <div className="text-yellow-400 font-bold text-sm mb-2">⚠️ ACTIVE EVENTS</div>
          <div className="space-y-1">
            {recentEvents.map((event, idx) => (
              <div key={idx} className="text-yellow-200 text-sm">• {event.description}</div>
            ))}
          </div>
        </div>
      )}

      {/* Factory Stations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`bg-redhat-dark-elevated rounded-lg p-4 text-center ${getMachineColor('assembly')}`}>
          <div className="text-3xl mb-2">{getMachineStatus('assembly')}</div>
          <div className="font-bold">Assembly</div>
          <div className="text-xs text-redhat-text-secondary">Produce items</div>
        </div>
        <div className={`bg-redhat-dark-elevated rounded-lg p-4 text-center ${getMachineColor('qc')}`}>
          <div className="text-3xl mb-2">{getMachineStatus('qc')}</div>
          <div className="font-bold">Quality Control</div>
          <div className="text-xs text-redhat-text-secondary">Inspect quality</div>
        </div>
        <div className={`bg-redhat-dark-elevated rounded-lg p-4 text-center ${getMachineColor('packaging')}`}>
          <div className="text-3xl mb-2">{getMachineStatus('packaging')}</div>
          <div className="font-bold">Packaging</div>
          <div className="text-xs text-redhat-text-secondary">Package items</div>
        </div>
        <div className={`bg-redhat-dark-elevated rounded-lg p-4 text-center ${getMachineColor('shipping')}`}>
          <div className="text-3xl mb-2">{getMachineStatus('shipping')}</div>
          <div className="font-bold">Shipping</div>
          <div className="text-xs text-redhat-text-secondary">Ship orders</div>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Active Agents</h3>
        {state.agents.map((agentState, index) => {
          const agentConfig = agents.find(a => a.name === agentState.name)
          return (
            <div key={index} className="bg-redhat-dark-elevated rounded-lg p-4">
              <div className="flex items-start gap-4">
                {/* Agent Avatar */}
                <div className="flex-shrink-0">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ backgroundColor: agentConfig?.color || '#EE0000' }}
                  >
                    {agentState.name[0]}
                  </div>
                </div>

                {/* Agent Info */}
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-lg">{agentState.name}</h4>
                      {agentState.thinking && (
                        <p className="text-xs text-redhat-text-secondary italic mt-1">
                          "{agentState.thinking.substring(0, 80)}..."
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">
                        ${agentState.profit.toFixed(2)}
                      </div>
                      <div className="text-xs text-redhat-text-secondary">Profit</div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                    <div>
                      <div className="text-redhat-text-secondary text-xs">Energy</div>
                      <div className="flex items-center gap-1">
                        <div className="flex-grow bg-redhat-dark-surface/80 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${
                              agentState.energy > 60 ? 'bg-green-400' :
                              agentState.energy > 30 ? 'bg-yellow-400' :
                              'bg-red-400'
                            }`}
                            style={{ width: `${agentState.energy}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono">{agentState.energy.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-redhat-text-secondary text-xs">Quality</div>
                      <div className="font-mono">{agentState.quality_score.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-redhat-text-secondary text-xs">Inventory</div>
                      <div className="font-mono">{agentState.inventory || 0}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-redhat-text-secondary text-xs">Orders</div>
                      <div className="font-mono">{agentState.pending_orders || 0}</div>
                    </div>
                    <div>
                      <div className="text-redhat-text-secondary text-xs">Produced</div>
                      <div className="font-mono">{agentState.items_produced}</div>
                    </div>
                    <div>
                      <div className="text-redhat-text-secondary text-xs">Shipped</div>
                      <div className="font-mono">{agentState.items_shipped}</div>
                    </div>
                  </div>

                  {/* Power-ups */}
                  <div className="mt-3 pt-3 border-t border-redhat-grid-line">
                    <div className="text-redhat-text-secondary text-xs mb-2 font-semibold">POWER-UPS</div>
                    <div className="flex flex-wrap gap-1">
                      {agentState.energy_cost_multiplier < 1.0 ? (
                        <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs">
                          ⚡ Efficiency +20%
                        </span>
                      ) : (
                        <span className="bg-redhat-dark-surface/80 text-redhat-text-secondary px-2 py-1 rounded text-xs">
                          ⚡ Efficiency ($50)
                        </span>
                      )}
                      <span className="bg-redhat-dark-surface/80 text-redhat-text-secondary px-2 py-1 rounded text-xs">
                        💊 Energy Drink ($20)
                      </span>
                      <span className="bg-redhat-dark-surface/80 text-redhat-text-secondary px-2 py-1 rounded text-xs">
                        ✨ Quality Boost ($30)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FactoryFloor
