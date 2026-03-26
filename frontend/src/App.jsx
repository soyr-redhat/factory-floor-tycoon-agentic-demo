import { useState, useEffect } from 'react'
import AgentSetup from './components/AgentSetup'
import FactoryFloor from './components/FactoryFloor'
import Leaderboard from './components/Leaderboard'
import EventLog from './components/EventLog'
import ProfitChart from './components/ProfitChart'
import Toast from './components/Toast'
import { generateRandomName } from './utils/nameGenerator'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const LOADING_TIPS = [
  "Try telling your agent to prioritize quality over speed for higher profit per item",
  "Agents with balanced strategies often outperform aggressive ones",
  "Energy management is key - tired agents make poor decisions",
  "Broken machines cost time - consider a repair-focused strategy",
  "Rush orders mean opportunity - teach your agent to capitalize on them",
  "Operating costs drain profit every round - stay active!",
  "Quality score affects profit per shipment - don't ignore it",
  "Creative prompts lead to unique strategies - experiment!",
]

function App() {
  const [gameState, setGameState] = useState('setup') // setup, running, finished
  const [gameId, setGameId] = useState(null)
  const [agents, setAgents] = useState([])
  const [factoryState, setFactoryState] = useState(null)
  const [roundData, setRoundData] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [events, setEvents] = useState([])
  const [actions, setActions] = useState([])
  const [currentTip, setCurrentTip] = useState(0)
  const [profitHistory, setProfitHistory] = useState([])
  const [isPaused, setIsPaused] = useState(false)
  const [gameSpeed, setGameSpeed] = useState(1.0)
  const [ws, setWs] = useState(null)
  const [toasts, setToasts] = useState([])
  const [recentEvents, setRecentEvents] = useState([])
  const [leaderboardSubmitted, setLeaderboardSubmitted] = useState(false)
  const [userName, setUserName] = useState('')
  const [showUserNamePrompt, setShowUserNamePrompt] = useState(false)

  // Rotate tips while loading
  useEffect(() => {
    if (gameState === 'running' && !factoryState) {
      const interval = setInterval(() => {
        setCurrentTip((prev) => (prev + 1) % LOADING_TIPS.length)
      }, 5000) // Change tip every 5 seconds
      return () => clearInterval(interval)
    }
  }, [gameState, factoryState])

  const startGame = async (selectedAgents) => {
    // Clear any previous game state
    setToasts([])
    setRecentEvents([])
    setProfitHistory([])
    setEvents([])
    setActions([])

    try {
      const response = await fetch(`${API_URL}/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: selectedAgents,
          config: { num_rounds: 50, event_frequency: 0.15 }
        })
      })

      const data = await response.json()
      setGameId(data.game_id)
      setAgents(selectedAgents)
      setGameState('running')
      connectWebSocket(data.game_id)
    } catch (error) {
      console.error('Failed to start game:', error)
      alert('Failed to start game. Make sure the backend is running.')
    }
  }

  const connectWebSocket = (gameId) => {
    const wsUrl = API_URL.replace('http', 'ws')
    const websocket = new WebSocket(`${wsUrl}/ws/${gameId}`)

    setWs(websocket)

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)

      if (message.type === 'init') {
        setFactoryState(message.state)
        // Initialize profit history
        const initialSnapshot = {}
        message.state.agents.forEach(agent => {
          initialSnapshot[agent.name] = agent.profit
        })
        setProfitHistory([initialSnapshot])
      } else if (message.type === 'round_update') {
        setRoundData(message.data)
        setFactoryState(message.data.state)

        if (message.data.events && message.data.events.length > 0) {
          setEvents(prev => [...prev, ...message.data.events])

          // Show toasts for new events
          message.data.events.forEach(event => {
            const toastId = Date.now() + Math.random()
            setToasts(prev => [...prev, { id: toastId, message: event.description }])
          })

          // Track recent events (keep last 3)
          setRecentEvents(prev => {
            const updated = [...prev, ...message.data.events]
            return updated.slice(-3)
          })
        }

        if (message.data.actions) {
          setActions(prev => [...prev, ...message.data.actions])
        }

        // Track profit history for charting
        if (message.data.profit_snapshot) {
          setProfitHistory(prev => [...prev, message.data.profit_snapshot])
        }

        // Update leaderboard
        const lb = message.data.state.agents.map(agent => ({
          name: agent.name,
          profit: agent.profit,
          items_shipped: agent.items_shipped,
          quality_score: agent.quality_score
        })).sort((a, b) => b.profit - a.profit)

        setLeaderboard(lb)
      } else if (message.type === 'game_over') {
        setGameState('finished')
        setLeaderboard(message.leaderboard)
        // Auto-submit to leaderboard
        autoSubmitToLeaderboard(message.leaderboard)
      }
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    websocket.onclose = () => {
      console.log('WebSocket closed')
      setWs(null)
    }
  }

  const togglePause = () => {
    if (!ws) return

    const newPausedState = !isPaused
    setIsPaused(newPausedState)

    ws.send(JSON.stringify({
      type: newPausedState ? 'pause' : 'resume'
    }))
  }

  const changeSpeed = (speed) => {
    if (!ws) return

    setGameSpeed(speed)
    ws.send(JSON.stringify({
      type: 'speed',
      speed: speed
    }))
  }

  const closeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const autoSubmitToLeaderboard = async (finalLeaderboard) => {
    try {
      for (const entry of finalLeaderboard) {
        const agentConfig = agents.find(a => a.name === entry.name)
        // Use user's agent name if they customized it, otherwise generate random name
        // Check if it's a default name like "Agent 1", "Agent 2", etc.
        const isDefaultName = /^Agent \d+$/i.test(entry.name)
        const agentName = isDefaultName ? generateRandomName() : entry.name

        const submission = {
          agent_name: agentName,
          user_name: 'Anonymous',
          profit: entry.profit,
          items_shipped: entry.items_shipped,
          quality_score: entry.quality_score,
          strategy_preview: agentConfig?.system_prompt?.substring(0, 100) || 'Custom strategy',
          timestamp: new Date().toISOString()
        }

        await fetch(`${API_URL}/leaderboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission)
        })
      }

      setLeaderboardSubmitted(true)
      setShowUserNamePrompt(true)
    } catch (error) {
      console.error('Failed to auto-submit to leaderboard:', error)
    }
  }

  const updateLeaderboardWithRealName = async () => {
    // This would require storing submission IDs and updating them
    // For simplicity, just resubmit with real name
    if (!userName.trim()) {
      setShowUserNamePrompt(false)
      return
    }

    try {
      for (const entry of leaderboard) {
        const agentConfig = agents.find(a => a.name === entry.name)
        // Use user's agent name if they customized it, otherwise generate random name
        // Check if it's a default name like "Agent 1", "Agent 2", etc.
        const isDefaultName = /^Agent \d+$/i.test(entry.name)
        const agentName = isDefaultName ? generateRandomName() : entry.name

        const submission = {
          agent_name: agentName,
          user_name: userName.trim(),
          profit: entry.profit,
          items_shipped: entry.items_shipped,
          quality_score: entry.quality_score,
          strategy_preview: agentConfig?.system_prompt?.substring(0, 100) || 'Custom strategy',
          timestamp: new Date().toISOString()
        }

        await fetch(`${API_URL}/leaderboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submission)
        })
      }

      setShowUserNamePrompt(false)
      alert('Leaderboard updated with your name!')
    } catch (error) {
      console.error('Failed to update leaderboard:', error)
    }
  }

  const resetGame = () => {
    if (ws) {
      ws.close()
      setWs(null)
    }
    setGameState('setup')
    setGameId(null)
    setFactoryState(null)
    setRoundData(null)
    setLeaderboard([])
    setEvents([])
    setActions([])
    setProfitHistory([])
    setIsPaused(false)
    setGameSpeed(1.0)
    setToasts([])
    setRecentEvents([])
    setLeaderboardSubmitted(false)
    setShowUserNamePrompt(false)
    setUserName('')
  }

  return (
    <div className="min-h-screen bg-redhat-dark text-white flex flex-col">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            onClose={() => closeToast(toast.id)}
          />
        ))}
      </div>

      {/* Header */}
      <header className="bg-black">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-redhat-red">Factory Floor Tycoon</h1>
              <p className="text-gray-400 mt-1">Agentic AI Demo</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Powered by</div>
              <div className="text-redhat-red font-bold">Red Hat OpenShift AI</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-grow">
        {gameState === 'setup' && (
          <AgentSetup onStart={startGame} apiUrl={API_URL} />
        )}

        {gameState === 'running' && !factoryState && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-2xl">
              <div className="text-2xl font-bold mb-2">Starting Factory...</div>
              <div className="text-gray-400 mb-6">Initializing agents and machinery</div>
              <div className="mb-6">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-redhat-red border-r-transparent"></div>
              </div>
              <div className="min-h-[80px] flex flex-col items-center justify-center">
                <div className="text-sm font-semibold text-redhat-red mb-2">TIP</div>
                <div key={currentTip} className="text-gray-300 animate-fade-in">
                  {LOADING_TIPS[currentTip]}
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState === 'running' && factoryState && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Factory View */}
            <div className="lg:col-span-2 space-y-6">
              <FactoryFloor
                state={factoryState}
                agents={agents}
                roundData={roundData}
                recentEvents={recentEvents}
              />
              <EventLog events={events} actions={actions} agents={agents} />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Leaderboard leaderboard={leaderboard} />

              {/* Game Controls */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Game Controls</h3>

                {/* Pause/Resume */}
                <button
                  onClick={togglePause}
                  className={`w-full mb-4 px-4 py-3 rounded-lg font-bold transition ${
                    isPaused
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-yellow-600 hover:bg-yellow-700'
                  }`}
                >
                  {isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>

                {/* Speed Control */}
                <div>
                  <label className="block text-sm font-medium mb-2">Speed</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => changeSpeed(0.5)}
                      className={`px-3 py-2 rounded transition text-sm ${
                        gameSpeed === 0.5
                          ? 'bg-redhat-red text-white'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      0.5x
                    </button>
                    <button
                      onClick={() => changeSpeed(1.0)}
                      className={`px-3 py-2 rounded transition text-sm ${
                        gameSpeed === 1.0
                          ? 'bg-redhat-red text-white'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      1x
                    </button>
                  </div>
                </div>
              </div>

              {/* Profit Chart */}
              <ProfitChart profitHistory={profitHistory} agents={agents} />
            </div>
          </div>
        )}

        {gameState === 'finished' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <h2 className="text-4xl font-bold text-redhat-red mb-6">Game Over!</h2>
              <Leaderboard leaderboard={leaderboard} showDetails />

              {leaderboardSubmitted && (
                <div className="mt-6 p-4 bg-green-900 bg-opacity-30 rounded-lg border border-green-700">
                  <p className="text-green-400 font-semibold">✓ Results submitted to global leaderboard!</p>
                </div>
              )}

              {showUserNamePrompt && (
                <div className="mt-6 p-6 bg-gray-900 rounded-lg">
                  <h3 className="text-lg font-bold mb-3">Claim Your Agents (Optional)</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Your results were submitted anonymously. Want to add your name?
                  </p>
                  <div className="flex gap-3 max-w-md mx-auto">
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="flex-grow bg-gray-800 text-white px-4 py-2 rounded"
                      placeholder="Your name (optional)"
                      maxLength={30}
                    />
                    <button
                      onClick={updateLeaderboardWithRealName}
                      className="bg-redhat-red text-white px-6 py-2 rounded hover:bg-red-700 transition"
                    >
                      Claim
                    </button>
                    <button
                      onClick={() => setShowUserNamePrompt(false)}
                      className="bg-gray-700 text-white px-6 py-2 rounded hover:bg-gray-600 transition"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={resetGame}
                className="mt-8 bg-redhat-red text-white px-8 py-3 rounded-lg hover:bg-red-700 transition"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </main>

    </div>
  )
}

export default App
