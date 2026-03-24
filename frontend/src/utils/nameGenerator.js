// Generate random GitHub-style project names
const adjectives = [
  'happy', 'clever', 'swift', 'brave', 'calm', 'bright', 'wild', 'quiet',
  'bold', 'wise', 'gentle', 'fierce', 'cool', 'warm', 'sharp', 'smooth',
  'eager', 'zealous', 'mighty', 'nimble', 'daring', 'cosmic', 'stellar', 'noble'
]

const nouns = [
  'factory', 'machine', 'robot', 'widget', 'system', 'engine', 'forge', 'works',
  'plant', 'mill', 'gear', 'cog', 'lever', 'pulley', 'dynamo', 'turbine',
  'producer', 'builder', 'maker', 'crafter', 'architect', 'designer', 'innovator', 'pioneer'
]

export function generateRandomName() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const number = Math.floor(Math.random() * 10000)

  return `${adjective}-${noun}-${number}`
}
