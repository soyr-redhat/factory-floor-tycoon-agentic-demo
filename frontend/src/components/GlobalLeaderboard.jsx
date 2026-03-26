import { useState, useEffect } from 'react'

function GlobalLeaderboard({ apiUrl }) {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [apiUrl])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${apiUrl}/leaderboard?limit=20`)
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-redhat-dark-surface rounded-lg p-6 text-center">
        <div className="text-gray-400">Loading leaderboard...</div>
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-redhat-dark-surface rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Global Leaderboard</h3>
          <button
            onClick={fetchLeaderboard}
            className="text-sm text-redhat-red hover:text-red-400 transition"
            title="Refresh leaderboard"
          >
            ↻ Refresh
          </button>
        </div>
        <div className="text-center text-gray-400 py-8">
          <p className="mb-2">No entries yet. Be the first!</p>
          <p className="text-sm">Win a game and submit your agent to appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-redhat-dark-surface rounded-lg p-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-bold">Global Leaderboard</h3>
        <button
          onClick={fetchLeaderboard}
          className="text-sm text-redhat-red hover:text-red-400 transition"
          title="Refresh leaderboard"
        >
          ↻ Refresh
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-4">Top performing agents from around the world</p>

      <div className="space-y-2 overflow-hidden">
        {leaderboard.map((entry, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 p-3 rounded ${
              index < 3 ? 'bg-yellow-900 bg-opacity-20' : 'bg-redhat-dark-elevated'
            }`}
          >
            <div className="w-6 text-center font-bold text-sm flex-shrink-0">
              {index === 0 && '🥇'}
              {index === 1 && '🥈'}
              {index === 2 && '🥉'}
              {index > 2 && <span className="text-gray-500">{index + 1}</span>}
            </div>

            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-bold text-sm truncate">{entry.agent_name}</span>
              </div>
              <div className="text-xs text-gray-400 truncate">
                by {entry.user_name}
              </div>
              <div className="text-xs text-gray-500 truncate mt-1">
                {entry.strategy_preview?.substring(0, 40)}...
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="font-bold text-green-400 text-sm">${entry.profit.toFixed(2)}</div>
              <div className="text-xs text-gray-400 whitespace-nowrap">
                {entry.items_shipped} ship
              </div>
              <div className="text-xs text-gray-400 whitespace-nowrap">
                {entry.quality_score.toFixed(0)}% qual
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GlobalLeaderboard
