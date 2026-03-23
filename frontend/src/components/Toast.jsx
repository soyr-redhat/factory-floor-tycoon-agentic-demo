import { useEffect, useState } from 'react'

function Toast({ message, type = 'event', onClose }) {
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, 3000) // Auto-close after 3 seconds

    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsClosing(true)
    // Wait for animation to complete before actually removing
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const bgColor = type === 'event' ? 'bg-yellow-600' : 'bg-blue-600'

  return (
    <div className={`${bgColor} text-white px-6 py-4 rounded-lg shadow-lg max-w-md ${
      isClosing ? 'animate-slide-out' : 'animate-slide-in'
    }`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div className="flex-grow">
          <div className="font-bold text-sm mb-1">FACTORY EVENT</div>
          <div className="text-sm">{message}</div>
        </div>
        <button
          onClick={handleClose}
          className="text-white hover:text-gray-200 text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default Toast
