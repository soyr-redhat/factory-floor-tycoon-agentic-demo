import { useState } from 'react'

function LeaderboardSubmit({ leaderboard, agents, apiUrl, onSubmitComplete }) {
  const [userName, setUserName] = useState('')
  const [selectedAgents, setSelectedAgents] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const toggleAgent = (agentName) => {
    setSelectedAgents(prev => ({
      ...prev,
      [agentName]: !prev[agentName]
    }))
  }

  const handleSubmit = async () => {
    const agentsToSubmit = leaderboard.filter(entry => selectedAgents[entry.name])

    if (agentsToSubmit.length === 0) {
      alert('Please select at least one agent to submit')
      return
    }

    setSubmitting(true)

    try {
      // Find the original agent config to get system prompt
      const submissions = agentsToSubmit.map(entry => {
        const agentConfig = agents.find(a => a.name === entry.name)
        return {
          agent_name: entry.name,
          user_name: userName.trim() || 'Anonymous',
          profit: entry.profit,
          items_shipped: entry.items_shipped,
          quality_score: entry.quality_score,
          strategy_preview: agentConfig?.system_prompt?.substring(0, 100) || 'Custom strategy',
          timestamp: new Date().toISOString()
        }
      })

      // Submit each agent
      for (const submission of submissions) {
        await fetch(`${apiUrl}/leaderboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission)
        })
      }

      setSubmitted(true)
      if (onSubmitComplete) {
        onSubmitComplete()
      }
    } catch (error) {
      console.error('Failed to submit to leaderboard:', error)
      alert('Failed to submit to leaderboard. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <div className="text-green-500 text-xl font-bold mb-2">✓ Submitted to Leaderboard!</div>
        <p className="text-gray-300">Your agents have been added to the global leaderboard.</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">Submit to Leaderboard</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Your Name (optional)</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="w-full bg-gray-900 text-white px-3 py-2 rounded"
          placeholder="Anonymous"
          maxLength={30}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select agents to submit:</label>
        <div className="space-y-2">
          {leaderboard.map((entry) => {
            const agent = agents.find(a => a.name === entry.name)
            return (
              <label
                key={entry.name}
                className="flex items-center gap-3 p-3 bg-gray-900 rounded cursor-pointer hover:bg-gray-700 transition"
              >
                <input
                  type="checkbox"
                  checked={selectedAgents[entry.name] || false}
                  onChange={() => toggleAgent(entry.name)}
                  className="w-5 h-5"
                />
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: agent?.color || '#EE0000' }}
                />
                <div className="flex-grow">
                  <div className="font-bold">{entry.name}</div>
                  <div className="text-sm text-gray-400">
                    ${entry.profit.toFixed(2)} profit • {entry.items_shipped} shipped
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || Object.values(selectedAgents).every(v => !v)}
        className="w-full bg-redhat-red text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Submit to Leaderboard'}
      </button>
    </div>
  )
}

export default LeaderboardSubmit
