import test from 'node:test'
import assert from 'node:assert/strict'
import {
  initialData, startSession, lastFinished, finishSession, recentSessions,
  sessionVolume, completedSets, createSet, validateBackup, discardSession,
} from '../src/domain.js'

test('cada día tiene su propia planificación y no hereda otro día', () => {
  const data = initialData()
  const s = startSession(data, data.days[0].id)
  assert.equal(s.exercises[0].name, 'Press de banca')
  discardSession(data)
  const other = startSession(data, data.days[1].id)
  assert.equal(other.exercises[0].name, 'Dominadas')
})

test('un día recupera ejercicios, repeticiones y pesos de su última sesión', () => {
  const data = initialData()
  const first = startSession(data, data.days[0].id, '2026-10-01T14:00:00Z')
  first.exercises[0].sets[0] = { ...createSet(), kg: 72.5, reps: 8, done: true }
  first.exercises.push({ id: 'extra', name: 'Cruces', sets: [createSet()] })
  finishSession(data, '2026-10-01T15:00:00Z')
  assert.equal(lastFinished(data, data.days[0].id).id, first.id)
  const next = startSession(data, data.days[0].id, '2026-10-08T14:00:00Z')
  assert.equal(next.exercises.at(-1).name, 'Cruces')
  assert.equal(next.exercises[0].sets[0].kg, 72.5)
  assert.equal(next.exercises[0].sets[0].reps, 8)
  assert.equal(next.exercises[0].sets[0].done, false)
  assert.equal(recentSessions(data).length, 1)
})

test('la sesión se conserva hasta finalizar y el volumen solo suma series completadas', () => {
  const data = initialData()
  const s = startSession(data, data.days[2].id)
  s.exercises[0].sets[0] = { ...createSet(), kg: 100, reps: 5, done: true }
  s.exercises[0].sets[1] = { ...createSet(), kg: 100, reps: 5, done: false }
  assert.equal(completedSets(s), 1)
  assert.equal(sessionVolume(s), 500)
  assert.throws(() => startSession(data, data.days[1].id), /activa/)
  finishSession(data)
  assert.equal(data.activeId, null)
})

test('no permite finalizar un entrenamiento sin series completadas', () => {
  const data = initialData()
  startSession(data, data.days[0].id)
  assert.throws(() => finishSession(data), /serie/)
})

test('rechaza backups corruptos o con formato incorrecto', () => {
  assert.throws(() => validateBackup({ days: [], sessions: [] }), /compatible/)
  const clean = validateBackup(initialData())
  assert.equal(clean.days.length, 3)
  assert.equal(clean.activeId, null)
})
