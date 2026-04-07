import { useState } from 'react'

function PromptEditor({ agents, ws, isOpen, onClose }) {
  const [editedPrompts, setEditedPrompts] = useState(
    agents.reduce((acc, agent) => {
      acc[agent.name] = agent.system_prompt
      return acc
    }, {})
  )
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.name || '')

  const handleSave = () => {
    if (!ws || !selectedAgent) return

    const newPrompt = editedPrompts[selectedAgent]

    ws.send(JSON.stringify({
      type: 'update_prompt',
      agent_name: selectedAgent,
      prompt: newPrompt
    }))

    onClose()
  }

  const handleSaveAll = () => {
    if (!ws) return

    agents.forEach(agent => {
      const newPrompt = editedPrompts[agent.name]
      if (newPrompt !== agent.system_prompt) {
        ws.send(JSON.stringify({
          type: 'update_prompt',
          agent_name: agent.name,
          prompt: newPrompt
        }))
      }
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-redhat-dark-surface rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-redhat-grid-line">
          <h2 className="text-2xl font-bold text-redhat-red">Edit Agent Prompts</h2>
          <p className="text-sm text-redhat-text-secondary mt-1">
            Modify agent strategies mid-game to adjust their behavior
          </p>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6">
          {/* Agent Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full bg-redhat-dark-elevated text-white px-4 py-2 rounded border border-redhat-grid-line"
            >
              {agents.map(agent => (
                <option key={agent.name} value={agent.name}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Prompt Editor */}
          {selectedAgent && (
            <div>
              <label className="block text-sm font-medium mb-2">
                System Prompt for {selectedAgent}
              </label>
              <textarea
                value={editedPrompts[selectedAgent] || ''}
                onChange={(e) => setEditedPrompts({
                  ...editedPrompts,
                  [selectedAgent]: e.target.value
                })}
                className="w-full bg-redhat-dark-elevated text-white px-4 py-3 rounded border border-redhat-grid-line font-mono text-sm min-h-[300px]"
                placeholder="Enter agent system prompt..."
              />
              <p className="text-xs text-redhat-text-tertiary mt-2">
                Changes take effect on the next round
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-redhat-grid-line flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded bg-redhat-dark-elevated hover:bg-redhat-red/20 transition"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded bg-blue-600 hover:bg-blue-700 transition"
            >
              Save {selectedAgent}
            </button>
            <button
              onClick={handleSaveAll}
              className="px-6 py-2 rounded bg-redhat-red hover:bg-red-700 transition font-bold"
            >
              Save All Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PromptEditor
