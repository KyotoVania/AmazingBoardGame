// Smoke test navigateur : lance vite preview + chromium headless,
// traverse lobby -> plateau -> god mode -> lancer de dé, capture
// les erreurs console et des screenshots de contrôle.
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
// Chemin du chromium : var d'env > détection playwright > scan du cache
// ms-playwright (n'importe quelle version déjà téléchargée) > erreur claire.
// `npx playwright install chromium` le met en place sur n'importe quel OS.
function findCachedChromium() {
  try {
    const cache = join(homedir(), '.cache', 'ms-playwright')
    const dirs = readdirSync(cache)
      .filter((d) => /^chromium-\d+$/.test(d))
      .sort()
      .reverse()
    for (const d of dirs) {
      for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const exe = join(cache, d, sub)
        if (existsSync(exe)) return exe
      }
    }
  } catch {
    /* pas de cache : tant pis */
  }
  return undefined
}
const EXE =
  process.env.CHROMIUM_PATH ??
  (() => {
    try {
      const exe = chromium.executablePath()
      return existsSync(exe) ? exe : findCachedChromium()
    } catch {
      return findCachedChromium()
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

  // ----- l'Atelier : éditeur de map + onglets de customisation -----
  await page.getByRole('button', { name: /Atelier/ }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'smoke-1b-atelier-map.png' })
  await page.getByRole('button', { name: /Modèles 3D/ }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'smoke-1c-atelier-modeles.png' })
  await page.getByRole('button', { name: /Retour au lobby/ }).click()
  await page.waitForTimeout(400)

  await page.getByRole('button', { name: /LANCER LA PARTIE/ }).click()
  // premier rendu : les .glb KayKit se chargent (lent sous SwiftShader)
  await page.waitForTimeout(7000)
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
  await page.getByRole('button', { name: /SAISIR LE (PODIUM|RÉSULTAT)/ }).click()
  await page.waitForTimeout(500)

  // Deux modes de saisie : FFA = drag&drop / 1v1-2v2 = équipe gagnante
  if ((await page.getByText('Déposer ici').count()) > 0) {
    for (const team of ['Équipe Rouge', 'Équipe Bleue', 'Équipe Verte', 'Équipe Jaune']) {
      await page.getByRole('button', { name: new RegExp(team) }).click()
      await page.getByText('Déposer ici').first().click()
    }
    await page.screenshot({ path: 'smoke-7-podium.png' })
    await page.getByRole('button', { name: /VALIDER LE CLASSEMENT/ }).click()
  } else {
    await page.screenshot({ path: 'smoke-7-podium.png' })
    // mode équipes : on déclare la première équipe gagnante
    await page
      .locator('button')
      .filter({ hasText: /Équipe/ })
      .first()
      .click()
  }
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
