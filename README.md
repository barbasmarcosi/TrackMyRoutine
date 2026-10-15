# TrackMyRoutine

**Tu progreso, serie a serie.** SPA *mobile-first* inspirada en la simplicidad de PanaCalc. Creada para registrar entrenamientos de fuerza sin cuentas, menús innecesarios ni esperas.

## Funcionalidades

- **Plan por días:** Pecho, Espalda y Piernas son ejemplos iniciales. Agregá, renombrá o eliminá días como Push A, Pull B o Full Body.
- **Ejercicios propios por día:** podés agregar, renombrar, borrar y reordenar ejercicios en **Mi plan**.
- **Cargar una sesión:** elegís un día, tocás **Empezar entrenamiento** y tenés las series listas para registrar.
- **La última sesión como referencia:** al empezar un día se precargan sus ejercicios y las series, pesos y repeticiones de **la última sesión finalizada de ese mismo día**. Las series empiezan desmarcadas. Al lado de cada serie se ve cuánto hiciste la vez anterior.
- **Carga rápida:** campo de kg y repeticiones por serie; ✓ cuando la completás. Podés agregar/quitar series y ejercicios durante el entrenamiento.
- **Sesión en curso:** se guarda en el navegador incluso si cerrás o recargás la página; se recupera al volver a abrir la SPA.
- **Historial:** lista cronológica, filtro por día, resumen de series completadas y volumen registrado, y detalle de cada ejercicio.
- **Plan actualizable:** al finalizar una sesión, su lista de ejercicios se vuelve el plan predeterminado de ese día, para que los cambios hechos durante el entrenamiento aparezcan la próxima vez.
- **Respaldo:** exportación e importación de todo el estado en JSON desde **Mi plan**.
- **PWA offline:** service worker y manifiesto para instalar la app después de una primera visita en HTTPS.

**Unidades:** kg y repeticiones. El volumen mostrado es la suma de kg × repeticiones de las series marcadas como completadas. Para ejercicios de peso corporal se puede dejar kg vacío (cuenta 0 para volumen).

## Arrancar localmente

No tiene dependencias de JavaScript y no necesita un proceso de compilación. Para servir la web con un servidor estático:

```bash
python3 -m http.server 4173
```

Abrí http://localhost:4173/ en tu navegador.

Para verificar la sintaxis JavaScript y ejecutar las pruebas del modelo (requiere Node.js 22 o superior):

```bash
npm run verify
```

## Publicar gratuitamente

El proyecto incluye un workflow para publicar desde `main` en **GitHub Pages**, siguiendo el mismo enfoque que PanaCalc:

1. Integrar la rama de desarrollo cuando esté validada.
2. En GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. El workflow `deploy-pages.yml` publica el sitio de forma estática.

Dirección esperada una vez habilitada y publicada: https://barbasmarcosi.github.io/TrackMyRoutine/

## Arquitectura

- HTML, CSS y JavaScript ES Modules nativos (sin framework ni backend).
- `src/domain.js`: modelo de días, ejercicios, sesiones y persistencia.
- `src/app.js`: SPA, vistas y eventos delegados (las entradas numéricas no reconstruyen el DOM mientras tipeás).
- `src/styles.css`: interfaz responsive, navegación móvil y estados visuales.
- `tests/domain.test.js`: pruebas del comportamiento crítico mediante el test runner de Node.

## Importante sobre los datos

Los registros se guardan en **localStorage**, dentro del navegador y dispositivo actual. **No hay sincronización entre dispositivos ni almacenamiento en la nube.** Borrar los datos del sitio, navegar en modo privado o cambiar de teléfono puede borrar o aislar el historial. Usá **Mi plan → Exportar respaldo** regularmente. Para trasladar tus datos, importá ese JSON en el otro dispositivo.

La app no pide datos personales ni se comunica con un servidor para guardar tus rutinas. La fuente de Google Fonts es opcional: sin conectividad se usa la tipografía del sistema.

### Comportamiento de sesiones

- Solo puede haber una sesión en curso.
- Al finalizar es obligatorio haber marcado al menos una serie.
- Se conservan sesiones antiguas incluso si borrás un día de tu plan.
- Si modificás el plan de un día, esos cambios se usarán al empezar la próxima sesión de ese día; para los ejercicios que mantengan su identidad se reutilizan pesos y repeticiones previos.
