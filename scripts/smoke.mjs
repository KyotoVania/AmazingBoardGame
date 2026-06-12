// Smoke test navigateur : lance vite preview + chromium headless,
// traverse lobby -> plateau -> god mode -> lancer de dé, capture
// les erreurs console et des screenshots de contrôle.
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
// Chemin du chromium : var d'env > détection playwright > rien (erreur claire).
// `npx playwright install chromium` le met en place sur n'importe quel OS.
const EXE =
  process.env.CHROMIUM_PATH ??
  (() => {
    try {
      return chromium.executablePath()
    } catch {
      return undefined
    }
  })()
const PORT = 4191

const server = spawn(
  process.execPath,
  [join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: ROOT, stdio: 'ignore' },
)

const errors = []
let browser
try {
  await new Promise((r) => setTimeout(r, 2200))
  browser = await chromium.launch({
    ...(EXE ? { executablePath: EXE } : {}),
    headless: true,
    args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-sandbox'],
  })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })

  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'load' })
  await page.waitForTimeout(1300)
  await page.screenshot({ path: 'smoke-1-lobby.png' })

  await page.getByRole('button', { name: /LANCER LA PARTIE/ }).click()
  await page.waitForTimeout(2600)
  await page.screenshot({ path: 'smoke-2-board.png' })

  await page.keyboard.press('`')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'smoke-3-debug.png' })

  await page.getByRole('button', { name: '🎲 LANCER', exact: true }).click()
  await page.waitForTimeout(2200)
  await page.screenshot({ path: 'smoke-4-dice.png' })
  await page.waitForTimeout(2800)
  await page.screenshot({ path: 'smoke-5-after-roll.png' })

  // ----- séquence minijeu complète via le god mode -----
  await page.getByRole('button', { name: /DÉCLENCHER LE MINIJEU/ }).click()
  await page.getByRole('button', { name: /TIRER LA CATÉGORIE/ }).click()
  await page.getByRole('button', { name: /ROULETTE DES JEUX/ }).click({ timeout: 15000 })
  await page.getByRole('button', { name: /C'EST PARTI/ }).click({ timeout: 15000 })
  await page.screenshot({ path: 'smoke-6-minigame.png' })
  await page.getByRole('button', { name: /SAISIR LE PODIUM/ }).click()

  for (const team of ['Équipe Rouge', 'Équipe Bleue', 'Équipe Verte', 'Équipe Jaune']) {
    await page.getByRole('button', { name: new RegExp(team) }).click()
    await page.getByText('Déposer ici').first().click()
  }
  await page.screenshot({ path: 'smoke-7-podium.png' })
  await page.getByRole('button', { name: /VALIDER LE CLASSEMENT/ }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'smoke-8-rewards.png' })
  await page.getByRole('button', { name: /MANCHE 2/ }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: 'smoke-9-round2.png' })

  console.log(
    errors.length ? `ERRORS (${errors.length}):\n${errors.join('\n')}` : 'NO CONSOLE ERRORS',
  )
} catch (err) {
  errors.push(`fatal: ${err.message}`)
  console.log(errors.join('\n'))
} finally {
  await browser?.close()
  server.kill()
}
process.exit(errors.length ? 1 : 0)
