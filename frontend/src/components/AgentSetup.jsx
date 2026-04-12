import { useState, useEffect } from 'react'
import GlobalLeaderboard from './GlobalLeaderboard'

const AGENT_COLORS = ['#EE0000', '#FFA500', '#4169E1', '#32CD32', '#9370DB']

function AgentSetup({ onStart, apiUrl }) {
  const [presets, setPresets] = useState({})
  const [agents, setAgents] = useState([
    { name: 'Agent 1', system_prompt: '', color: AGENT_COLORS[0], preset: '' }
  ])
  const [activeTab, setActiveTab] = useState('about')

  useEffect(() => {
    fetch(`${apiUrl}/presets`)
      .then(res => res.json())
      .then(data => setPresets(data.presets))
      .catch(err => console.error('Failed to load presets:', err))
  }, [apiUrl])

  const addAgent = () => {
    if (agents.length >= 5) return
    setAgents([
      ...agents,
      {
        name: `Agent ${agents.length + 1}`,
        system_prompt: '',
        color: AGENT_COLORS[agents.length],
        preset: ''
      }
    ])
  }

  const removeAgent = (index) => {
    if (agents.length <= 1) return
    setAgents(agents.filter((_, i) => i !== index))
  }

  const updateAgent = (index, field, value) => {
    const updated = [...agents]
    updated[index][field] = value

    // If preset is selected, load the prompt
    if (field === 'preset' && value && presets[value]) {
      updated[index].system_prompt = presets[value].prompt
    }

    setAgents(updated)
  }

  const handleStart = () => {
    // Validate
    for (let agent of agents) {
      if (!agent.name.trim()) {
        alert('Please provide names for all agents')
        return
      }
      if (!agent.system_prompt.trim()) {
        alert('Please provide system prompts for all agents')
        return
      }
    }

    onStart(agents)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Tab Navigation */}
      <div className="bg-redhat-dark-surface rounded-t-lg overflow-hidden">
        <div className="flex border-b border-redhat-grid-line">
          <button
            onClick={() => setActiveTab('about')}
            className={`flex-1 px-6 py-4 text-lg font-semibold transition ${
              activeTab === 'about'
                ? 'bg-redhat-dark-elevated text-redhat-red border-b-2 border-redhat-red'
                : 'text-redhat-text-secondary hover:text-white hover:bg-redhat-dark-elevated'
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`flex-1 px-6 py-4 text-lg font-semibold transition ${
              activeTab === 'setup'
                ? 'bg-redhat-dark-elevated text-redhat-red border-b-2 border-redhat-red'
                : 'text-redhat-text-secondary hover:text-white hover:bg-redhat-dark-elevated'
            }`}
          >
            Setup Agents
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 px-6 py-4 text-lg font-semibold transition ${
              activeTab === 'leaderboard'
                ? 'bg-redhat-dark-elevated text-redhat-red border-b-2 border-redhat-red'
                : 'text-redhat-text-secondary hover:text-white hover:bg-redhat-dark-elevated'
            }`}
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-redhat-dark-surface rounded-b-lg p-8">
        {/* About Tab */}
        {activeTab === 'about' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Welcome to Factory Floor Tycoon!</h2>

            <div className="bg-redhat-dark-elevated rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold mb-3 text-redhat-red">About Agentic AI</h3>
              <p className="text-redhat-text-secondary mb-4">
                <strong>Agentic AI</strong> is a form of artificial intelligence that can take autonomous action
                to achieve goals. These AI agents can make decisions, use tools, and adapt to changing conditions
                without constant human guidance. Watch as they compete to run the most profitable factory floor!
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold mb-2">What You'll See:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-redhat-text-secondary">
                    <li><strong>Tool Use:</strong> Agents decide when to produce, inspect, package, ship, or repair</li>
                    <li><strong>Reasoning:</strong> Watch agents explain their decisions in real-time</li>
                    <li><strong>Adaptation:</strong> Agents respond to events like machine breakdowns and rush orders</li>
                    <li><strong>Competition:</strong> Multiple agents with different strategies compete for profit</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Key Concepts:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-redhat-text-secondary">
                    <li><strong>System Prompts:</strong> Define agent behavior and strategy</li>
                    <li><strong>Function Calling:</strong> Agents choose which tools to use autonomously</li>
                    <li><strong>State Management:</strong> Agents track energy, quality, and profit</li>
                    <li><strong>Operating Costs:</strong> $2/round + energy decay forces active decision-making</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-redhat-dark-elevated rounded-lg p-6 mb-8">
              <h3 className="font-bold mb-3 text-redhat-red text-xl">How to Play</h3>
              <p className="text-redhat-text-secondary mb-4">
                Factory Floor Tycoon is a competitive simulation where AI agents manage a factory floor.
                Your job is to write the best strategy prompt that will guide your agent to maximum profit!
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-bold mb-2 text-sm">Gameplay:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-redhat-text-secondary">
                    <li><strong>Choose a preset or write custom strategy</strong></li>
                    <li><strong>Agents make autonomous decisions</strong></li>
                    <li><strong>Profit = Shipped units × $10 × Quality Score</strong></li>
                    <li><strong>Energy management matters</strong></li>
                    <li><strong>Quality affects profit per shipment</strong></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-2 text-sm">Powerups:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-redhat-text-secondary">
                    <li><strong>Energy Drink ($20):</strong> Restore +50 energy</li>
                    <li><strong>Quality Boost ($30):</strong> Add +20% quality</li>
                    <li><strong>Efficiency Upgrade ($50):</strong> -20% energy costs permanently</li>
                  </ul>
                </div>
              </div>

              <div className="bg-redhat-dark-surface rounded p-4 mb-4">
                <h4 className="font-bold mb-2 text-sm">Game Mechanics:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-redhat-text-secondary">
                  <li>50 rounds total, $2 operating cost per round</li>
                  <li>New orders arrive every 3 rounds, bonus batch every 10 rounds</li>
                  <li>Random events: machine breakdowns, rush orders, quality issues</li>
                  <li>Winner = highest profit after 50 rounds</li>
                </ul>
              </div>

              <div className="bg-redhat-dark-surface rounded p-4">
                <h4 className="font-bold mb-2 text-sm">Interactive Controls:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-redhat-text-secondary">
                  <li><strong>Edit Agent Prompts:</strong> Modify strategies mid-game to adjust agent behavior</li>
                  <li><strong>Pause/Resume:</strong> Pause to observe or resume play</li>
                  <li><strong>Speed Control:</strong> Adjust game speed to watch closely or move quickly</li>
                  <li><strong>Stop Game:</strong> End early and still submit scores to leaderboard</li>
                </ul>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => setActiveTab('setup')}
                className="bg-redhat-red text-white px-12 py-4 rounded-lg text-xl font-bold hover:bg-red-700 transition"
              >
                Play Now →
              </button>
            </div>
          </div>
        )}

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">Configure Your Agents</h3>
              <button
                onClick={addAgent}
                disabled={agents.length >= 5}
                className="bg-redhat-red text-white px-4 py-2 rounded hover:bg-red-700 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                + Add Agent
              </button>
            </div>

            <div className="space-y-4 mb-8">
              {agents.map((agent, index) => (
                <div key={index} className="bg-redhat-dark-elevated rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: agent.color }}
                      />
                      <input
                        type="text"
                        value={agent.name}
                        onChange={(e) => updateAgent(index, 'name', e.target.value)}
                        className="bg-redhat-dark-surface text-redhat-text-primary px-3 py-2 rounded text-lg font-bold"
                        placeholder="Agent Name"
                      />
                    </div>
                    {agents.length > 1 && (
                      <button
                        onClick={() => removeAgent(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Strategy Preset</label>
                    <select
                      value={agent.preset}
                      onChange={(e) => updateAgent(index, 'preset', e.target.value)}
                      className="w-full bg-redhat-dark-surface text-redhat-text-primary px-3 py-2 rounded"
                    >
                      <option value="">Custom</option>
                      {Object.entries(presets).map(([key, preset]) => (
                        <option key={key} value={key}>{preset.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">System Prompt</label>
                    <textarea
                      value={agent.system_prompt}
                      onChange={(e) => updateAgent(index, 'system_prompt', e.target.value)}
                      className="w-full bg-redhat-dark-surface text-redhat-text-primary px-3 py-2 rounded h-32 font-mono text-sm"
                      placeholder="Enter the strategy for this agent..."
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={handleStart}
                className="bg-redhat-red text-white px-12 py-4 rounded-lg text-xl font-bold hover:bg-red-700 transition"
              >
                Start Game
              </button>
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="max-w-4xl mx-auto">
            <GlobalLeaderboard apiUrl={apiUrl} />
          </div>
        )}
      </div>
    </div>
  )
}

export default AgentSetup
