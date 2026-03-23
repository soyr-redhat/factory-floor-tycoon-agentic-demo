import { useState, useEffect } from 'react'
import AgentSetup from './components/AgentSetup'
import FactoryFloor from './components/FactoryFloor'
import Leaderboard from './components/Leaderboard'
import EventLog from './components/EventLog'
import ProfitChart from './components/ProfitChart'

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

        if (message.data.events) {
          setEvents(prev => [...prev, ...message.data.events])
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
  }

  return (
    <div className="min-h-screen bg-redhat-dark text-white">
      {/* Header */}
      <header className="bg-black border-b border-redhat-red">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-redhat-red">Factory Floor Tycoon</h1>
              <p className="text-gray-400 mt-1">Agentic AI Demo - Four Pillars of AI</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Powered by</div>
              <div className="text-redhat-red font-bold">Red Hat OpenShift</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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
              />
              <EventLog events={events} actions={actions} />
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
                  <div className="grid grid-cols-3 gap-2">
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
                    <button
                      onClick={() => changeSpeed(2.0)}
                      className={`px-3 py-2 rounded transition text-sm ${
                        gameSpeed === 2.0
                          ? 'bg-redhat-red text-white'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      2x
                    </button>
                  </div>
                </div>
              </div>

              {/* Game Info */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Game Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Round:</span>
                    <span className="font-mono">{roundData?.round || 0} / 50</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Inventory:</span>
                    <span className="font-mono">{factoryState.inventory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pending Orders:</span>
                    <span className="font-mono">{factoryState.pending_orders}</span>
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

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p>Built with open source technologies | Red Hat AI - Four Pillars Demo</p>
        </div>
      </footer>
    </div>
  )
}

export default App
