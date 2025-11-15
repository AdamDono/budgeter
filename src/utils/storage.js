export function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    console.log('Loading from localStorage:', key, raw ? 'found data' : 'no data')
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    console.log('Parsed data:', parsed)
    return parsed ?? fallback
  } catch (error) {
    console.error('Error loading state:', error)
    return fallback
  }
}

export function saveState(key, value) {
  try {
    const serialized = JSON.stringify(value)
    localStorage.setItem(key, serialized)
    console.log('Saved to localStorage:', key, 'data length:', serialized.length)
  } catch (error) {
    console.error('Error saving state:', error)
  }
}
