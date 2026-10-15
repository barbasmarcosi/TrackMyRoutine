import { rm, mkdir, copyFile } from 'node:fs/promises'
import { join } from 'node:path'

const out = 'dist'
await rm(out, { recursive: true, force: true })
await mkdir(join(out, 'src'), { recursive: true })
await Promise.all([
  'index.html', 'icon.svg', 'manifest.webmanifest', 'sw.js',
].map(file => copyFile(file, join(out, file))))
await Promise.all([
  'app.js', 'domain.js', 'styles.css',
].map(file => copyFile(join('src', file), join(out, 'src', file))))
console.log('Built static SPA in dist/')
