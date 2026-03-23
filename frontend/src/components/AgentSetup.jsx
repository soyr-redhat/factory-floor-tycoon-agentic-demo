import { useState, useEffect } from 'react'

const AGENT_COLORS = ['#EE0000', '#FFA500', '#4169E1', '#32CD32', '#9370DB']

function AgentSetup({ onStart, apiUrl }) {
  const [presets, setPresets] = useState({})
  const [agents, setAgents] = useState([
    { name: 'Agent 1', system_prompt: '', color: AGENT_COLORS[0], preset: '' }
  ])
  const [showAbout, setShowAbout] = useState(false)

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
      <div className="bg-gray-800 rounded-lg p-8 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">Welcome to Factory Floor Tycoon!</h2>
          <button
            onClick={() => setShowAbout(!showAbout)}
            className="text-redhat-red hover:text-red-400 transition text-sm font-medium"
          >
            {showAbout ? 'Hide About' : 'About This Demo'}
          </button>
        </div>

        {showAbout && (
          <div className="bg-gray-900 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold mb-3 text-redhat-red">About Agentic AI</h3>
            <p className="text-gray-300 mb-4">
              <strong>Agentic AI</strong> is a form of artificial intelligence that can take autonomous action
              to achieve goals. These AI agents can make decisions, use tools, and adapt to changing conditions
              without constant human guidance. Watch as they compete to run the most profitable factory floor!
            </p>
            <h4 className="font-bold mb-2">What You'll See:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-300 mb-4">
              <li><strong>Tool Use:</strong> Agents decide when to produce, inspect, package, ship, or repair</li>
              <li><strong>Reasoning:</strong> Watch agents explain their decisions in real-time</li>
              <li><strong>Adaptation:</strong> Agents respond to events like machine breakdowns and rush orders</li>
              <li><strong>Competition:</strong> Multiple agents with different strategies compete for profit</li>
            </ul>
            <h4 className="font-bold mb-2">Key Concepts:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
              <li><strong>System Prompts:</strong> Define agent behavior and strategy</li>
              <li><strong>Function Calling:</strong> Agents choose which tools to use autonomously</li>
              <li><strong>State Management:</strong> Agents track energy, quality, and profit</li>
              <li><strong>Operating Costs:</strong> $2/round + energy decay forces active decision-making</li>
            </ul>
          </div>
        )}

        <p className="text-gray-300 mb-4">
          Create AI agents with different strategies and watch them compete in a factory simulation.
          Each agent will autonomously make decisions to maximize profit!
        </p>
        <div className="bg-gray-900 rounded p-4">
          <h3 className="font-bold mb-2">How it works:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
            <li>Agents can produce, package, ship items, perform quality checks, and repair machines</li>
            <li>Random events will occur (breakdowns, rush orders, quality issues)</li>
            <li>Profit depends on items shipped and quality score</li>
            <li>Energy management is crucial - tired agents work poorly</li>
            <li>Operating costs ($2/round) mean staying idle loses money</li>
            <li>The agent with the highest profit after 50 rounds wins!</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Configure Your Agents</h3>
          <button
            onClick={addAgent}
            disabled={agents.length >= 5}
            className="bg-redhat-red text-white px-4 py-2 rounded hover:bg-red-700 transition disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            + Add Agent
          </button>
        </div>

        {agents.map((agent, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-6">
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
                  className="bg-gray-900 text-white px-3 py-2 rounded text-lg font-bold"
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
                className="w-full bg-gray-900 text-white px-3 py-2 rounded"
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
                className="w-full bg-gray-900 text-white px-3 py-2 rounded h-32 font-mono text-sm"
                placeholder="Enter the strategy for this agent..."
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={handleStart}
          className="bg-redhat-red text-white px-12 py-4 rounded-lg text-xl font-bold hover:bg-red-700 transition"
        >
          Start Game
        </button>
      </div>
    </div>
  )
}

export default AgentSetup
