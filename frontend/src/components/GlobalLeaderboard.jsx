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
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <div className="text-gray-400">Loading leaderboard...</div>
      </div>
    )
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
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
    <div className="bg-gray-800 rounded-lg p-6">
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

      <div className="space-y-2">
        {leaderboard.map((entry, index) => (
          <div
            key={index}
            className={`flex items-center gap-4 p-3 rounded ${
              index < 3 ? 'bg-yellow-900 bg-opacity-20' : 'bg-gray-900'
            }`}
          >
            <div className="w-8 text-center font-bold text-lg">
              {index === 0 && '🥇'}
              {index === 1 && '🥈'}
              {index === 2 && '🥉'}
              {index > 2 && <span className="text-gray-500">{index + 1}</span>}
            </div>

            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <span className="font-bold">{entry.agent_name}</span>
                <span className="text-sm text-gray-400">by {entry.user_name}</span>
              </div>
              <div className="text-sm text-gray-400 truncate">
                {entry.strategy_preview}...
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-green-400">${entry.profit.toFixed(2)}</div>
              <div className="text-xs text-gray-400">
                {entry.items_shipped} shipped • {entry.quality_score.toFixed(0)}% quality
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GlobalLeaderboard
