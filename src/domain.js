export const STORAGE_KEY = 'trackmyroutine-v1'

const newId = () => typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2)

export function exercise(name) {
  return { id: newId(), name: name.trim() }
}

export function day(name, names = []) {
  return { id: newId(), name: name.trim(), exercises: names.map(exercise) }
}

export function initialData() {
  return {
    version: 1,
    days: [
      day('Pecho', ['Press de banca', 'Press inclinado', 'Aperturas', 'Fondos']),
      day('Espalda', ['Dominadas', 'Remo con barra', 'Jalón al pecho', 'Curl de bíceps']),
      day('Piernas', ['Sentadilla', 'Prensa', 'Peso muerto rumano', 'Elevación de gemelos']),
    ],
    sessions: [],
    activeId: null,
  }
}

const newSet = (source) => ({
  id: newId(),
  kg: source?.kg ?? '',
  reps: source?.reps ?? '',
  done: false,
})

export function lastFinished(data, dayId, excludingId) {
  return data.sessions
    .filter(s => s.dayId === dayId && s.finishedAt && s.id !== excludingId)
    .sort((a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || ''))[0] || null
}

export function startSession(data, dayId, at = new Date().toISOString()) {
  if (data.activeId) throw new Error('Ya hay una sesión activa.')
  const template = data.days.find(d => d.id === dayId)
  if (!template) throw new Error('No existe ese día.')
  const previous = lastFinished(data, dayId)
  const entry = {
    id: newId(), dayId, dayName: template.name, startedAt: at, finishedAt: null,
    exercises: template.exercises.map(item => {
      const old = previous?.exercises.find(e => e.id === item.id)
      const sources = old?.sets?.length ? old.sets : [null, null, null]
      return { id: item.id, name: item.name, sets: sources.map(newSet) }
    }),
  }
  data.sessions.push(entry)
  data.activeId = entry.id
  return entry
}

export function activeSession(data) {
  return data.sessions.find(s => s.id === data.activeId && !s.finishedAt) || null
}

export function completedSets(session) {
  return session.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0)
}

export function sessionVolume(session) {
  return session.exercises.reduce((total, e) => total +
    e.sets.reduce((n, s) => n + (s.done ? (Number(s.kg) || 0) * (Number(s.reps) || 0) : 0), 0), 0)
}

export function finishSession(data, at = new Date().toISOString()) {
  const current = activeSession(data)
  if (!current) throw new Error('No hay sesión activa.')
  if (completedSets(current) === 0) throw new Error('Marcá al menos una serie como completada.')
  current.finishedAt = at
  current.exercises = current.exercises.filter(e => e.sets.length)
  const planDay = data.days.find(d => d.id === current.dayId)
  if (planDay) planDay.exercises = current.exercises.map(e => ({ id: e.id, name: e.name }))
  data.activeId = null
  return current
}

export function discardSession(data) {
  const current = activeSession(data)
  if (!current) return
  data.sessions = data.sessions.filter(s => s.id !== current.id)
  data.activeId = null
}

export function recentSessions(data, dayId = 'all') {
  return data.sessions
    .filter(s => s.finishedAt && (dayId === 'all' || s.dayId === dayId))
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
}

export function exerciseHistory(data, exerciseId, excludingId) {
  return recentSessions(data)
    .filter(s => s.id !== excludingId)
    .flatMap(s => s.exercises.filter(e => e.id === exerciseId).map(e => ({ ...e, date: s.finishedAt, dayName: s.dayName })))
}

const isText = value => typeof value === 'string'
const cleanText = (value, fallback) => isText(value) ? value.trim().slice(0, 100) || fallback : fallback
const numberOrBlank = (value, max) => {
  if (value === '' || value === null || value === undefined) return ''
  if (typeof value !== 'number' && typeof value !== 'string') return ''
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= max ? n : ''
}

export function validateBackup(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.days) || !Array.isArray(raw.sessions)) {
    throw new Error('El archivo no es un respaldo compatible de TrackMyRoutine.')
  }
  if (raw.days.length > 100 || raw.sessions.length > 10000) throw new Error('El respaldo excede el tamaño permitido.')
  const uniqueDays = new Set()
  const days = raw.days.map(d => {
    if (!d || !isText(d.id) || !Array.isArray(d.exercises) || d.exercises.length > 200 || uniqueDays.has(d.id)) {
      throw new Error('El respaldo contiene días inválidos o repetidos.')
    }
    uniqueDays.add(d.id)
    return {
      id: cleanText(d.id, newId()),
      name: cleanText(d.name, 'Día sin nombre'),
      exercises: d.exercises.map(e => ({
        id: cleanText(e?.id, newId()),
        name: cleanText(e?.name, 'Ejercicio'),
      })),
    }
  })
  const uniqueSessions = new Set()
  const sessions = raw.sessions.map(s => {
    if (!s || !isText(s.id) || uniqueSessions.has(s.id) || !Array.isArray(s.exercises) || s.exercises.length > 200 ||
        !isText(s.startedAt) || !Number.isFinite(Date.parse(s.startedAt)) ||
        (s.finishedAt != null && (!isText(s.finishedAt) || !Number.isFinite(Date.parse(s.finishedAt))))) {
      throw new Error('El respaldo contiene sesiones inválidas.')
    }
    uniqueSessions.add(s.id)
    return {
      id: cleanText(s.id, newId()), dayId: cleanText(s.dayId, ''),
      dayName: cleanText(s.dayName, 'Entrenamiento'),
      startedAt: s.startedAt, finishedAt: s.finishedAt || null,
      exercises: s.exercises.map(e => {
        if (!Array.isArray(e?.sets) || e.sets.length > 100) throw new Error('El respaldo contiene series inválidas.')
        return {
          id: cleanText(e.id, newId()), name: cleanText(e.name, 'Ejercicio'),
          sets: e.sets.map(set => ({
            id: cleanText(set?.id, newId()),
            kg: numberOrBlank(set?.kg, 10000),
            reps: numberOrBlank(set?.reps, 1000),
            done: set?.done === true,
          })),
        }
      }),
    }
  })
  const active = sessions.find(s => s.id === raw.activeId && !s.finishedAt)
  return { version: 1, days, sessions, activeId: active?.id || null }
}

export function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? validateBackup(JSON.parse(saved)) : initialData()
  } catch {
    return initialData()
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export function createSet(source) { return newSet(source) }
