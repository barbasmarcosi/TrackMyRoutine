import {
  initialData, loadData, saveData, day as makeDay, exercise as makeExercise,
  startSession, activeSession, lastFinished, finishSession, discardSession,
  recentSessions, completedSets, sessionVolume, createSet, validateBackup,
} from './domain.js'

const app = document.querySelector('#app')
let data = loadData()
let tab = 'today'
let selectedDayId = data.days[0]?.id || null
let historyFilter = 'all'
let expandedHistory = null
let expandedDay = null
let addDayOpen = false
let addExerciseOpen = false
let renameExerciseId = null
let notice = null

const escape = input => String(input ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c])
const attr = escape
const date = iso => new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
const number = value => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)
const today = () => new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
const icon = (name, size = 20) => {
  const shapes = {
    gym: '<path d="M6 5v14M18 5v14M3 9v6M21 9v6M6 12h12"/>',
    today: '<path d="M4 4v16M20 4v16M2 9v6M22 9v6M4 12h16"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    plan: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  }
  return `<svg aria-hidden="true" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${shapes[name] || shapes.spark}</svg>`
}
function save() {
  if (!saveData(data)) alertNotice('No se pudieron guardar los datos en este navegador. Exportá un respaldo.', true)
}
function alertNotice(message, error = false) { notice = { message, error }; render() }
function selectedDay() { return data.days.find(d => d.id === selectedDayId) || data.days[0] || null }
function allSets(session) { return session.exercises.reduce((n, ex) => n + ex.sets.length, 0) }
function topBar() {
  return `<header class="topbar">
    <a href="./" class="brand" aria-label="TrackMyRoutine - inicio" data-action="home">
      <span class="brandmark">${icon('gym', 24)}</span>
      <span class="brandname">Track<span>My</span>Routine</span>
    </a>
    <span class="topmeta"><span class="dot"></span> Guardado local</span>
  </header>`
}
function hero(title, subtitle, kicker) {
  return `<div class="hero"><div>
    <p class="kicker">${escape(kicker)}</p>
    <h1>${title}</h1><p class="sub">${escape(subtitle)}</p>
  </div><div class="hero-pictogram">${icon('gym', 43)}</div></div>`
}
function workoutLanding() {
  const day = selectedDay()
  const previous = day ? lastFinished(data, day.id) : null
  return `${hero('Un entrenamiento<br> a la vez.', 'Tu rutina, tus marcas y tu evolución. Elegí qué día vas a entrenar.', 'TU ESPACIO DE ENTRENAMIENTO')}
    <div class="section-heading"><h2>¿Qué toca hoy?</h2><span class="hint">Tus días de entrenamiento</span></div>
    ${data.days.length ? `<div class="day-grid">${data.days.map((d, i) => `
      <button class="day-card ${d.id === day?.id ? 'selected' : ''}" data-action="select-day" data-id="${attr(d.id)}" aria-pressed="${d.id === day?.id}">
        <span class="day-icon">${String(i + 1).padStart(2, '0')}</span>
        <strong>${escape(d.name)}</strong><small>${d.exercises.length} ejercicios</small>
      </button>`).join('')}</div>` : `<div class="empty"><h3>Aún no tenés días</h3><p>Creá el primero desde la sección Mi plan.</p><button class="btn dark" data-action="tab" data-tab="plan">Configurar mi plan</button></div>`}
    ${day ? `<section class="launch" aria-label="Empezar entrenamiento"><div>
      <p>SESIÓN SELECCIONADA</p><h2>${escape(day.name)}</h2>
      <div class="last">${previous ? 'Última vez: ' + date(previous.finishedAt) + ' · ' + completedSets(previous) + ' series' : 'Tu primera sesión de este día'}</div>
    </div><button class="btn primary" data-action="start">${icon('arrow')} Empezar entrenamiento</button></section>` : ''}
    <div class="section-heading"><h2>Tu progreso</h2></div>
    ${lastSummary(day)}`
}
function lastSummary(day) {
  const last = day ? lastFinished(data, day.id) : recentSessions(data)[0]
  if (!last) return `<div class="empty"><h3>Todo empieza con una serie.</h3><p>Cuando completes tu primer entrenamiento, vas a ver acá un resumen de tu última sesión.</p></div>`
  return `<div class="panel history-card"><div class="history-summary">
    <span class="date-tile"><strong>${new Date(last.finishedAt).getDate()}</strong><small>${new Intl.DateTimeFormat('es-AR',{month:'short'}).format(new Date(last.finishedAt))}</small></span>
    <div style="flex:1"><p class="kicker" style="margin-bottom:3px">ÚLTIMA SESIÓN</p><h3>${escape(last.dayName)}</h3><p>${date(last.finishedAt)}</p></div>
    <button class="btn tiny" data-action="open-history" data-id="${attr(last.id)}">Ver detalle →</button>
  </div><div class="history-metrics"><span>${last.exercises.length} ejercicios</span><span>${completedSets(last)} series</span><span>${number(sessionVolume(last))} kg de volumen</span></div></div>`
}
function workoutHeader(session) {
  const total = allSets(session)
  const complete = completedSets(session)
  return `<section class="workout-head"><div style="min-width:0;flex:1"><span class="pill">● EN ENTRENAMIENTO</span>
    <h2>${escape(session.dayName)}</h2><p>${date(session.startedAt)} · Se guarda automáticamente</p>
    <div class="progress" aria-label="${complete} de ${total} series completadas"><span style="width:${total ? 100 * complete / total : 0}%"></span></div>
  </div><div class="workout-aside"><strong>${complete}/${total}</strong><small>series listas</small></div></section>`
}
function exerciseCard(item, index, session, previous) {
  const old = previous?.exercises.find(e => e.id === item.id)
  return `<article class="panel exercise-card" aria-label="${attr(item.name)}">
    <div class="exercise-top"><div><span class="number">EJERCICIO ${String(index + 1).padStart(2, '0')}</span>
      <h3>${escape(item.name)}</h3>
      <span class="prevdate">${old ? 'Anterior: ' + date(previous.finishedAt) : 'Sin registros anteriores'}</span></div>
      <button class="tiny-remove" data-action="remove-exercise" data-id="${attr(item.id)}" aria-label="Quitar ${attr(item.name)}" title="Quitar ejercicio">✕</button>
    </div>
    <div class="sets-head"><span>Serie</span><span>Anterior</span><span>kg</span><span>Reps</span><span>Lista</span></div>
    ${item.sets.map((set, i) => {
      const was = old?.sets[i]
      return `<div class="set-row ${set.done ? 'done' : ''}">
        <span class="set-index">${i + 1}</span>
        <span class="prev-weight">${was && was.reps !== '' ? escape(was.kg === '' ? '—' : number(was.kg)) + ' × ' + escape(was.reps) : '—'}</span>
        <input class="num-input" type="number" inputmode="decimal" min="0" max="10000" step="any" data-field="kg" data-ex="${attr(item.id)}" data-set="${attr(set.id)}" value="${attr(set.kg)}" aria-label="Peso en kilogramos de ${attr(item.name)}, serie ${i + 1}" placeholder="—">
        <input class="num-input" type="number" inputmode="numeric" min="0" max="1000" step="1" data-field="reps" data-ex="${attr(item.id)}" data-set="${attr(set.id)}" value="${attr(set.reps)}" aria-label="Repeticiones de ${attr(item.name)}, serie ${i + 1}" placeholder="—">
        <input class="check" type="checkbox" data-field="done" data-ex="${attr(item.id)}" data-set="${attr(set.id)}" ${set.done ? 'checked' : ''} aria-label="Marcar como completada la serie ${i + 1} de ${attr(item.name)}">
      </div>`
    }).join('')}
    <div class="exercise-bottom"><span class="note">kg × repeticiones · ✓ serie completada</span><div class="actions">
      <button class="btn ghost tiny" data-action="remove-set" data-id="${attr(item.id)}" ${item.sets.length <= 1 ? 'disabled' : ''} aria-label="Quitar última serie">− Serie</button>
      <button class="btn soft tiny" data-action="add-set" data-id="${attr(item.id)}">+ Serie</button>
    </div></div>
  </article>`
}
function workoutEditor(session) {
  const previous = lastFinished(data, session.dayId, session.id)
  return `${hero('Cada serie cuenta.', 'Cargá el peso y las repeticiones, marcá la serie como lista y seguí. Los valores vienen de tu última sesión.', 'TU SESIÓN ACTUAL')}
    ${workoutHeader(session)}
    ${session.exercises.length ? session.exercises.map((ex, index) => exerciseCard(ex, index, session, previous)).join('') : `<div class="empty"><h3>Agregá un ejercicio</h3><p>Empezá por crear el primero de esta sesión.</p></div>`}
    ${addExerciseOpen ? exerciseForm('session') : `<button class="btn soft full" data-action="toggle-exercise">+ Agregar otro ejercicio</button>`}
    <section class="workout-footer"><div><strong>${completedSets(session)} series completadas</strong><small>${number(sessionVolume(session))} kg de volumen total registrado</small></div>
      <div class="actions"><button class="btn danger" data-action="discard">Descartar</button><button class="btn dark" data-action="finish" ${!completedSets(session) ? 'disabled' : ''}>${icon('check',17)} Finalizar sesión</button></div>
    </section>`
}
function exerciseForm(location, dayId = '') {
  return `<form class="inline-form" data-form="add-exercise" data-location="${attr(location)}" data-id="${attr(dayId)}">
    <input class="text-input" name="name" placeholder="Nombre del ejercicio" aria-label="Nombre del ejercicio" maxlength="100" required autofocus>
    <button class="btn dark" type="submit">Agregar</button>
    <button class="btn ghost" type="button" data-action="cancel-exercise">Cancelar</button>
  </form>`
}
function historyPage() {
  const sessions = recentSessions(data, historyFilter)
  return `${hero('Tu esfuerzo,<br> en números.', 'Cada entrenamiento queda registrado. Consultá tus sesiones anteriores y compará tu evolución.', 'HISTORIAL')}
    <div class="section-heading"><h2>Sesiones anteriores</h2><span class="hint">${sessions.length} sesiones</span></div>
    <div class="filters" aria-label="Filtrar por día">
      <button class="chip ${historyFilter === 'all' ? 'active' : ''}" data-action="filter" data-id="all">Todos</button>
      ${data.days.map(d => `<button class="chip ${historyFilter === d.id ? 'active' : ''}" data-action="filter" data-id="${attr(d.id)}">${escape(d.name)}</button>`).join('')}
    </div>
    <div class="list-stack" style="margin-top:13px">${sessions.length ? sessions.map(s => historyCard(s)).join('') : `<div class="empty"><h3>Todavía no hay registros</h3><p>Cuando finalices un entrenamiento, lo vas a encontrar acá.</p><button class="btn dark" data-action="tab" data-tab="today">Ir a entrenar</button></div>`}</div>`
}
function historyCard(s) {
  const open = expandedHistory === s.id
  return `<article class="panel history-card"><div class="history-summary">
      <div class="date-tile"><strong>${new Date(s.finishedAt).getDate()}</strong><small>${new Intl.DateTimeFormat('es-AR',{month:'short'}).format(new Date(s.finishedAt))}</small></div>
      <div style="flex:1"><h3>${escape(s.dayName)}</h3><p>${date(s.finishedAt)}</p></div>
      <button class="btn tiny" data-action="expand-history" data-id="${attr(s.id)}" aria-expanded="${open}">${open ? 'Cerrar' : 'Ver detalle'}</button>
    </div><div class="history-metrics"><span>${s.exercises.length} ejercicios</span><span>${completedSets(s)} series</span><span>${number(sessionVolume(s))} kg de volumen</span></div>
    ${open ? `<div class="history-details">${s.exercises.map(ex => `
      <div class="detail-exercise"><strong>${escape(ex.name)}</strong>
      <p>${ex.sets.filter(set => set.done).map(set => `${set.kg === '' ? 'Peso corporal' : number(set.kg) + ' kg'} × ${number(set.reps)} reps`).join(' · ') || 'Sin series completadas'}</p></div>`).join('')}
      <div style="margin-top:14px;text-align:right"><button class="btn tiny danger" data-action="delete-history" data-id="${attr(s.id)}">Eliminar registro</button></div>
    </div>` : ''}
  </article>`
}
function planPage() {
  return `${hero('A tu manera.<br> A tu ritmo.', 'Armá tus días de entrenamiento. Podés renombrarlos, crear ejercicios y cambiar su orden cuando quieras.', 'MI PLANIFICACIÓN')}
    <div class="section-heading"><h2>Mis días</h2><button class="btn soft tiny" data-action="toggle-day">+ Nuevo día</button></div>
    ${addDayOpen ? `<form class="inline-form" data-form="add-day"><input class="text-input" name="name" maxlength="100" placeholder="Ej. Hombros, Push A, Full body" required aria-label="Nombre del día"><button class="btn dark" type="submit">Crear día</button></form>` : ''}
    <div class="list-stack">${data.days.map((d,i) => planCard(d,i)).join('') || '<div class="empty"><h3>Tu plan está vacío</h3><p>Agregá tu primer día para comenzar.</p></div>'}</div>
    <section class="panel settings"><h2 style="margin:0;font-size:1.12rem;letter-spacing:-.03em">Tus datos, bajo tu control</h2>
      <p>La app funciona sin cuenta y guarda las sesiones en este dispositivo. Exportá un respaldo periódicamente: al borrar los datos del navegador se pierde el historial local.</p>
      <div class="actions"><button class="btn soft" data-action="export">↓ Exportar respaldo</button>
        <button class="btn" data-action="import">↑ Importar respaldo</button></div>
      <input class="file-input" id="backup-file" type="file" accept=".json,application/json" aria-label="Archivo JSON de respaldo">
    </section>`
}
function planCard(d, i) {
  const open = expandedDay === d.id
  return `<section class="panel plan-card">
    <div class="plan-head"><div><div class="plan-title">${escape(d.name)}</div><div class="plan-sub">Día ${String(i+1).padStart(2,'0')} · ${d.exercises.length} ejercicios</div></div>
    <div class="actions"><button class="btn tiny" data-action="edit-day" data-id="${attr(d.id)}" aria-expanded="${open}">${open ? 'Cerrar' : 'Editar'}</button>
      <button class="btn tiny soft" data-action="pick-plan-day" data-id="${attr(d.id)}">Entrenar</button></div></div>
    ${open ? `
      <form class="inline-form" data-form="rename-day" data-id="${attr(d.id)}">
        <input class="text-input" name="name" value="${attr(d.name)}" maxlength="100" required aria-label="Renombrar día">
        <button class="btn tiny dark" type="submit">Guardar nombre</button>
      </form>
      <div class="plan-exercises">${d.exercises.map((e,index) => `
        <div class="plan-row">${renameExerciseId === e.id ? `
          <form data-form="rename-exercise" data-id="${attr(e.id)}" data-day="${attr(d.id)}" style="display:flex;gap:5px;flex:1">
            <input class="text-input" name="name" maxlength="100" value="${attr(e.name)}" aria-label="Renombrar ejercicio" required>
            <button class="btn tiny" type="submit">✓</button>
          </form>` : `<span>${index+1}. ${escape(e.name)}</span>`}
          <div class="actions">
            <button data-action="move-exercise" data-id="${attr(e.id)}" data-day="${attr(d.id)}" data-offset="-1" ${index===0?'disabled':''} aria-label="Subir ejercicio">↑</button>
            <button data-action="move-exercise" data-id="${attr(e.id)}" data-day="${attr(d.id)}" data-offset="1" ${index===d.exercises.length-1?'disabled':''} aria-label="Bajar ejercicio">↓</button>
            <button data-action="rename-exercise" data-id="${attr(e.id)}" aria-label="Renombrar ejercicio">✎</button>
            <button data-action="delete-plan-exercise" data-id="${attr(e.id)}" data-day="${attr(d.id)}" aria-label="Eliminar ejercicio">✕</button>
          </div>
        </div>`).join('')}
        ${addExerciseOpen === d.id ? exerciseForm('plan',d.id) : `<button class="btn soft full" data-action="add-plan-exercise" data-id="${attr(d.id)}">+ Agregar ejercicio</button>`}
        <button class="btn danger tiny" data-action="delete-day" data-id="${attr(d.id)}">Eliminar este día</button>
      </div>` : ''}
  </section>`
}
function nav() {
  return `<nav class="nav" aria-label="Navegación principal">
    ${[['today','Entrenar','today'],['history','Historial','history'],['plan','Mi plan','plan']].map(([id,label,pict]) => `
      <button data-action="tab" data-tab="${id}" class="${tab===id?'active':''}" ${tab===id?'aria-current="page"':''}>
        ${icon(pict)}<span>${label}</span>
      </button>`).join('')}
    </nav>`
}
function render() {
  const current = activeSession(data)
  app.innerHTML = `<main class="app">
    ${topBar()}
    ${notice ? `<div role="status" class="message ${notice.error?'error':''}">${escape(notice.message)}<button data-action="dismiss" aria-label="Cerrar aviso">×</button></div>` : ''}
    ${tab === 'today' ? (current ? workoutEditor(current) : workoutLanding()) : tab === 'history' ? historyPage() : planPage()}
    <div class="footer-note">TrackMyRoutine · Cada repetición cuenta.</div>
  </main>${nav()}`
}
function commit() { save(); render() }
const getPlanDay = id => data.days.find(d => d.id === id)
const getCurrentExercise = id => activeSession(data)?.exercises.find(e => e.id === id)
const getSet = target => getCurrentExercise(target.dataset.ex)?.sets.find(s => s.id === target.dataset.set)
const confirmAction = message => window.confirm(message)

app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]')
  if (!target || target.disabled) return
  const { action, id } = target.dataset
  if (action === 'home') { event.preventDefault(); tab='today'; notice=null; render(); return }
  if (action === 'tab') { tab=target.dataset.tab; notice=null; addExerciseOpen=false; render(); window.scrollTo(0,0); return }
  if (action === 'dismiss') { notice=null; render(); return }
  if (action === 'select-day') { selectedDayId=id; render(); return }
  if (action === 'start' || action === 'pick-plan-day') {
    if (action === 'pick-plan-day') {
      selectedDayId=id
      if (activeSession(data)) { tab='today'; render(); return }
    }
    try { startSession(data, selectedDayId); tab='today'; addExerciseOpen=false; commit(); window.scrollTo(0,0) }
    catch(e) { alertNotice(e.message,true) }
    return
  }
  if (action === 'add-set') {
    const ex=getCurrentExercise(id)
    if (ex) { ex.sets.push(createSet(ex.sets.at(-1))); commit() }
    return
  }
  if (action === 'remove-set') {
    const ex=getCurrentExercise(id)
    if (ex && ex.sets.length>1 && confirmAction('¿Eliminar la última serie de este ejercicio?')) { ex.sets.pop(); commit() }
    return
  }
  if (action === 'remove-exercise') {
    const current=activeSession(data), ex=getCurrentExercise(id)
    if (current && ex && confirmAction('¿Quitar '+ex.name+' de esta sesión?')) {
      current.exercises=current.exercises.filter(e=>e.id!==id); commit()
    }
    return
  }
  if (action === 'toggle-exercise') { addExerciseOpen=true; render(); return }
  if (action === 'cancel-exercise') { addExerciseOpen=false; render(); return }
  if (action === 'finish') {
    try {
      finishSession(data); addExerciseOpen=false; save()
      historyFilter='all'; tab='history'; expandedHistory=recentSessions(data)[0]?.id || null
      notice={message:'¡Entrenamiento guardado! Tu próxima sesión va a partir de estos ejercicios y marcas.',error:false}
      render(); window.scrollTo(0,0)
    } catch(e) { alertNotice(e.message,true) }
    return
  }
  if (action === 'discard') {
    if (confirmAction('¿Descartar esta sesión? Se perderán las series cargadas que aún no finalizaste.')) {
      discardSession(data); addExerciseOpen=false; commit()
    }
    return
  }
  if (action === 'open-history') { tab='history'; historyFilter='all'; expandedHistory=id; render();window.scrollTo(0,0);return }
  if (action === 'filter') { historyFilter=id; expandedHistory=null; render();return }
  if (action === 'expand-history') { expandedHistory=expandedHistory===id?null:id;render();return }
  if (action === 'delete-history') {
    if (confirmAction('¿Eliminar este entrenamiento del historial? Esta acción no se puede deshacer.')) {
      data.sessions=data.sessions.filter(s=>s.id!==id); expandedHistory=null;commit()
    }
    return
  }
  if (action === 'toggle-day') { addDayOpen=!addDayOpen;render();return }
  if (action === 'edit-day') { expandedDay=expandedDay===id?null:id;addExerciseOpen=false;renameExerciseId=null;render();return }
  if (action === 'add-plan-exercise') { addExerciseOpen=id;render();return }
  if (action === 'rename-exercise') { renameExerciseId=id;render();return }
  if (action === 'move-exercise') {
    const d=getPlanDay(target.dataset.day)
    if (!d) return
    const from=d.exercises.findIndex(e=>e.id===id)
    const to=from+Number(target.dataset.offset)
    if (from<0 || to<0 || to>=d.exercises.length) return
    const [item]=d.exercises.splice(from,1)
    d.exercises.splice(to,0,item);commit();return
  }
  if (action === 'delete-plan-exercise') {
    const d=getPlanDay(target.dataset.day)
    if (d && confirmAction('¿Eliminar el ejercicio de este día? El historial anterior se conservará.')) {
      d.exercises=d.exercises.filter(e=>e.id!==id);commit()
    }
    return
  }
  if (action === 'delete-day') {
    const d=getPlanDay(id)
    if (d && confirmAction('¿Eliminar el día '+d.name+'? Sus sesiones anteriores seguirán en el historial.')) {
      data.days=data.days.filter(day=>day.id!==id);selectedDayId=data.days[0]?.id||null;expandedDay=null;commit()
    }
    return
  }
  if (action === 'export') {
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob)
    const link=document.createElement('a')
    link.href=url;link.download='trackmyroutine-respaldo-'+new Date().toISOString().slice(0,10)+'.json'
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)
    return
  }
  if (action === 'import') { document.querySelector('#backup-file')?.click();return }
})
app.addEventListener('input', event => {
  const target=event.target
  if (!target.matches('[data-field="kg"],[data-field="reps"]')) return
  const set=getSet(target)
  if (!set) return
  const max=target.dataset.field==='kg'?10000:1000
  const raw=target.value.replace(',','.')
  const val=raw===''?'':Number(raw)
  if (val!=='' && (!Number.isFinite(val)||val<0||val>max||(target.dataset.field==='reps'&&!Number.isInteger(val)))) return
  set[target.dataset.field]=val
  save()
})
app.addEventListener('change', async event => {
  const target=event.target
  if (target.matches('[data-field="done"]')) {
    const set=getSet(target)
    if (!set) return
    if (target.checked && (!Number.isInteger(Number(set.reps)) || Number(set.reps)<=0)) {
      target.checked=false;alertNotice('Indicá las repeticiones antes de marcar la serie como lista.',true);return
    }
    set.done=target.checked;commit();return
  }
  if (target.id==='backup-file' && target.files?.length) {
    try {
      if (target.files[0].size>5_000_000) throw new Error('El archivo supera 5 MB.')
      const imported=validateBackup(JSON.parse(await target.files[0].text()))
      if (!confirmAction('¿Reemplazar toda la planificación y el historial actuales con este respaldo?')) return
      data=imported;selectedDayId=data.days[0]?.id||null;historyFilter='all';expandedHistory=null
      addExerciseOpen=false;expandedDay=null
      save();alertNotice('Respaldo importado correctamente.')
    } catch(e) { alertNotice(e.message||'No se pudo importar el respaldo.',true) }
    finally { target.value='' }
  }
})
app.addEventListener('submit', event => {
  const form=event.target.closest('[data-form]')
  if (!form) return
  event.preventDefault()
  const name=String(new FormData(form).get('name')||'').trim()
  if (!name) return
  if (form.dataset.form==='add-day') {
    const d=makeDay(name)
    data.days.push(d);selectedDayId=d.id;addDayOpen=false;expandedDay=d.id;commit();return
  }
  if (form.dataset.form==='add-exercise') {
    const e=makeExercise(name)
    if (form.dataset.location==='session') {
      const current=activeSession(data)
      if (!current) return
      current.exercises.push({...e,sets:[createSet(),createSet(),createSet()]})
    } else {
      const d=getPlanDay(form.dataset.id)
      if (!d) return
      d.exercises.push(e)
    }
    addExerciseOpen=false;commit();return
  }
  if (form.dataset.form==='rename-day') {
    const d=getPlanDay(form.dataset.id)
    if (d) { d.name=name;commit() }
    return
  }
  if (form.dataset.form==='rename-exercise') {
    const d=getPlanDay(form.dataset.day)
    const e=d?.exercises.find(e=>e.id===form.dataset.id)
    if (e) { e.name=name;renameExerciseId=null;commit() }
  }
})
render()
if ('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')) {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))
}
