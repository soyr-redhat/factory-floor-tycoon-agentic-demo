function Leaderboard({ leaderboard, showDetails = false }) {
  const getMedalEmoji = (index) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}.`
  }

  return (
    <div className="bg-redhat-dark-surface rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">Leaderboard</h3>
      <div className="space-y-3">
        {leaderboard.map((agent, index) => (
          <div
            key={agent.name}
            className={`bg-redhat-dark-elevated rounded-lg p-4 ${
              index === 0 ? 'ring-2 ring-yellow-400' : ''
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getMedalEmoji(index)}</span>
                <div>
                  <div className="font-bold">{agent.name}</div>
                  {showDetails && (
                    <div className="text-xs text-gray-400 mt-1">
                      <div>Shipped: {agent.items_shipped} items</div>
                      <div>Quality: {agent.quality_score?.toFixed(0)}%</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-400">
                  ${agent.profit?.toFixed(2) || '0.00'}
                </div>
                <div className="text-xs text-gray-400">profit</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Leaderboard
