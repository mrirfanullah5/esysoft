import './style.css'

type Route = 'login' | 'home'

/** Same as `package.json` and `src-tauri/tauri.conf.json` — bump all together. */
const ESYSOFT_APP_VERSION = '1.5.1'
const ESYSOFT_VERSION_LABEL = `EsySoft v${ESYSOFT_APP_VERSION}`

/** Shop contact — login, welcome, invoices, statements, reports (prints). */
const SHOP_CONTACT_PHONE = '+92 346 906 3693'

const DEFAULT_PIN = '000000'
const PIN_STORAGE_KEY = 'esysoft.pin.v1'
const THEME_STORAGE_KEY = 'esysoft.theme.v1'

function loadEffectivePin(): string {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY)
    if (!raw) return DEFAULT_PIN
    const o = JSON.parse(raw) as { pin?: string }
    if (typeof o?.pin === 'string' && /^\d{6}$/.test(o.pin)) return o.pin
  } catch {
    /* ignore */
  }
  return DEFAULT_PIN
}

function savePin(pin: string) {
  localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify({ pin }))
}

type ThemeMode = 'dark' | 'light'

function loadTheme(): ThemeMode {
  const v = localStorage.getItem(THEME_STORAGE_KEY)
  if (v === 'light' || v === 'dark') return v
  return 'dark'
}

function saveTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_STORAGE_KEY, mode)
}

function applyTheme() {
  document.body.classList.toggle('theme-light', loadTheme() === 'light')
}

function svgIcon(pathD: string) {
  return `<svg class="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${pathD}"/></svg>`
}

/** Dashboard home tiles only — Lucide-style outline icons (stroke) for a cleaner look. */
function dashOutlineIcon(children: string) {
  return `<svg class="ico dash-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${children}</svg>`
}

function sleepMs(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

let didRunAutoUpdateCheck = false

/** Once at startup (login screen): fetch `update.json` from tauri.conf endpoints; offer install. */
async function maybeCheckAppUpdates(): Promise<void> {
  if (didRunAutoUpdateCheck) return
  didRunAutoUpdateCheck = true
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const { relaunch } = await import('@tauri-apps/plugin-process')
    const update = await check({ timeout: 45_000 })
    if (!update) return
    const notes = (update.body ?? '').trim()
    const ok = await confirmModal({
      title: `Update available — v${update.version}`,
      message: notes
        ? `${notes}\n\nInstall now? The app will download the update and restart.`
        : `A new version is ready.\n\nInstall now? The app will download the update and restart.`,
      confirmText: 'Install update',
      cancelText: 'Not now',
    })
    if (!ok) return
    await update.downloadAndInstall()
    await relaunch()
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[updater] check failed:', e)
  }
}

type ConfirmVariant = 'default' | 'danger'

async function confirmModal(opts: {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  /** Extra class on the dialog card (e.g. exit / backup styling). */
  cardClass?: string
  /** When true, Enter does not confirm (avoids accidental choice on sensitive prompts). */
  disableEnterShortcut?: boolean
  /** Which button receives initial focus. */
  initialFocus?: 'ok' | 'cancel'
}): Promise<boolean> {
  // ensure only one confirm at a time
  document.querySelector('.confirm-overlay')?.remove()

  const overlay = makeEl('div', { className: 'confirm-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } })
  const cardClasses = ['confirm-card', opts.cardClass].filter(Boolean).join(' ')
  const card = makeEl('div', { className: cardClasses })
  overlay.append(card)

  const v = opts.variant ?? 'default'
  const okText = opts.confirmText ?? (v === 'danger' ? 'Delete' : 'Confirm')
  const cancelText = opts.cancelText ?? 'Cancel'

  card.innerHTML = `
    <div class="confirm-hd">
      <div class="confirm-title">${escHtml(opts.title)}</div>
    </div>
    <div class="confirm-bd">
      <div class="confirm-msg">${escHtml(opts.message).replaceAll('\n', '<br/>')}</div>
    </div>
    <div class="confirm-actions">
      <button type="button" class="btn ghost confirm-cancel">${escHtml(cancelText)}</button>
      <button type="button" class="btn ${v === 'danger' ? 'danger' : 'primary'} confirm-ok">${escHtml(okText)}</button>
    </div>
  `

  document.body.append(overlay)
  queueMicrotask(() => overlay.classList.add('is-open'))

  const okBtn = overlay.querySelector<HTMLButtonElement>('.confirm-ok')
  const cancelBtn = overlay.querySelector<HTMLButtonElement>('.confirm-cancel')

  const tearDown = async () => {
    overlay.classList.remove('is-open')
    await sleepMs(140)
    overlay.remove()
  }

  return await new Promise<boolean>((resolve) => {
    const finish = async (result: boolean) => {
      window.removeEventListener('keydown', onKey)
      await tearDown()
      resolve(result)
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void finish(false)
      if (!opts.disableEnterShortcut && e.key === 'Enter') void finish(true)
    }

    window.addEventListener('keydown', onKey)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) void finish(false)
    })
    okBtn?.addEventListener('click', () => void finish(true))
    cancelBtn?.addEventListener('click', () => void finish(false))

    const focusTarget = opts.initialFocus === 'cancel' ? cancelBtn : okBtn
    queueMicrotask(() => focusTarget?.focus())
  })
}

const ICON_LOCK = svgIcon(
  'M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z',
)
const ICON_LOGOUT = svgIcon(
  'M4 3a1 1 0 0 1 1-1h8a2 2 0 0 1 2 2v3a1 1 0 1 1-2 0V4H6v16h7v-3a1 1 0 1 1 2 0v3a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V3Zm12.7 5.3a1 1 0 0 1 1.4 0l3 3a1 1 0 0 1 0 1.4l-3 3a1 1 0 1 1-1.4-1.4l1.3-1.3H10a1 1 0 1 1 0-2h8l-1.3-1.3a1 1 0 0 1 0-1.4Z',
)
const ICON_SHIELD = svgIcon(
  'M12 2 20 6v6c0 5.25-3.44 9.86-8 10-4.56-.14-8-4.75-8-10V6l8-4Zm0 5.2-4 2v4.65c0 3.5 2.2 6.7 4 6.9 1.8-.2 4-3.4 4-6.9V9.2l-4-2Z',
)
const ICON_PLUS = svgIcon('M11 5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5Z')
const ICON_DOC = svgIcon(
  'M7 3h7l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm6 1.5V8h3.5L13 4.5Z',
)
const ICON_TAG = svgIcon('M3 12l9-9h7v7l-9 9L3 12Zm12-6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z')
const ICON_COIN = svgIcon(
  'M12 2c5.52 0 10 2.24 10 5s-4.48 5-10 5S2 9.76 2 7 6.48 2 12 2Zm0 12c5.52 0 10-2.24 10-5v4c0 2.76-4.48 5-10 5S2 15.76 2 13V9c0 2.76 4.48 5 10 5Z',
)
const ICON_RECEIPT = svgIcon(
  'M7 2h10a2 2 0 0 1 2 2v18l-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1V4a2 2 0 0 1 2-2Zm2 6h6a1 1 0 1 0 0-2H9a1 1 0 1 0 0 2Zm0 4h6a1 1 0 1 0 0-2H9a1 1 0 1 0 0 2Zm0 4h4a1 1 0 1 0 0-2H9a1 1 0 1 0 0 2Z',
)
const ICON_CHART = svgIcon(
  'M5 21a1 1 0 0 1-1-1V4a1 1 0 1 1 2 0v15h15a1 1 0 1 1 0 2H5Zm3-3V11a1 1 0 0 1 2 0v7a1 1 0 1 1-2 0Zm4 0V8a1 1 0 0 1 2 0v10a1 1 0 1 1-2 0Zm4 0v-5a1 1 0 1 1 2 0v5a1 1 0 1 1-2 0Z',
)
const ICON_SEARCH = svgIcon(
  'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C11.99 14 10 12.01 10 9.5S11.99 5 14.5 5 19 6.99 19 9.5 17.01 14 14.5 14z',
)
const ICON_EYE = svgIcon(
  'M12 5c-5.05 0-9.27 3.11-11 7 1.73 3.89 5.95 7 11 7s9.27-3.11 11-7c-1.73-3.89-5.95-7-11-7Zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9Zm0-2.2A2.3 2.3 0 1 0 12 9.7a2.3 2.3 0 0 0 0 4.6Z',
)

const DASH_ICO_PLUS = dashOutlineIcon('<path d="M12 5v14"/><path d="M5 12h14"/>')
const DASH_ICO_FILE = dashOutlineIcon(
  '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h5"/>',
)
const DASH_ICO_TAG = dashOutlineIcon(
  '<path d="M3 12l9-9h7v7l-9 9-7-7Z"/><circle cx="16.5" cy="7.5" r="2" fill="none"/>',
)
const DASH_ICO_RECEIPT = dashOutlineIcon(
  '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2"/><path d="M8 10h8"/><path d="M8 14h8"/><path d="M8 18h6"/>',
)
const DASH_ICO_COINS = dashOutlineIcon(
  '<path d="M12 3c4.42 0 8 1.34 8 3s-3.58 3-8 3-8-1.34-8-3 3.58-3 8-3Z"/><path d="M4 6v5c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/><path d="M4 11v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5"/>',
)
const DASH_ICO_SEARCH = dashOutlineIcon('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')
const DASH_ICO_MAP_PIN = dashOutlineIcon(
  '<path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z"/><circle cx="12" cy="11" r="2.5" fill="none"/>',
)
const DASH_ICO_TRASH = dashOutlineIcon(
  '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
)
const DASH_ICO_CHART = dashOutlineIcon(
  '<path d="M3 3v18h18"/><path d="M7 16V10"/><path d="M12 16V7"/><path d="M17 16v-6"/>',
)
const DASH_ICO_SETTINGS = dashOutlineIcon(
  '<circle cx="12" cy="12" r="3"/><path d="M12 1.5v2.2m0 16.6v2.2M4.9 4.9l1.6 1.6m11 11 1.6 1.6M1.5 12h2.2m16.6 0h2.2M4.9 19.1l1.6-1.6m11-11 1.6-1.6"/>',
)

/** Document / application row in Pending Dues */
const ICON_DUES_APP = svgIcon('M7 3h7l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm6 1.5V8h3.5L13 4.5Z')
/** Pistol / weapon row in Pending Dues */
const ICON_DUES_WEAPON = svgIcon(
  'M4 11h8V9a4 4 0 0 1 8 0v2h4v2H4v-2Zm10 0h2V9a2 2 0 1 0-4 0v2ZM6 15h12v3H6v-3Z',
)

/** Maximized (not fullscreen) so the Windows taskbar stays visible — login + after unlock. */
async function applyMainWindowMaximized() {
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const appWindow = getCurrentWindow()
    await appWindow.setResizable(true)
    await appWindow.setFullscreen(false)
    await appWindow.maximize()
  } catch {
    // Not running inside Tauri (e.g. browser preview).
  }
}

/** `render()` runs many times; close handler must register only once or dialogs / quit break. */
let closeBackupPromptInstalled = false

async function installCloseBackupPrompt() {
  if (closeBackupPromptInstalled) return
  closeBackupPromptInstalled = true
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const appWindow = getCurrentWindow()

    await appWindow.onCloseRequested(async (e: { preventDefault: () => void }) => {
      e.preventDefault()

      const shouldBackup = await confirmModal({
        title: 'Close EsySoft?',
        message:
          'Before exiting, do you want to save a backup of your data?\n\n' +
          'Yes — creates a .db backup (same as Settings), then closes the app.\n' +
          'No — closes the app without creating a new backup file.',
        confirmText: 'Yes',
        cancelText: 'No',
        cardClass: 'confirm-card--exit-backup',
        disableEnterShortcut: true,
        initialFocus: 'cancel',
      })
      if (shouldBackup) {
        try {
          await downloadBackupDbFile()
        } catch {
          // If backup fails for any reason, still allow the user to close.
        }
        // Save-file / download UI must fully dismiss before destroy (WebView2).
        await sleepMs(320)
      }

      const forceQuit = async () => {
        try {
          await appWindow.destroy()
        } catch {
          try {
            const { exit } = await import('@tauri-apps/plugin-process')
            await exit(0)
          } catch {
            /* ignore */
          }
        }
      }
      // Leave the close-request stack before tearing down the window.
      window.setTimeout(() => {
        void forceQuit()
      }, 0)
    })
  } catch {
    closeBackupPromptInstalled = false
    // Not running inside Tauri (e.g. browser preview).
  }
}

function clampDigits(s: string, maxLen: number) {
  const digitsOnly = s.replace(/\D/g, '')
  return digitsOnly.slice(0, maxLen)
}

/** Pakistan CNIC: 13 digits shown as #####-#######-# */
function formatCnicDigits(raw: string) {
  const d = clampDigits(raw, 13)
  if (d.length <= 5) return d
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`
}

function normalizeEntryNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

function normalizeEntryCnicKey(cnic: string): string {
  return clampDigits(cnic, 13)
}

/** Existing rows with same name (non-empty) or same full 13-digit CNIC. */
function findDuplicateEntries(name: string, cnic: string, excludeId?: string): Entry[] {
  const nameKey = normalizeEntryNameKey(name)
  const cnicKey = normalizeEntryCnicKey(cnic)
  const out: Entry[] = []
  const seen = new Set<string>()
  for (const e of loadEntries()) {
    if (excludeId && e.id === excludeId) continue
    const nameDup = nameKey.length > 0 && normalizeEntryNameKey(e.name) === nameKey
    const cnicDup = cnicKey.length >= 13 && normalizeEntryCnicKey(e.cnic) === cnicKey
    if (!nameDup && !cnicDup) continue
    if (seen.has(e.id)) continue
    seen.add(e.id)
    out.push(e)
  }
  return out
}

async function confirmProceedDespiteDuplicateEntry(matches: Entry[], isEdit: boolean): Promise<boolean> {
  const lines = matches.slice(0, 5).map((e) => {
    const n = (e.name || '—').trim() || '—'
    const c = formatCnicDigits(e.cnic) || '—'
    const t = (e.trackingId || '').trim()
    return t ? `${n} · CNIC ${c} · Tracking ${t}` : `${n} · CNIC ${c}`
  })
  const extra = matches.length > 5 ? `\n…and ${matches.length - 5} more.` : ''
  const tail = isEdit
    ? 'Do you want to save your changes anyway?'
    : 'Do you want to save another entry anyway?'
  return confirmModal({
    title: 'Duplicate entry',
    message: `An entry with the same name or CNIC already exists.\n\n${lines.join('\n')}${extra}\n\n${tail}`,
    confirmText: 'Yes',
    cancelText: 'No',
    initialFocus: 'cancel',
    disableEnterShortcut: true,
  })
}

function makeEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts?: { className?: string; text?: string; attrs?: Record<string, string> },
) {
  const el = document.createElement(tag)
  if (opts?.className) el.className = opts.className
  if (opts?.text) el.textContent = opts.text
  if (opts?.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) el.setAttribute(k, v)
  }
  return el
}

function resetActionDropdownMenu(menu: HTMLElement) {
  menu.classList.remove('is-open')
  menu.style.position = ''
  menu.style.top = ''
  menu.style.left = ''
  menu.style.right = ''
  menu.style.bottom = ''
  menu.style.zIndex = ''
  menu.style.minWidth = ''
}

function closeAllActionDropdownMenus() {
  document.querySelectorAll('.action-dd-menu.is-open').forEach((el) => resetActionDropdownMenu(el as HTMLElement))
  document.querySelectorAll('.action-dd-btn[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'))
}

/** Fixed menu so it is not clipped by .table { overflow: hidden }; flip above if needed. */
function positionActionDropdownFixed(ddBtn: HTMLElement, menu: HTMLElement) {
  const br = ddBtn.getBoundingClientRect()
  menu.style.position = 'fixed'
  menu.style.zIndex = '4000'
  menu.style.right = 'auto'
  menu.style.bottom = 'auto'
  menu.style.minWidth = `${Math.max(188, Math.ceil(ddBtn.offsetWidth * 1.15))}px`
  const mr = menu.getBoundingClientRect()
  let left = br.right - mr.width
  if (left < 10) left = 10
  if (left + mr.width > window.innerWidth - 10) left = Math.max(10, window.innerWidth - mr.width - 10)
  menu.style.left = `${Math.round(left)}px`
  let top = br.bottom + 4
  const h = mr.height || 88
  if (top + h > window.innerHeight - 8) top = Math.max(8, br.top - h - 4)
  menu.style.top = `${Math.round(top)}px`
}

function render() {
  const root = document.querySelector<HTMLDivElement>('#app')
  if (!root) throw new Error('Missing #app')
  root.replaceChildren(makeAppShell())
  void applyMainWindowMaximized()
  void installCloseBackupPrompt()
  queueMicrotask(() => void maybeCheckAppUpdates())
}

function makeAppShell() {
  const shell = makeEl('div', { className: 'shell' })
  const bg = makeEl('div', { className: 'bg' })
  const container = makeEl('main', { className: 'container' })
  const footer = makeEl('footer', { className: 'footer' })
  footer.innerHTML = `<span class="foot-left">ESYSOFT</span><span class="foot-right">${ICON_SHIELD}<span>Secure</span></span>`

  const state: { route: Route } = { route: 'login' }
  const body = makeEl('div', { className: 'body' })

  const setRoute = (route: Route) => {
    state.route = route
    shell.classList.toggle('mode-home', route === 'home')
    shell.classList.toggle('mode-login', route === 'login')
    body.replaceChildren(
      route === 'login'
        ? makeLogin({ onSuccess: () => setRoute('home') })
        : makeHome({ onLogout: () => setRoute('login') }),
    )
    if (route === 'home') queueMicrotask(() => applyTheme())
  }

  setRoute(state.route)

  container.append(body)
  shell.append(bg, container, footer)
  return shell
}

function makeLogin(opts: { onSuccess: () => void }) {
  const scene = makeEl('section', { className: 'login-scene login-scene-with-header' })
  const topbar = makeDeskTopbar()
  const sceneBody = makeEl('div', { className: 'login-scene-body' })
  const card = makeEl('div', { className: 'login-shell' })

  const left = makeEl('aside', { className: 'login-left' })
  left.innerHTML = `
    <div class="login-lock"><img class="brand-logo" src="/logo.png" alt="ESYSOFT" /></div>
    <div class="login-brand">ESYSOFT</div>
    <div class="login-sub">Tracking System</div>
    <div class="login-divider"></div>
    <div class="login-info">
      <div>Hayat & Brothers</div>
      <div>${SHOP_CONTACT_PHONE}</div>
    </div>
    <div class="login-spacer"></div>
    <div class="login-corp">GUL CORPORATION LLC</div>
  `

  const right = makeEl('div', { className: 'login-right' })
  const simpleHero = makeEl('div', { className: 'simple-hero', attrs: { 'aria-hidden': 'true' } })
  simpleHero.innerHTML = `<div class="simple-hero-title">Secure Login</div>`

  const form = makeEl('form', { className: 'pin-form' })
  const hidden = makeEl('input', {
    className: 'pin-hidden',
    attrs: {
      inputmode: 'numeric',
      autocomplete: 'one-time-code',
      'aria-label': 'PIN',
    },
  }) as HTMLInputElement

  const pinRow = makeEl('div', { className: 'pin-row pin-row-simple', attrs: { role: 'group', 'aria-label': 'PIN digits' } })
  const digitBoxes = Array.from({ length: 6 }, () => makeEl('div', { className: 'pin-box' }))
  pinRow.append(...digitBoxes)

  const lockBelow = makeEl('div', { className: 'lock-below', attrs: { 'aria-hidden': 'true' } })
  lockBelow.innerHTML = `${ICON_LOCK}`

  const hint = makeEl('p', { className: 'hint', text: 'Enter 6-digit PIN' })

  const error = makeEl('p', { className: 'error', attrs: { role: 'status', 'aria-live': 'polite' } })
  const status = makeEl('p', { className: 'status', attrs: { role: 'status', 'aria-live': 'polite' } })

  const actions = makeEl('div', { className: 'actions' })
  const btn = makeEl('button', { className: 'unlock', attrs: { type: 'submit' } }) as HTMLButtonElement
  btn.innerHTML = `<span class="unlock-ico" aria-hidden="true">${ICON_LOCK}</span><span class="unlock-lbl">UNLOCK</span>`
  const reset = makeEl('button', { className: 'ghost-mini', text: 'Clear', attrs: { type: 'button' } }) as HTMLButtonElement
  actions.append(btn, reset)

  let unlocked = false
  let pinSubmitBusy = false

  const setButtonState = (pinLen: number) => {
    if (unlocked) {
      btn.disabled = false
      return
    }
    const ready = pinLen === 6
    btn.disabled = !ready
  }

  const setPin = (value: string) => {
    const prevLen = hidden.value.length
    const next = clampDigits(value, 6)
    hidden.value = next
    for (let i = 0; i < digitBoxes.length; i++) {
      digitBoxes[i].textContent = next[i] ? '•' : ''
      digitBoxes[i].classList.toggle('filled', Boolean(next[i]))
      digitBoxes[i].classList.toggle('active', i === Math.min(next.length, 5))
    }
    error.textContent = ''
    status.textContent = ''
    setButtonState(next.length)
    const becameSix = next.length === 6 && prevLen < 6
    if (becameSix && !unlocked) queueMicrotask(() => void validateAndSubmit())
  }

  const shake = () => {
    right.classList.remove('shake')
    // force reflow
    void right.offsetWidth
    right.classList.add('shake')
  }

  const validateAndSubmit = async () => {
    if (unlocked || pinSubmitBusy) return
    const pin = hidden.value
    if (pin.length !== 6) {
      error.textContent = 'PIN must be 6 digits.'
      shake()
      return
    }
    pinSubmitBusy = true
    btn.classList.add('is-busy')
    try {
      if (pin !== loadEffectivePin()) {
        error.textContent = 'Wrong PIN. Try again.'
        shake()
        return
      }
      unlocked = true
      error.textContent = ''
      status.textContent = 'Logging in…'
      right.classList.add('is-unlocked')
      btn.classList.add('is-unlocked')
      setButtonState(6)
      hidden.disabled = true
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1000))
      await applyMainWindowMaximized()
      opts.onSuccess()
    } finally {
      pinSubmitBusy = false
      if (!unlocked) btn.classList.remove('is-busy')
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    void validateAndSubmit()
  })

  hidden.addEventListener('input', () => setPin(hidden.value))
  hidden.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void validateAndSubmit()
  })

  pinRow.addEventListener('click', () => hidden.focus())

  reset.addEventListener('click', () => {
    setPin('')
    hidden.focus()
  })

  // paste support
  form.addEventListener('paste', (e) => {
    const text = e.clipboardData?.getData('text') ?? ''
    if (!text) return
    e.preventDefault()
    setPin(text)
  })

  // auto focus
  queueMicrotask(() => hidden.focus())
  setPin('')

  form.append(hidden, pinRow, lockBelow, hint, error, status, actions)
  const foot = makeEl('div', { className: 'login-foot', text: 'PROTECT ESYSOFT' })
  const ring = makeEl('div', { className: 'ring-login' })
  ring.append(simpleHero, form)
  right.append(ring, foot)
  card.append(left, right)
  sceneBody.append(card)
  scene.append(topbar, sceneBody)
  return scene
}

function formatHeaderDate(d: Date) {
  // Example: Wednesday May 6 2026
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime12h(d: Date) {
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function formatHeaderTime(d: Date) {
  return formatTime12h(d)
}

/** Ledger / statement: date + 12-hour time from ISO sortAt. */
function formatDateTime12hFromSortAt(sortAt: string): string {
  const s = sortAt.trim()
  const dateIso = s.slice(0, 10)
  const d = new Date(s.includes('T') && s.length > 10 ? s : `${dateIso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return formatDateDisplay(dateIso)
  return `${formatDateDisplay(dateIso)} ${formatTime12h(d)}`
}

/** Ek din par bhi har debit/credit ki alag line — unique sortAt. */
function nextLedgerSortAtForDay(daySeqMap: Map<string, number>, entryDate: string): string {
  const day = entryDate.trim().slice(0, 10)
  const n = (daySeqMap.get(day) ?? 0) + 1
  daySeqMap.set(day, n)
  const hh = 8 + Math.floor((n - 1) / 60) % 14
  const mm = (n - 1) % 60
  const ss = Math.min(59, (n * 3) % 60)
  return `${day}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

type NavId =
  | 'new-entry'
  | 'weapon'
  | 'general'
  | 'expense'
  | 'dues'
  | 'search'
  | 'recycle'
  | 'report'
  | 'settings'

function buildSidebar(active: NavId | null, opts?: { onActiveNav?: (nav: NavId | null) => void }) {
  const sidebar = makeEl('aside', { className: 'nav' })
  sidebar.innerHTML = `
    <div class="nav-brand">
      <div class="nav-brand-line" aria-hidden="true"></div>
      <div class="nav-brand-sub">SLIDE BAR</div>
    </div>
    <div class="nav-stats" aria-label="Dashboard status summary"></div>
  `

  const setActiveClasses = (next: NavId | null) => {
    sidebar.querySelectorAll<HTMLButtonElement>('button[data-nav]').forEach((btn) => {
      const bid = btn.getAttribute('data-nav') as NavId | null
      if (!bid) return
      btn.classList.toggle('is-active', next === bid)
      btn.classList.toggle('is-dim', next !== null && next !== bid)
    })
    opts?.onActiveNav?.(next)
  }
  setActiveClasses(active)

  return { el: sidebar, setActive: setActiveClasses }
}

function makeDeskTopbar(opts?: { onLogout?: () => void }) {
  const topbar = makeEl('header', { className: 'topbar topbar-dark' })
  topbar.innerHTML = `
    <div class="top-left">
      <div class="brand-wrap">
        <div class="brand-mini">ESYSoft</div>
        <span class="brand-mini-ver">v${ESYSOFT_APP_VERSION}</span>
      </div>
    </div>
    <div class="top-center">
      <div class="brand-center">Hayat & Brothers</div>
      <div class="sub-center">Application Tracking System</div>
    </div>
    <div class="top-right">
      <div class="top-actions">
        <div class="dt"><span class="dt-date"></span><span class="dt-sep">•</span><span class="dt-time"></span></div>
        ${opts?.onLogout ? `<button type="button" class="top-logout" aria-label="Log out">${ICON_LOGOUT}</button>` : ``}
      </div>
    </div>
  `
  const dateEl = topbar.querySelector<HTMLSpanElement>('.dt-date')
  const timeEl = topbar.querySelector<HTMLSpanElement>('.dt-time')
  const updateDT = () => {
    const now = new Date()
    if (dateEl) dateEl.textContent = formatHeaderDate(now)
    if (timeEl) timeEl.textContent = formatHeaderTime(now)
  }
  updateDT()
  const timer = window.setInterval(updateDT, 1000)
  topbar.addEventListener(
    'DOMNodeRemoved',
    () => {
      window.clearInterval(timer)
    },
    { once: true },
  )
  topbar.querySelector<HTMLButtonElement>('.top-logout')?.addEventListener('click', () => opts?.onLogout?.())
  return topbar
}

function makeHome(opts: { onLogout: () => void }) {
  const app = makeEl('section', { className: 'desk dark' })

  const topbar = makeDeskTopbar({ onLogout: opts.onLogout })

  const content = makeEl('div', { className: 'desk-content desk-dark' })

  const PANEL_RAIL: Partial<Record<NavId, string>> = {
    'new-entry': 'rgba(59, 130, 246, 0.82)',
    weapon: 'rgba(34, 197, 94, 0.82)',
    expense: 'rgba(245, 158, 11, 0.82)',
    dues: 'rgba(249, 115, 22, 0.82)',
    search: 'rgba(34, 211, 238, 0.82)',
    recycle: 'rgba(248, 113, 113, 0.82)',
    report: 'rgba(167, 139, 250, 0.82)',
    settings: 'rgba(148, 163, 184, 0.88)',
  }

  const sidebar = buildSidebar(null, {
    onActiveNav: (nav) => {
      if (nav == null) {
        content.removeAttribute('data-panel')
        content.style.removeProperty('--nav-rail')
        return
      }
      content.setAttribute('data-panel', nav)
      const c = PANEL_RAIL[nav]
      if (c) content.style.setProperty('--nav-rail', c)
      else content.style.removeProperty('--nav-rail')
    },
  })

  const main = makeEl('main', { className: 'workspace' })
  const welcomeView = makeEl('section', { className: 'welcome-view is-hidden' })
  welcomeView.innerHTML = `
    <div class="welcome-inner">
      <div class="welcome-stars">✦ Hayat & Brothers ✦</div>
      <div class="welcome-title">WELCOME TO Application Tracking System</div>
      <div class="welcome-divider"></div>
      <div class="welcome-by">SOFTWARE BY <span class="welcome-esy">EsySoft</span></div>
      <div class="welcome-card">
        <div class="welcome-card-h">Contact Us</div>
        <div class="welcome-card-n">Irfan Ullah</div>
        <div class="welcome-card-p">${SHOP_CONTACT_PHONE}</div>
      </div>
      <p class="welcome-esc-hint">Press ESC to go back.</p>
    </div>
    <footer class="welcome-foot">
      <span class="welcome-ver">${ESYSOFT_VERSION_LABEL}</span>
      <span class="welcome-keys">ESC×2 — Home | ESC — Back</span>
    </footer>
  `
  const dashView = makeEl('div', { className: 'dash-view' })
  const entryView = makeEl('div', { className: 'entry-view is-hidden' })
  const homeMenuView = makeEl('section', { className: 'home-tiles-view is-hidden' })
  homeMenuView.innerHTML = `
    <div class="home-tiles-card">
    <div class="home-title">
      <div class="home-kicker">Application Tracking Panel</div>
      <div class="home-name">EsySoft Dashboard</div>
    </div>
    <div class="home-tiles-grid" role="navigation" aria-label="Main dashboard actions">
      <button type="button" class="tile tone-dash-1" data-home-act="new-entry">
        <div class="tile-ico">${DASH_ICO_PLUS}</div>
        <div class="tile-label">New Entry</div>
      </button>
      <button type="button" class="tile tone-dash-2" data-home-act="general">
        <div class="tile-ico">${DASH_ICO_FILE}</div>
        <div class="tile-label">Genral Entry</div>
      </button>
      <button type="button" class="tile tone-dash-3" data-home-act="weapon">
        <div class="tile-ico">${DASH_ICO_TAG}</div>
        <div class="tile-label">Wepon Number Alot</div>
      </button>
      <button type="button" class="tile tone-dash-4" data-home-act="expense">
        <div class="tile-ico">${DASH_ICO_RECEIPT}</div>
        <div class="tile-label">Expence</div>
      </button>
      <button type="button" class="tile tone-dash-5" data-home-act="dues">
        <div class="tile-ico">${DASH_ICO_COINS}</div>
        <div class="tile-label">Dues</div>
      </button>
      <button type="button" class="tile tone-dash-6" data-home-act="search">
        <div class="tile-ico">${DASH_ICO_SEARCH}</div>
        <div class="tile-label">Serch</div>
      </button>
      <button type="button" class="tile tone-dash-7" data-home-act="search-police">
        <div class="tile-ico">${DASH_ICO_MAP_PIN}</div>
        <div class="tile-label">Search by Police Station</div>
      </button>
      <button type="button" class="tile tone-dash-8" data-home-act="recycle">
        <div class="tile-ico">${DASH_ICO_TRASH}</div>
        <div class="tile-label">Recyle Bin</div>
      </button>
      <button type="button" class="tile tone-dash-9" data-home-act="report">
        <div class="tile-ico">${DASH_ICO_CHART}</div>
        <div class="tile-label">Reports</div>
      </button>
      <button type="button" class="tile tone-dash-10" data-home-act="settings">
        <div class="tile-ico">${DASH_ICO_SETTINGS}</div>
        <div class="tile-label">Settings</div>
      </button>
    </div>
    </div>
  `

  type Filter = 'all' | 'completed' | 'showAll'
  let filter: Filter = 'all'
  let dashSearchQuery = ''

  const stats = makeEl('div', { className: 'stats stats-side' })
  let didStatsIntro = false
  stats.innerHTML = `
    <div class="stats-section stats-reminder" data-sec="reminder">
      <div class="stat-group-title stat-anim" style="--i:0">Reminder Activity</div>
      <div class="stat stat-anim" style="--i:0">
        <div class="stat-h">Active</div><div class="stat-n" data-k="active">0</div>
      </div>
      <div class="stat stat-anim" style="--i:1">
        <div class="stat-h">Urgent</div><div class="stat-n" data-k="urgent">0</div>
      </div>
      <div class="stat stat-anim" style="--i:2">
        <div class="stat-h">Normal</div><div class="stat-n" data-k="normal">0</div>
      </div>
      <div class="stat stat-anim" style="--i:3">
        <div class="stat-h">Other</div><div class="stat-n" data-k="other">0</div>
      </div>
      <div class="stat stat-warn stat-anim" style="--i:4">
        <div class="stat-h">Warning</div><div class="stat-n" data-k="warning">0</div>
        <div class="stat-warn-caption">Urgent / Other · up to 7 days left (same as startup reminder)</div>
      </div>
      <div class="stat stat-anim" style="--i:5">
        <div class="stat-h">Complete</div><div class="stat-n" data-k="complete">0</div>
      </div>
    </div>

    <div class="stats-section stats-urgent is-hidden" data-sec="urgentSlide" aria-hidden="true">
      <div class="stat-group-title stat-anim" style="--j:0">Urgent Reminders</div>
      <div class="stat stat-anim stat-mini" style="--j:1"><div class="stat-h">Records</div><div class="stat-n" data-k="urgCount">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:2"><div class="stat-h">Next due</div><div class="stat-n" data-k="urgNext">—</div></div>
      <div class="stat stat-anim stat-mini stat-textval" style="--j:3"><div class="stat-h">1</div><div class="stat-n" data-k="urgRow1">—</div></div>
      <div class="stat stat-anim stat-mini stat-textval" style="--j:4"><div class="stat-h">2</div><div class="stat-n" data-k="urgRow2">—</div></div>
      <div class="stat stat-anim stat-mini stat-textval" style="--j:5"><div class="stat-h">3</div><div class="stat-n" data-k="urgRow3">—</div></div>
    </div>

    <div class="stats-section stats-other is-hidden" data-sec="otherSlide" aria-hidden="true">
      <div class="stat-group-title stat-anim" style="--j:0">Other Reminders</div>
      <div class="stat stat-anim stat-mini" style="--j:1"><div class="stat-h">Records</div><div class="stat-n" data-k="othCount">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:2"><div class="stat-h">Next due</div><div class="stat-n" data-k="othNext">—</div></div>
      <div class="stat stat-anim stat-mini stat-textval" style="--j:3"><div class="stat-h">1</div><div class="stat-n" data-k="othRow1">—</div></div>
      <div class="stat stat-anim stat-mini stat-textval" style="--j:4"><div class="stat-h">2</div><div class="stat-n" data-k="othRow2">—</div></div>
      <div class="stat stat-anim stat-mini stat-textval" style="--j:5"><div class="stat-h">3</div><div class="stat-n" data-k="othRow3">—</div></div>
    </div>

    <div class="stats-section stats-app-daily is-hidden" data-sec="appDaily" aria-hidden="true">
      <div class="stat-group-title stat-anim" style="--j:0">Application Daily Report</div>
      <div class="stat stat-anim stat-mini" style="--j:1"><div class="stat-h">Total Sale</div><div class="stat-n" data-k="dsale">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:2"><div class="stat-h">Total Cost</div><div class="stat-n" data-k="dcost">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:3"><div class="stat-h">Total Dues</div><div class="stat-n" data-k="ddues">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:4"><div class="stat-h">Total Expense</div><div class="stat-n" data-k="dexp">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:5"><div class="stat-h">Total Profit</div><div class="stat-n" data-k="dnet">0</div></div>
    </div>

    <div class="stats-section stats-weapon-daily is-hidden" data-sec="weaponDaily" aria-hidden="true">
      <div class="stat-group-title stat-anim" style="--j:0">Weapon Allot Daily Report</div>
      <div class="stat stat-anim stat-mini" style="--j:1"><div class="stat-h">Total Sale</div><div class="stat-n" data-k="wsale">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:2"><div class="stat-h">Total Cost</div><div class="stat-n" data-k="wcost">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:3"><div class="stat-h">Total Dues</div><div class="stat-n" data-k="wdues">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:4"><div class="stat-h">Total Profit</div><div class="stat-n" data-k="wprofit">0</div></div>
    </div>

    <div class="stats-section stats-expense-daily is-hidden" data-sec="expenseDaily" aria-hidden="true">
      <div class="stat-group-title stat-anim" style="--j:0">Daily Expense Report</div>
      <div class="stat stat-anim stat-mini" style="--j:1"><div class="stat-h">Total Expense</div><div class="stat-n" data-k="exptotal">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:2"><div class="stat-h">Entries</div><div class="stat-n" data-k="expcount">0</div></div>
    </div>

    <div class="stats-section stats-dues is-hidden" data-sec="dues" aria-hidden="true">
      <div class="stat-group-title stat-anim" style="--j:0">Pending Dues Report</div>
      <div class="stat stat-anim stat-mini" style="--j:1"><div class="stat-h">Total Pending</div><div class="stat-n" data-k="pdues">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:2"><div class="stat-h">App Pending</div><div class="stat-n" data-k="papp">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:3"><div class="stat-h">Weapon Pending</div><div class="stat-n" data-k="pwep">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:4"><div class="stat-h">General Pending</div><div class="stat-n" data-k="pgen">0</div></div>
      <div class="stat stat-anim stat-mini" style="--j:5"><div class="stat-h">Records</div><div class="stat-n" data-k="pcount">0</div></div>
    </div>
  `

  const refreshStats = () => {
    const entries = loadEntries()
    const todayIso = isoToday()
    const active = entries.filter((e) => !e.manuallyCompleted).length
    const urgent = entries.filter((e) => !e.manuallyCompleted && e.urgency === 'urgent').length
    const normal = entries.filter((e) => !e.manuallyCompleted && e.urgency === 'normal').length
    const other = entries.filter((e) => !e.manuallyCompleted && e.urgency === 'other').length
    const warning = entries.filter((e) => entryCountsForDashboardWarning(e)).length
    const complete = entries.filter((e) => e.manuallyCompleted).length
    const formatNameDays = (name: string, days: number) => `${name || '—'} · ${days}d`
    const buildTop = (kind: 'urgent' | 'other') => {
      const out: { name: string; days: number }[] = []
      for (const e of entries) {
        if (e.manuallyCompleted) continue
        if (e.urgency !== kind) continue
        const w = kind === 'urgent' ? e.urgentDays : e.otherReminderDays
        const r = reminderWindowRemaining(e.entryDate, w)
        if (r == null) continue
        out.push({ name: (e.name || '').trim(), days: r })
      }
      out.sort((a, b) => a.days - b.days || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      return out
    }
    const urgList = buildTop('urgent')
    const othList = buildTop('other')

    let dailySale = 0
    let dailyCost = 0
    let dailyProfit = 0
    let dailyDues = 0
    for (const e of entries) {
      if (e.entryDate !== todayIso) continue
      dailySale += e.salePrice ?? 0
      dailyCost += e.costPrice ?? 0
      dailyProfit += entryLineProfit(e)
      dailyDues += entryLineDues(e)
    }
    const dailyExpense = loadExpenses()
      .filter((x) => x.entryDate === todayIso)
      .reduce((a, r) => a + r.amount, 0)
    const dailyExpenseCount = loadExpenses().filter((x) => x.entryDate === todayIso).length

    const dailyWeaponLines = loadWeaponAllotLines().filter((l) => (l.entryDate || '') === todayIso)
    let weaponSale = 0
    let weaponCost = 0
    let weaponProfit = 0
    let weaponDues = 0
    for (const l of dailyWeaponLines) {
      weaponSale += l.salePrice ?? 0
      weaponCost += l.costPrice ?? 0
      weaponProfit += lineProfit(l)
      weaponDues += lineDues(l)
    }

    const allEntries = entries
    const appPendingDues = allEntries.reduce((s, e) => {
      const d = entryLineDues(e)
      return d > 0 ? s + d : s
    }, 0)
    const weaponPendingDues = loadWeaponAllotLines().reduce((s, l) => {
      const d = lineDues(l)
      return d > 0 ? s + d : s
    }, 0)
    const generalPendingDues = loadGeneralEntries().reduce((s, r) => s + generalDuesRemaining(r), 0)
    const pendingCount =
      allEntries.filter((e) => entryLineDues(e) > 0).length +
      loadWeaponAllotLines().filter((l) => lineDues(l) > 0).length +
      loadGeneralEntries().filter((r) => generalDuesRemaining(r) > 0).length
    const totalPending = appPendingDues + weaponPendingDues + generalPendingDues

    const setTxt = (k: string, v: string) => {
      const el = stats.querySelector<HTMLElement>(`[data-k="${k}"]`)
      if (el) el.textContent = v
    }
    setTxt('active', String(active))
    setTxt('urgent', String(urgent))
    setTxt('normal', String(normal))
    setTxt('other', String(other))
    setTxt('warning', String(warning))
    setTxt('complete', String(complete))

    setTxt('urgCount', String(urgList.length))
    setTxt('urgNext', urgList[0] ? `${urgList[0].days} day(s)` : '—')
    setTxt('urgRow1', urgList[0] ? formatNameDays(urgList[0].name, urgList[0].days) : '—')
    setTxt('urgRow2', urgList[1] ? formatNameDays(urgList[1].name, urgList[1].days) : '—')
    setTxt('urgRow3', urgList[2] ? formatNameDays(urgList[2].name, urgList[2].days) : '—')

    setTxt('othCount', String(othList.length))
    setTxt('othNext', othList[0] ? `${othList[0].days} day(s)` : '—')
    setTxt('othRow1', othList[0] ? formatNameDays(othList[0].name, othList[0].days) : '—')
    setTxt('othRow2', othList[1] ? formatNameDays(othList[1].name, othList[1].days) : '—')
    setTxt('othRow3', othList[2] ? formatNameDays(othList[2].name, othList[2].days) : '—')
    setTxt('dsale', formatRs(dailySale))
    setTxt('dcost', formatRs(dailyCost))
    setTxt('ddues', formatRs(dailyDues))
    setTxt('dexp', formatRs(dailyExpense))
    setTxt('dnet', formatRs(dailyProfit - dailyExpense))
    setTxt('wsale', formatRs(weaponSale))
    setTxt('wcost', formatRs(weaponCost))
    setTxt('wdues', formatRs(weaponDues))
    setTxt('wprofit', formatRs(weaponProfit))
    setTxt('exptotal', formatRs(dailyExpense))
    setTxt('expcount', String(dailyExpenseCount))
    setTxt('pdues', formatRs(totalPending))
    setTxt('papp', formatRs(appPendingDues))
    setTxt('pwep', formatRs(weaponPendingDues))
    setTxt('pgen', formatRs(generalPendingDues))
    setTxt('pcount', String(pendingCount))

    if (!didStatsIntro) {
      didStatsIntro = true
      const reminder = stats.querySelector<HTMLElement>('[data-sec="reminder"]')
      const urgentSlide = stats.querySelector<HTMLElement>('[data-sec="urgentSlide"]')
      const otherSlide = stats.querySelector<HTMLElement>('[data-sec="otherSlide"]')
      const appDaily = stats.querySelector<HTMLElement>('[data-sec="appDaily"]')
      const weaponDaily = stats.querySelector<HTMLElement>('[data-sec="weaponDaily"]')
      const expenseDaily = stats.querySelector<HTMLElement>('[data-sec="expenseDaily"]')
      const dues = stats.querySelector<HTMLElement>('[data-sec="dues"]')

      const timers: number[] = []
      const clearTimers = () => {
        while (timers.length) window.clearTimeout(timers.pop())
      }
      const refreshers: number[] = []
      const clearRefreshers = () => {
        while (refreshers.length) window.clearInterval(refreshers.pop())
      }
      stats.addEventListener(
        'DOMNodeRemoved',
        () => {
          clearTimers()
          clearRefreshers()
        },
        { once: true },
      )

      const GAP = 1500
      const DUR = 1800
      const LAST_I = 5
      const lastAnimMs = LAST_I * GAP + DUR
      const AFTER_GAP_MS = 2000

      const hideAll = () => {
        for (const sec of [reminder, urgentSlide, otherSlide, appDaily, weaponDaily, expenseDaily, dues]) {
          if (!sec) continue
          sec.classList.add('is-hidden')
          sec.setAttribute('aria-hidden', 'true')
          sec.classList.remove(
            'rem-intro',
            'urgent-intro',
            'other-intro',
            'app-intro',
            'weapon-intro',
            'expense-intro',
            'dues-intro',
          )
        }
      }

      const showReminder = () => {
        refreshStats()
        hideAll()
        if (!reminder) return
        reminder.classList.remove('is-hidden')
        reminder.removeAttribute('aria-hidden')
        reminder.classList.add('rem-intro')
        timers.push(
          window.setTimeout(() => reminder.classList.remove('rem-intro'), lastAnimMs + 400),
        )
        timers.push(window.setTimeout(showUrgentSlide, lastAnimMs + AFTER_GAP_MS))
      }

      const showUrgentSlide = () => {
        refreshStats()
        hideAll()
        if (!urgentSlide) return
        urgentSlide.classList.remove('is-hidden')
        urgentSlide.removeAttribute('aria-hidden')
        urgentSlide.classList.add('urgent-intro')
        timers.push(window.setTimeout(() => urgentSlide.classList.remove('urgent-intro'), lastAnimMs + 400))
        timers.push(window.setTimeout(showOtherSlide, lastAnimMs + AFTER_GAP_MS))
      }

      const showOtherSlide = () => {
        refreshStats()
        hideAll()
        if (!otherSlide) return
        otherSlide.classList.remove('is-hidden')
        otherSlide.removeAttribute('aria-hidden')
        otherSlide.classList.add('other-intro')
        timers.push(window.setTimeout(() => otherSlide.classList.remove('other-intro'), lastAnimMs + 400))
        timers.push(window.setTimeout(showAppDaily, lastAnimMs + AFTER_GAP_MS))
      }

      const showAppDaily = () => {
        refreshStats()
        hideAll()
        if (!appDaily) return
        appDaily.classList.remove('is-hidden')
        appDaily.removeAttribute('aria-hidden')
        appDaily.classList.add('app-intro')
        timers.push(
          window.setTimeout(() => appDaily.classList.remove('app-intro'), lastAnimMs + 400),
        )
        timers.push(window.setTimeout(showWeaponDaily, lastAnimMs + AFTER_GAP_MS))
      }

      const showWeaponDaily = () => {
        refreshStats()
        hideAll()
        if (!weaponDaily) return
        weaponDaily.classList.remove('is-hidden')
        weaponDaily.removeAttribute('aria-hidden')
        weaponDaily.classList.add('weapon-intro')
        timers.push(
          window.setTimeout(() => weaponDaily.classList.remove('weapon-intro'), lastAnimMs + 400),
        )
        timers.push(window.setTimeout(showExpenseDaily, lastAnimMs + AFTER_GAP_MS))
      }

      const showExpenseDaily = () => {
        refreshStats()
        hideAll()
        if (!expenseDaily) return
        expenseDaily.classList.remove('is-hidden')
        expenseDaily.removeAttribute('aria-hidden')
        expenseDaily.classList.add('expense-intro')
        timers.push(
          window.setTimeout(() => expenseDaily.classList.remove('expense-intro'), lastAnimMs + 400),
        )
        timers.push(window.setTimeout(showDues, lastAnimMs + AFTER_GAP_MS))
      }

      const showDues = () => {
        refreshStats()
        hideAll()
        if (!dues) return
        dues.classList.remove('is-hidden')
        dues.removeAttribute('aria-hidden')
        dues.classList.add('dues-intro')
        timers.push(window.setTimeout(() => dues.classList.remove('dues-intro'), lastAnimMs + 400))
        timers.push(window.setTimeout(showReminder, lastAnimMs + AFTER_GAP_MS))
      }

      // Keep values fresh while software stays ON (no need to off/on).
      refreshers.push(window.setInterval(() => refreshStats(), 2000))

      showReminder()
    }
  }
  refreshStats()
  sidebar.el.querySelector('.nav-stats')?.append(stats)

  const toolbar = makeEl('div', { className: 'toolbar' })
  toolbar.innerHTML = `
    <div class="toolbar-inner">
      <div class="tool-cluster">
        <div class="tool-left">
          <button class="tool-btn active" data-filter="all" type="button">All</button>
          <button class="tool-btn" data-filter="completed" type="button">Completed</button>
        </div>
        <div class="dash-daily-stats" aria-live="polite"></div>
        <input type="search" class="dash-search" placeholder="Search…" autocomplete="off" spellcheck="false" aria-label="Search entries" />
      </div>
      <div class="tool-right">
        <label class="tool-check"><input type="checkbox" data-filter="showAll" /> <span>Show All Records</span></label>
      </div>
    </div>
  `

  const table = makeEl('div', { className: 'table' })
  table.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th><th>Date</th><th>Name</th><th>CNIC</th><th>Reference</th><th>Entry</th><th>Category</th><th>Status</th><th>Action</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `

  const tableScroll = makeEl('div', {
    className: 'dash-table-scroll',
    attrs: { 'aria-label': 'Application entries list' },
  })
  tableScroll.append(table)

  /** 5.8in at CSS reference density (96px/in) — inline px so Tauri WebView2 respects treeview height. */
  const DASH_TREE_SCROLL_HEIGHT_PX = Math.round(5.8 * 96)
  const syncDashTableScrollHeight = () => {
    const reserve = 260
    const cap = Math.max(220, Math.min(DASH_TREE_SCROLL_HEIGHT_PX, window.innerHeight - reserve))
    tableScroll.style.height = `${cap}px`
    tableScroll.style.maxHeight = `${cap}px`
  }
  window.addEventListener('resize', syncDashTableScrollHeight)
  queueMicrotask(syncDashTableScrollHeight)

  const tbody = table.querySelector<HTMLTableSectionElement>('tbody')

  const showEntryEdit = (entry: Entry) => {
    sidebar.setActive('new-entry')
    welcomeView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeNewEntry({ onBack: showDashboard, initial: entry }))
  }

  const showEntryNewUnder = (ins: NewEntryInsertOpts) => {
    sidebar.setActive('new-entry')
    welcomeView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeNewEntry({ onBack: showDashboard, draft: ins.draft, insertAfterId: ins.insertAfterId }))
  }

  const dailyStatsEl = toolbar.querySelector('.dash-daily-stats')
  const refreshDashDailyLine = () => {
    const todayIso = isoToday()
    let saleSum = 0
    let costSum = 0
    let profitSum = 0
    let duesSum = 0
    for (const e of loadEntries()) {
      if (e.entryDate !== todayIso) continue
      saleSum += e.salePrice ?? 0
      costSum += e.costPrice ?? 0
      profitSum += entryLineProfit(e)
      duesSum += entryLineDues(e)
    }
    const dl = formatDateDisplay(todayIso)
    if (dailyStatsEl) {
      dailyStatsEl.innerHTML = `<span class="dash-d-label">Daily (${dl}):</span> Total Sale <b>${formatRs(saleSum)}</b><span class="dash-d-dot">·</span>Total Cost <b>${formatRs(
        costSum,
      )}</b><span class="dash-d-dot">·</span>Total Profit <b>${formatRs(profitSum)}</b><span class="dash-d-dot">·</span>Total Dues <b>${formatRs(duesSum)}</b>`
    }
  }

  const renderRows = () => {
    refreshStats()
    refreshDashDailyLine()
    // Storage order (oldest → newest) so new saves append at bottom.
    const all = loadEntries().slice()
    const filtered = filter === 'completed' ? all.filter((e) => e.manuallyCompleted) : all
    const take = filter === 'showAll' ? filtered : filtered.slice(0, 200)
    const searchActive = dashSearchQuery.trim().length > 0
    const searched = searchActive ? take.filter((e) => entryMatchesQuery(e, dashSearchQuery)) : take
    const buckets = dashboardReferenceBuckets(take, searched, searchActive)
    const html = buckets
      .map((bucket, idx) => {
        // Show the most recent entry in the group, but keep group's position stable.
        const rep = bucket[bucket.length - 1] ?? bucket[0]
        const n = bucket.length
        const status = entryStatusLabel(rep)
        const referenceCell =
          n === 1
            ? (rep.reference || '-').replaceAll('<', '&lt;')
            : `${(rep.reference || '').trim() || '—'} (+${n - 1})`.replaceAll('<', '&lt;')
        return `
          <tr data-entry-id="${rep.id}">
            <td>${idx + 1}</td>
            <td>${(rep.entryDate || '-').replaceAll('<', '&lt;')}</td>
            <td>${(rep.name || '-').replaceAll('<', '&lt;')}</td>
            <td>${(rep.cnic || '-').replaceAll('<', '&lt;')}</td>
            <td>${referenceCell}</td>
            <td>${n}</td>
            <td>${(rep.category || '-').replaceAll('<', '&lt;')}</td>
            <td><span class="pill ${status.toLowerCase()}">${status}</span></td>
            ${entryActionCellHtml(rep, { showRecycle: true, mode: 'viewOnly' })}
          </tr>
        `
      })
      .join('')
    if (tbody) tbody.innerHTML = html || `<tr><td colspan="9" class="empty">No records yet.</td></tr>`
  }
  renderRows()

  document.addEventListener(
    'click',
    () => {
      closeAllActionDropdownMenus()
    },
    true,
  )

  table.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement
    const ddBtn = t.closest('.action-dd-btn')
    if (ddBtn) {
      e.stopPropagation()
      const wrap = ddBtn.closest('.action-dd')
      const menu = wrap?.querySelector('.action-dd-menu') as HTMLElement | null
      if (!menu) return
      const opening = !menu.classList.contains('is-open')
      closeAllActionDropdownMenus()
      if (opening) {
        const tr = ddBtn.closest('tr[data-entry-id]')
        tr?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        requestAnimationFrame(() => {
          menu.classList.add('is-open')
          ddBtn.setAttribute('aria-expanded', 'true')
          positionActionDropdownFixed(ddBtn as HTMLElement, menu)
          requestAnimationFrame(() => positionActionDropdownFixed(ddBtn as HTMLElement, menu))
        })
      } else {
        resetActionDropdownMenu(menu)
        ddBtn.setAttribute('aria-expanded', 'false')
      }
      return
    }
    const actBtn = t.closest<HTMLButtonElement>('button[data-act]')
    if (!actBtn) return
    const tr = actBtn.closest('tr[data-entry-id]')
    const id = tr?.getAttribute('data-entry-id')
    if (!id) return
    const entry = loadEntries().find((x) => x.id === id)
    if (!entry) return
    const act = actBtn.getAttribute('data-act')
    if (act === 'view') {
      openEntryViewDetailModal(entry, { onEdit: showEntryEdit, onNewEntry: showEntryNewUnder, onChanged: renderRows })
    } else if (act === 'edit') {
      showEntryEdit(entry)
    } else if (act === 'complete') {
      const duesNow = entryLineDues(entry)
      let cmsg = 'Mark this entry as Completed?'
      if (duesNow > 0) {
        cmsg +=
          '\n\nThis record still has outstanding dues. It will stay in Pending Dues until the amount is fully collected.'
      }
      if (
        !(await confirmModal({
          title: 'Complete entry',
          message: cmsg,
          confirmText: 'Complete',
          cancelText: 'Cancel',
        }))
      )
        return
      patchEntryById(id, { manuallyCompleted: true })
      renderRows()
    } else if (act === 'print-bill') {
      printClientBill(entry)
    } else if (act === 'print-detail') {
      printClientDetail(entry)
    } else if (act === 'recycle') {
      if (
        !(await confirmModal({
          title: 'Move to Recycle Bin',
          message:
            'Move this record to the Recycle Bin?\n\nIt will be removed from the main list until you restore it or delete it permanently from the bin.',
          confirmText: 'Move',
          cancelText: 'Cancel',
          variant: 'danger',
        }))
      )
        return
      moveEntryToRecycle(id)
      renderRows()
    }
  })

  toolbar.querySelectorAll<HTMLButtonElement>('button[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      toolbar.querySelectorAll<HTMLButtonElement>('button[data-filter]').forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')
      filter = (btn.getAttribute('data-filter') as Filter) || 'all'
      renderRows()
    })
  })
  const showAll = toolbar.querySelector<HTMLInputElement>('input[type="checkbox"][data-filter="showAll"]')
  showAll?.addEventListener('change', () => {
    filter = showAll.checked ? 'showAll' : 'all'
    const allBtn = toolbar.querySelector<HTMLButtonElement>('button[data-filter="all"]')
    toolbar.querySelectorAll<HTMLButtonElement>('button[data-filter]').forEach((b) => b.classList.remove('active'))
    allBtn?.classList.add('active')
    renderRows()
  })

  const dashSearchEl = toolbar.querySelector<HTMLInputElement>('.dash-search')
  dashSearchEl?.addEventListener('input', () => {
    dashSearchQuery = dashSearchEl.value
    renderRows()
  })

  const dashMain = makeEl('div', { className: 'dash-main' })
  dashMain.append(toolbar, tableScroll)
  dashView.append(dashMain)
  main.append(welcomeView, dashView, entryView, homeMenuView)
  content.append(sidebar.el, main)
  app.append(topbar, content)

  const showWelcome = () => {
    sidebar.setActive(null)
    welcomeView.classList.remove('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.add('is-hidden')
    entryView.replaceChildren()
    homeMenuView.classList.add('is-hidden')
  }

  const showHomeMenu = () => {
    sidebar.setActive(null)
    welcomeView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.add('is-hidden')
    entryView.replaceChildren()
    homeMenuView.classList.remove('is-hidden')
  }

  const showDashboard = () => {
    sidebar.setActive(null)
    welcomeView.classList.add('is-hidden')
    homeMenuView.classList.add('is-hidden')
    dashView.classList.remove('is-hidden')
    entryView.classList.add('is-hidden')
    entryView.replaceChildren()
    renderRows()
    queueMicrotask(syncDashTableScrollHeight)
  }

  const showEntry = () => {
    sidebar.setActive('new-entry')
    welcomeView.classList.add('is-hidden')
    homeMenuView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeNewEntry({ onBack: showHomeMenu }))
  }
  const showWeaponAllot = () => {
    sidebar.setActive('weapon')
    welcomeView.classList.add('is-hidden')
    homeMenuView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeWeaponAllotScreen({ onBack: showHomeMenu }))
  }

  const showGeneral = () => {
    sidebar.setActive('general')
    welcomeView.classList.add('is-hidden')
    homeMenuView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeGeneralEntryScreen({ onBack: showHomeMenu }))
  }

  const showExpense = () => {
    sidebar.setActive('expense')
    welcomeView.classList.add('is-hidden')
    homeMenuView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeExpenseScreen({ onBack: showHomeMenu }))
  }

  const showDues = () => {
    sidebar.setActive('dues')
    welcomeView.classList.add('is-hidden')
    homeMenuView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeDuesScreen({ onBack: showHomeMenu }))
  }

  const showSearch = () => {
    sidebar.setActive('search')
    welcomeView.classList.add('is-hidden')
    homeMenuView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    const renderSearch = () => {
      entryView.replaceChildren(
        makeSearchScreen({
          onBack: showHomeMenu,
          onEdit: (entry) => {
            entryView.replaceChildren(makeNewEntry({ onBack: renderSearch, initial: entry }))
          },
        }),
      )
    }
    renderSearch()
  }

  const showPoliceStationSearch = () => {
    sidebar.setActive('search')
    welcomeView.classList.add('is-hidden')
    homeMenuView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    const render = () => {
      entryView.replaceChildren(
        makePoliceStationSearchScreen({
          onBack: showHomeMenu,
          onEdit: (entry) => {
            entryView.replaceChildren(makeNewEntry({ onBack: render, initial: entry }))
          },
        }),
      )
    }
    render()
  }

  const showRecycle = () => {
    sidebar.setActive('recycle')
    welcomeView.classList.add('is-hidden')
    homeMenuView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    const renderRecycle = () => {
      entryView.replaceChildren(makeRecycleScreen({ onBack: showHomeMenu, onChanged: renderRecycle }))
    }
    renderRecycle()
  }

  const showReports = () => {
    sidebar.setActive('report')
    welcomeView.classList.add('is-hidden')
    homeMenuView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    const renderReports = () => {
      entryView.replaceChildren(
        makeReportsScreen({
          onBack: showHomeMenu,
          onEdit: (entry) => {
            entryView.replaceChildren(makeNewEntry({ onBack: renderReports, initial: entry }))
          },
        }),
      )
    }
    renderReports()
  }

  const showSettings = () => {
    sidebar.setActive('settings')
    welcomeView.classList.add('is-hidden')
    homeMenuView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeSettingsScreen({ onBack: showHomeMenu }))
  }

  homeMenuView.querySelectorAll<HTMLButtonElement>('button[data-home-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-home-act')
      if (!act) return
      if (act === 'new-entry') return showEntry()
      if (act === 'general') return showGeneral()
      if (act === 'weapon') return showWeaponAllot()
      if (act === 'expense') return showExpense()
      if (act === 'dues') return showDues()
      if (act === 'search') return showSearch()
      if (act === 'search-police') return showPoliceStationSearch()
      if (act === 'recycle') return showRecycle()
      if (act === 'report') return showReports()
      if (act === 'settings') return showSettings()
    })
  })

  sidebar.el.querySelectorAll<HTMLButtonElement>('button[data-nav]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-nav')
      if (!id) return
      const nav = id as NavId
      if (nav === 'new-entry') {
        showEntry()
        return
      }
      if (nav === 'weapon') {
        showWeaponAllot()
        return
      }
      if (nav === 'general') {
        showGeneral()
        return
      }
      if (nav === 'expense') {
        showExpense()
        return
      }
      if (nav === 'dues') {
        showDues()
        return
      }
      if (nav === 'search') {
        showSearch()
        return
      }
      if (nav === 'recycle') {
        showRecycle()
        return
      }
      if (nav === 'report') {
        showReports()
        return
      }
      if (nav === 'settings') {
        showSettings()
        return
      }
      sidebar.setActive(nav)
      showDashboard()
    })
  })

  /** ESC: entry/welcome → home tiles; F1 dashboard (treeview) → home tiles in one press. ESC×2 on home tiles = welcome. */
  let escDuoCount = 0
  let escDuoTimer: ReturnType<typeof setTimeout> | null = null
  const onHomeEsc = (e: KeyboardEvent) => {
    if (!app.isConnected) {
      window.removeEventListener('keydown', onHomeEsc)
      return
    }
    if (e.key === 'F1') {
      if (document.querySelector('.startup-reminder-overlay')) return
      if (document.querySelector('.dues-modal-overlay')) return
      if (document.querySelector('.entry-detail-overlay')) return
      e.preventDefault()
      e.stopPropagation()
      showDashboard()
      return
    }
    if (e.key !== 'Escape') return
    if (document.querySelector('.startup-reminder-overlay')) return
    if (document.querySelector('.dues-modal-overlay')) return
    if (document.querySelector('.entry-detail-overlay')) return

    const subActive = !entryView.classList.contains('is-hidden') && entryView.childElementCount > 0
    const welcomeActive = !welcomeView.classList.contains('is-hidden')

    if (subActive) {
      escDuoCount = 0
      if (escDuoTimer !== null) {
        window.clearTimeout(escDuoTimer)
        escDuoTimer = null
      }
      e.preventDefault()
      e.stopPropagation()
        showHomeMenu()
      return
    }
    if (welcomeActive) {
      escDuoCount = 0
      if (escDuoTimer !== null) {
        window.clearTimeout(escDuoTimer)
        escDuoTimer = null
      }
      e.preventDefault()
      e.stopPropagation()
        showHomeMenu()
      return
    }

    const dashActive =
      !dashView.classList.contains('is-hidden') &&
      homeMenuView.classList.contains('is-hidden') &&
      entryView.classList.contains('is-hidden')
    if (dashActive) {
      escDuoCount = 0
      if (escDuoTimer !== null) {
        window.clearTimeout(escDuoTimer)
        escDuoTimer = null
      }
      e.preventDefault()
      e.stopPropagation()
      showHomeMenu()
      return
    }

    escDuoCount += 1
    if (escDuoTimer !== null) window.clearTimeout(escDuoTimer)
    escDuoTimer = window.setTimeout(() => {
      if (escDuoCount >= 2) showWelcome()
      escDuoCount = 0
      escDuoTimer = null
    }, 380)
  }
  window.addEventListener('keydown', onHomeEsc)

  showHomeMenu()
  queueMicrotask(() => maybeOpenStartupReminder())

  return app
}

type EntryUrgency = 'normal' | 'urgent' | 'other'

type Entry = {
  id: string
  createdAt: string
  entryDate: string
  name: string
  fatherName: string
  cnic: string
  trackingId: string
  reference: string
  weaponNumber: string
  policeStation: string
  mobileNumber: string
  category: string
  costPrice: number | null
  salePrice: number | null
  cashReceived: number | null
  totalDues: number
  urgency: EntryUrgency
  urgentDays: number | null
  otherReminderDays: number | null
  /** Shown as Completed only after user picks Complete from Actions (legacy: inferred from dues if missing). */
  manuallyCompleted: boolean
  /** Optional fee line — never printed on client detail sheet. */
  fees?: number | null
}

const ENTRY_STORAGE_KEY = 'esysoft.entries.v1'

function normalizeEntry(row: Entry): Entry {
  const manuallyCompleted =
    typeof row.manuallyCompleted === 'boolean' ? row.manuallyCompleted : row.totalDues === 0
  return { ...row, manuallyCompleted }
}

function loadEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(ENTRY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Entry[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((r) => normalizeEntry(r as Entry))
  } catch {
    return []
  }
}

function entryStatusLabel(e: Entry): string {
  if (e.manuallyCompleted) return 'Completed'
  if (e.urgency === 'urgent') return 'Urgent'
  if (e.urgency === 'other') return 'Other'
  return 'Normal'
}

function entryMatchesQuery(e: Entry, q: string): boolean {
  const s = q.trim().toLowerCase()
  if (!s) return false
  const fields = [e.name, e.cnic, e.trackingId, e.mobileNumber, e.reference, e.fatherName, e.category]
  return fields.some((f) => f.toLowerCase().includes(s))
}

/** Same reference (trimmed, case-insensitive) → one group; blank reference rows never merge. */
function referenceGroupingKey(entry: Entry): string {
  const raw = entry.reference.trim()
  if (!raw) return `∅:${entry.id}`
  return raw.toLowerCase()
}

/** Bucket main-list rows so one reference = one dashboard line; if search is on, only groups whose reference matched at least one hit (whole group rows still listed from `takeFiltered`). */
function dashboardReferenceBuckets(takeFiltered: Entry[], searched: Entry[], searchActive: boolean): Entry[][] {
  const matchedKeys = searchActive ? new Set(searched.map((e) => referenceGroupingKey(e))) : null
  const keys = [...new Set(takeFiltered.map((e) => referenceGroupingKey(e)))].filter((k) =>
    matchedKeys ? matchedKeys.has(k) : true,
  )
  // Preserve storage order so entries appended/inserted appear "under" the record.
  return keys.map((k) => takeFiltered.filter((e) => referenceGroupingKey(e) === k))
}

function entryLineProfit(e: Entry) {
  const s = e.salePrice ?? 0
  const c = e.costPrice ?? 0
  return Math.round((s - c) * 100) / 100
}

/** Amount already collected toward sale (sale − remaining dues); ignores cost. */
function entryPaidTowardSale(e: Entry): number {
  const sp = e.salePrice
  if (sp == null) return 0
  return Math.round(Math.max(0, sp - entryLineDues(e)) * 100) / 100
}

function entryActionCellHtml(
  e: Entry,
  opts: { showRecycle: boolean; mode?: 'full' | 'viewOnly' } = { showRecycle: true, mode: 'full' },
) {
  const mode = opts.mode ?? 'full'
  if (mode === 'viewOnly') {
    return `
            <td class="td-actions">
              <button type="button" class="btn primary sm btn-eye" data-act="view" aria-label="View">${ICON_EYE}</button>
            </td>`
  }

  const completeBtn = e.manuallyCompleted
    ? ''
    : `<button type="button" class="action-dd-item" role="menuitem" data-act="complete">Complete</button>`
  const recBtn = opts.showRecycle
    ? `<button type="button" class="action-dd-item action-dd-danger" role="menuitem" data-act="recycle">Move to recycle bin</button>`
    : ''
  return `
            <td class="td-actions">
              <div class="action-dd">
                <button type="button" class="action-dd-btn mini" aria-haspopup="true" aria-expanded="false">Actions ▾</button>
                <div class="action-dd-menu" role="menu">
                  <button type="button" class="action-dd-item" role="menuitem" data-act="view">View detail</button>
                  <button type="button" class="action-dd-item action-dd-item-ico" role="menuitem" data-act="edit">${ICON_EDIT_IMG}<span>Edit</span></button>
                  ${completeBtn}
                  <button type="button" class="action-dd-item" role="menuitem" data-act="print-bill">Print client bill</button>
                  <button type="button" class="action-dd-item" role="menuitem" data-act="print-detail">Print client detail</button>
                  ${recBtn}
                </div>
              </div>
            </td>`
}

function escHtml(s: string) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function escAttr(s: string) {
  return escHtml(s).replaceAll("'", '&#39;')
}

const ICON_EDIT_IMG =
  '<img class="ico-img" src="/icons/edit.png" width="24" height="24" alt="" aria-hidden="true" />'
const ICON_DELETE_IMG =
  '<img class="ico-img" src="/icons/delete.svg" width="24" height="24" alt="" aria-hidden="true" />'

function editIconBtnHtml(classes: string, extraAttrs = '', label = 'Edit'): string {
  return `<button type="button" class="btn-ico edit ${classes}" ${extraAttrs} aria-label="${escAttr(label)}" title="${escAttr(label)}">${ICON_EDIT_IMG}</button>`
}

function deleteIconBtnHtml(classes: string, extraAttrs = '', label = 'Delete'): string {
  return `<button type="button" class="btn-ico delete ${classes}" ${extraAttrs} aria-label="${escAttr(label)}" title="${escAttr(label)}">${ICON_DELETE_IMG}</button>`
}

/** Shop block on printed bills / detail sheets (matches app branding). */
const PRINT_INVOICE_SHOP = {
  name: 'Hayat & Brothers',
  phone: SHOP_CONTACT_PHONE,
} as const

function formatInvoiceRupee(n: number) {
  const rounded = Math.round(n * 100) / 100
  const [intRaw, frac] = rounded.toFixed(2).split('.')
  const intNum = Number(intRaw)
  const intPart = Number.isFinite(intNum) ? intNum.toLocaleString('en-US') : intRaw
  return `RS ${intPart}.${frac}`
}

function invoiceNumberFromEntryId(id: string) {
  const tail = id.replace(/-/g, '').slice(-6).toUpperCase()
  return tail ? `#${tail}` : '#—'
}

function invoiceCustomerInitial(name: string) {
  const t = name.trim()
  return t.length ? t[0].toUpperCase() : 'C'
}

function invoiceAmountPaidValue(e: Entry): number {
  if (e.salePrice === null) return e.cashReceived ?? 0
  if (e.cashReceived === null) return e.salePrice
  return e.cashReceived
}

function invoiceIsFullyPaid(e: Entry) {
  return e.totalDues <= 0.005
}

const PRINT_INVOICE_CSS = `:root{
  --inv-navy:#101828;
  --inv-navy-mid:#1b2a41;
  --inv-teal:#0d9488;
  --inv-teal-soft:#ccfbf1;
  --inv-grey:#eef2f6;
  --inv-line:#e2e8f0;
  --inv-green:#15803d;
  --inv-green-soft:#bbf7d0;
  --inv-green-dark:#065f46;
  --inv-amber:#b45309;
  --inv-red-phone:#dc2626;
}
*{box-sizing:border-box;}
body{
  margin:0;
  padding:18px;
  font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  color:#0f172a;
  background:#cbd5e1;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.invoice-root{
  max-width:560px;
  margin:0 auto;
  background:#fff;
  border-radius:11px;
  overflow:hidden;
  box-shadow:0 14px 40px rgba(15,23,42,.12);
}
.inv-head{
  text-align:center;
  padding:20px 16px 18px;
  background:radial-gradient(ellipse 120% 100% at 50% -20%,#1e3a5f 0%,var(--inv-navy) 45%,#0b1220 100%);
  color:#fff;
}
.inv-brand{font-size:1.35rem;font-weight:800;letter-spacing:.04em;}
.inv-phone{display:flex;align-items:center;justify-content:center;gap:6px;font-size:.82rem;margin-top:10px;}
.inv-phone svg{flex-shrink:0;}
.inv-badge{
  display:inline-block;margin-top:14px;padding:7px 18px;border-radius:999px;
  background:var(--inv-teal);color:#fff;font-size:.72rem;font-weight:800;letter-spacing:.08em;
}
.inv-meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;background:var(--inv-grey);padding:16px 14px;border-bottom:1px solid var(--inv-line);}
.inv-meta .lbl{font-size:.65rem;color:#64748b;font-weight:700;letter-spacing:.06em;text-transform:uppercase;}
.inv-meta .val{font-size:.95rem;font-weight:800;margin-top:4px;color:#0f172a;}
.inv-meta .val.is-paid{color:var(--inv-green);display:inline-flex;align-items:center;gap:5px;}
.inv-meta .val.is-paid .chk{font-size:14px;line-height:1;}
.inv-meta .val.is-pending{color:var(--inv-amber);font-weight:800;}
.inv-cust{display:flex;align-items:flex-start;gap:12px;padding:16px 16px;background:#fff;border-bottom:1px solid var(--inv-line);}
.inv-cust-av{width:44px;height:44px;border-radius:50%;background:var(--inv-teal);color:#fff;font-weight:800;font-size:1.1rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.inv-cust .lbl{font-size:.65rem;color:#64748b;font-weight:700;letter-spacing:.06em;text-transform:uppercase;}
.inv-cust .name{font-weight:800;font-size:1.05rem;margin-top:5px;color:#0f172a;word-break:break-word;}
.inv-items-h{font-size:.65rem;color:#64748b;font-weight:700;letter-spacing:.06em;padding:14px 16px 0;text-transform:uppercase;}
.inv-table{width:100%;border-collapse:collapse;font-size:.88rem;}
.inv-table thead th{font-size:.65rem;color:#64748b;font-weight:700;letter-spacing:.05em;text-transform:uppercase;text-align:left;padding:10px 16px;border-bottom:1px solid var(--inv-line);}
.inv-table thead th.amt{text-align:right;}
.inv-table tbody td{padding:11px 16px;border-bottom:1px solid #f1f5f9;vertical-align:top;}
.inv-table tbody td.desc{color:#334155;}
.inv-table tbody td.amt{text-align:right;font-weight:700;white-space:nowrap;}
.inv-sum{border-top:1px solid var(--inv-line);}
.inv-sum-row{display:flex;justify-content:space-between;padding:10px 16px;background:var(--inv-grey);border-bottom:1px solid var(--inv-line);font-size:.88rem;}
.inv-sum-row:nth-child(2){border-bottom:1px solid var(--inv-line);}
.inv-sum-row .amt{font-weight:700;}
.inv-sum-row .amt.pos{color:var(--inv-green);}
.inv-grand{display:flex;justify-content:space-between;align-items:center;padding:13px 16px;background:linear-gradient(90deg,var(--inv-navy) 0%,var(--inv-navy-mid) 100%);color:#fff;font-size:.74rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;border-radius:0 0 10px 10px;}
.inv-grand .amt{font-size:1.05rem;font-weight:800;text-transform:none;letter-spacing:0;}
.inv-foot{padding:16px;display:flex;justify-content:center;}
.inv-foot-paid{
  display:inline-flex;align-items:center;gap:8px;padding:11px 28px;border-radius:10px;background:var(--inv-green-soft);border:2px solid var(--inv-green);color:var(--inv-green-dark);font-weight:800;font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;
}
.inv-soft{padding:14px;text-align:center;font-size:.65rem;color:#94a3b8;background:#fafafa;}
@media print{
  body{background:#fff;padding:0;}
  .invoice-root{box-shadow:none;border-radius:0;max-width:none;}
}
`

/** Default sheet for client bill & other invoice prints (A4). */
const PRINT_INVOICE_SHEET_A4 = `@page{size:A4 portrait;margin:12mm;}`

/** A6 portrait (105×148mm) + tighter type/spacing for long client-detail tables. */
const PRINT_INVOICE_SHEET_A6 = `@page{size:A6 portrait;margin:4mm 5mm;}
.invoice--a6.invoice-root{border-radius:8px;}
.invoice--a6 .inv-brand{font-size:1.02rem;}
.invoice--a6 .inv-phone{font-size:.7rem;margin-top:6px;}
.invoice--a6 .inv-phone svg{width:11px;height:11px;}
.invoice--a6 .inv-badge{margin-top:8px;padding:5px 11px;font-size:.58rem;}
.invoice--a6 .inv-head{padding:10px 8px 8px;}
.invoice--a6 .inv-meta{padding:8px 6px;gap:4px;}
.invoice--a6 .inv-meta .lbl{font-size:.52rem;}
.invoice--a6 .inv-meta .val{font-size:.74rem;margin-top:2px;}
.invoice--a6 .inv-meta .val.is-paid .chk{font-size:11px;}
.invoice--a6 .inv-cust{padding:8px 8px;gap:8px;}
.invoice--a6 .inv-cust-av{width:32px;height:32px;font-size:.85rem;}
.invoice--a6 .inv-cust .lbl{font-size:.52rem;}
.invoice--a6 .inv-cust .name{font-size:.82rem;margin-top:2px;}
.invoice--a6 .inv-items-h{padding:7px 8px 0;font-size:.52rem;}
.invoice--a6 .inv-table{font-size:.65rem;}
.invoice--a6 .inv-table thead th{padding:5px 8px;font-size:.52rem;}
.invoice--a6 .inv-table tbody td{padding:5px 8px;}
.invoice--a6 .inv-sum-row{padding:6px 8px;font-size:.68rem;}
.invoice--a6 .inv-grand{padding:8px 8px;font-size:.58rem;}
.invoice--a6 .inv-grand .amt{font-size:.82rem;}
.invoice--a6 .inv-foot{padding:8px;}
.invoice--a6 .inv-foot-paid{padding:6px 14px;font-size:.58rem;border-radius:8px;}
.invoice--a6 .inv-soft{padding:6px;font-size:.52rem;}
`

/** Phone icon (red accent) used in invoice header — inline for print iframe. */
const PRINT_INVOICE_PHONE_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" fill="none"><path fill="currentColor" d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z"/></svg>`

function printInvoiceShell(title: string, bodyInner: string, paper: 'a4' | 'a6' = 'a4') {
  const sheet = paper === 'a6' ? PRINT_INVOICE_SHEET_A6 : PRINT_INVOICE_SHEET_A4
  const doc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${escAttr(title)}</title>
<style>${PRINT_INVOICE_CSS}${sheet}</style></head><body>${bodyInner}</body></html>`
  printFullDocument(doc, paper)
}

function buildInvoiceHeader(badgeLabel: string) {
  const p = escHtml(PRINT_INVOICE_SHOP.phone)
  return `<header class="inv-head">
  <div class="inv-brand">${escHtml(PRINT_INVOICE_SHOP.name)}</div>
  <div class="inv-phone" style="color:var(--inv-red-phone)">${PRINT_INVOICE_PHONE_ICON}<span style="color:#fff">${p}</span></div>
  <div class="inv-badge">${escHtml(badgeLabel)}</div>
</header>`
}

function buildInvoiceMeta(entry: Entry, statusKind: 'payment' | 'record' = 'payment') {
  const statusLine =
    statusKind === 'record'
      ? `<div class="val">${escHtml(entryStatusLabel(entry))}</div>`
      : invoiceIsFullyPaid(entry)
        ? `<div class="val is-paid"><span class="chk">✓</span> Paid</div>`
        : `<div class="val is-pending">Pending</div>`
  return `<section class="inv-meta">
  <div><div class="lbl">Invoice no.</div><div class="val">${escHtml(invoiceNumberFromEntryId(entry.id))}</div></div>
  <div><div class="lbl">Date</div><div class="val">${escHtml(formatDateDisplay(entry.entryDate))}</div></div>
  <div><div class="lbl">Status</div>${statusLine}</div>
</section>`
}

function buildInvoiceCustomer(entry: Entry) {
  const name = entry.name.trim() || '—'
  return `<section class="inv-cust">
  <div class="inv-cust-av">${escHtml(invoiceCustomerInitial(name))}</div>
  <div><div class="lbl">Customer</div><div class="name">${escHtml(name)}</div></div>
</section>`
}

function buildInvoiceItemsTable(rows: { desc: string; amt: string }[]) {
  const body = rows
    .map(
      (r, i) =>
        `<tr><td>${i + 1}</td><td class="desc">${escHtml(r.desc)}</td><td class="amt">${escHtml(r.amt)}</td></tr>`,
    )
    .join('')
  return `<div class="inv-items-h">Items purchased</div>
<table class="inv-table" role="table">
  <thead><tr><th>#</th><th>Description</th><th class="amt">Amount</th></tr></thead>
  <tbody>${body}</tbody>
</table>`
}

function buildInvoiceItemsTableDetail(lines: { label: string; value: string }[]) {
  const body = lines
    .map(
      (r, i) =>
        `<tr><td>${i + 1}</td><td class="desc">${escHtml(r.label)}</td><td class="amt" style="font-weight:600;text-align:right">${escHtml(r.value)}</td></tr>`,
    )
    .join('')
  return `<div class="inv-items-h">Client information</div>
<table class="inv-table" role="table">
  <thead><tr><th>#</th><th>Field</th><th class="amt">Details</th></tr></thead>
  <tbody>${body}</tbody>
</table>`
}

function buildInvoiceFinancialBlock(entry: Entry) {
  const sale = entry.salePrice
  const sub = sale ?? 0
  const paidVal = invoiceAmountPaidValue(entry)
  const due = entry.totalDues
  const subStr = sale !== null ? formatInvoiceRupee(sub) : '—'
  const grandStr = sale !== null ? formatInvoiceRupee(sub) : formatInvoiceRupee(0)
  return `<div class="inv-sum">
  <div class="inv-sum-row"><span>Subtotal</span><span class="amt">${escHtml(subStr)}</span></div>
  <div class="inv-sum-row"><span>Amount paid</span><span class="amt pos">${escHtml(formatInvoiceRupee(paidVal))}</span></div>
  <div class="inv-sum-row"><span>Balance due</span><span class="amt pos">${escHtml(formatInvoiceRupee(due))}</span></div>
  <div class="inv-grand"><span>Grand total</span><span class="amt">${escHtml(grandStr)}</span></div>
</div>`
}

/** Bill / sale invoice footer — payment badge when cleared. Detail print omits amounts, so footer is text-only there. */
function buildInvoiceFooter(entry: Entry, kind: 'bill' | 'detail' = 'bill') {
  if (kind === 'detail')
    return `<div class="inv-soft">EsySoft — Application Tracking</div>`
  if (!invoiceIsFullyPaid(entry)) return `<div class="inv-soft">EsySoft — Application Tracking</div>`
  return `<div class="inv-foot"><div class="inv-foot-paid"><span>✓</span> Fully paid</div></div>
<div class="inv-soft">EsySoft — Application Tracking</div>`
}

/** Full HTML document string (DOCTYPE … html). Uses a hidden iframe so printing works when `window.open` is blocked (Tauri / WebView2). */
function printFullDocument(html: string, iframePaper: 'a4' | 'a6' = 'a4') {
  const w = iframePaper === 'a6' ? '105mm' : '210mm'
  const h = iframePaper === 'a6' ? '148mm' : '297mm'
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'Print')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    `position:fixed;left:0;top:0;width:${w};min-height:${h};border:0;opacity:0;pointer-events:none;z-index:2147483000`
  document.body.appendChild(iframe)
  const idoc = iframe.contentDocument
  if (!idoc) {
    iframe.remove()
    return
  }
  idoc.open()
  idoc.write(html)
  idoc.close()
  const win = iframe.contentWindow
  if (!win) {
    iframe.remove()
    return
  }
  const cleanup = () => {
    if (iframe.isConnected) iframe.remove()
  }
  const run = () => {
    try {
      win.focus()
      win.print()
    } catch {
      /* ignore */
    }
    window.setTimeout(cleanup, 800)
  }
  win.addEventListener('afterprint', cleanup, { once: true })
  window.setTimeout(run, 350)
}

function printClientBill(entry: Entry) {
  const descParts = [entry.category.trim(), entry.weaponNumber.trim(), entry.reference.trim()].filter(Boolean)
  const primaryDesc = descParts.length ? descParts.join(' · ') : entry.trackingId.trim() || '—'
  const sale = entry.salePrice
  const amtStr =
    sale !== null ? formatInvoiceRupee(sale) : '—'
  const items = buildInvoiceItemsTable([{ desc: primaryDesc, amt: amtStr }])
  const inner = `<div class="invoice-root">
${buildInvoiceHeader('SALE INVOICE')}
${buildInvoiceMeta(entry, 'payment')}
${buildInvoiceCustomer(entry)}
${items}
${buildInvoiceFinancialBlock(entry)}
${buildInvoiceFooter(entry, 'bill')}
</div>`
  printInvoiceShell(`Bill — ${entry.name || 'client'}`, inner)
}

function printClientDetail(entry: Entry) {
  const rows: [string, string][] = [
    ['Name', entry.name || '—'],
    ['Father', entry.fatherName || '—'],
    ['CNIC', entry.cnic || '—'],
    ['Mobile', entry.mobileNumber || '—'],
    ['Tracking ID', entry.trackingId || '—'],
    ['Client / Ref', entry.reference || '—'],
    ['Weapon No.', entry.weaponNumber || '—'],
    ['Police station', entry.policeStation || '—'],
    ['Category', entry.category || '—'],
    ['Reminder', entry.urgency],
    ['Urgent days', entry.urgentDays != null ? String(entry.urgentDays) : '—'],
    ['Other reminder days', entry.otherReminderDays != null ? String(entry.otherReminderDays) : '—'],
  ]
  const rowsForPrint = rows.filter(([k]) => k.toLowerCase() !== 'fees')
  const detailLines = rowsForPrint.map(([k, v]) => ({ label: k, value: v }))
  const items = buildInvoiceItemsTableDetail(detailLines)
  const inner = `<div class="invoice-root invoice--a6">
${buildInvoiceHeader('CLIENT DETAIL')}
${buildInvoiceMeta(entry, 'record')}
${buildInvoiceCustomer(entry)}
${items}
${buildInvoiceFooter(entry, 'detail')}
</div>`
  printInvoiceShell(`Detail — ${entry.name || 'client'}`, inner, 'a6')
}

/** One expandable block inside the CNIC-group view-detail modal (key–value pairs for a single Entry). */
function entryCnicDetailKvHtml(e: Entry): string {
  const rows: [string, string][] = [
    ['Date', formatDateDisplay(e.entryDate)],
    ['Name', e.name || '—'],
    ['Father', e.fatherName || '—'],
    ['CNIC', e.cnic || '—'],
    ['Mobile', e.mobileNumber || '—'],
    ['Tracking ID', e.trackingId || '—'],
    ['Client / Ref', e.reference || '—'],
    ['Weapon No.', e.weaponNumber || '—'],
    ['Police station', e.policeStation || '—'],
    ['Category', e.category || '—'],
    ['Sale price', e.salePrice !== null ? formatRs(e.salePrice) : '—'],
    ['Cash received', e.cashReceived !== null ? formatRs(e.cashReceived) : '—'],
    ['Cost price', e.costPrice !== null ? formatRs(e.costPrice) : '—'],
    ['Profit', formatRs(entryLineProfit(e))],
    ['Dues', formatRs(entryLineDues(e))],
    ['Reminder', e.urgency],
    ['Urgent days', e.urgentDays != null ? String(e.urgentDays) : '—'],
    ['Other reminder days', e.otherReminderDays != null ? String(e.otherReminderDays) : '—'],
    ['Row status', entryStatusLabel(e)],
  ]
  return `<table class="entry-cnic-kv">${rows
    .map(([k, v]) => `<tr><th>${escHtml(k)}</th><td>${escHtml(v)}</td></tr>`)
    .join('')}</table>`
}

type NewEntryInsertOpts = {
  /** Prefill form fields for a new entry (does not create/edit until user saves). */
  draft?: Partial<
    Pick<
      Entry,
      | 'entryDate'
      | 'name'
      | 'fatherName'
      | 'cnic'
      | 'trackingId'
      | 'reference'
      | 'weaponNumber'
      | 'policeStation'
      | 'mobileNumber'
      | 'category'
      | 'costPrice'
      | 'salePrice'
      | 'cashReceived'
      | 'urgency'
      | 'urgentDays'
      | 'otherReminderDays'
    >
  >
  /** Insert this newly created entry right after the given entry id (storage order). */
  insertAfterId?: string | null
}

function openEntryViewDetailModal(
  entry: Entry,
  opts: { onEdit?: (e: Entry) => void; onNewEntry?: (ins: NewEntryInsertOpts) => void; onChanged?: () => void } = {},
) {
  if (document.querySelector('.dues-modal-overlay')) return
  const groupKey = referenceGroupingKey(entry)
  const loadGroup = () => loadEntries().filter((e) => referenceGroupingKey(e) === groupKey)

  const overlay = makeEl('div', { className: 'dues-modal-overlay' })
  const modal = makeEl('div', { className: 'dues-modal entry-cnic-group-modal' })
  overlay.append(modal)
  document.body.append(overlay)

  const tearDown = () => {
    document.removeEventListener('keydown', onEscKey, true)
    if (overlay.isConnected) overlay.remove()
  }
  const onEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      tearDown()
    }
  }

  const esc = (s: string) => s.replaceAll('<', '&lt;')
  let selectedId = entry.id
  const render = () => {
    const group = loadGroup()
    if (!group.length) {
      tearDown()
      return
    }
    const first = group[0]
    if (!group.some((g) => g.id === selectedId)) selectedId = first.id
    const selected = group.find((g) => g.id === selectedId) ?? first
    const sumSale = group.reduce((s, e) => s + (e.salePrice ?? 0), 0)
    const sumCost = group.reduce((s, e) => s + (e.costPrice ?? 0), 0)
    const sumProfit = group.reduce((s, e) => s + entryLineProfit(e), 0)
    const sumDues = group.reduce((s, e) => s + entryLineDues(e), 0)

    modal.innerHTML = `
      <div class="dues-modal-hd">
        <div class="dues-modal-hd-top">
          <div class="dues-modal-hd-name">${esc(selected.name.trim() || '—')}</div>
          <div class="dues-modal-hd-cnic">CNIC: ${esc(first.cnic.trim() || '—')} · Reference: ${esc(first.reference.trim() || '—')}</div>
        </div>
        <div class="dues-modal-hd-sub">
          <span class="dues-modal-hd-kicker">${ICON_DOC}<span>Client detail (${group.length} entr${group.length === 1 ? 'y' : 'ies'} — same reference)</span></span>
          <span class="dues-modal-sep">|</span>
          <span>Father: ${esc(selected.fatherName.trim() || '—')}</span>
        </div>
      </div>
      <div class="dues-modal-meta">
        <span>Mobile: ${esc(selected.mobileNumber.trim() || '—')}</span>
        <span class="dues-modal-sep">|</span>
        <span>TID: ${esc(selected.trackingId.trim() || '—')}</span>
        <span class="dues-modal-sep">|</span>
        <span>Police: ${esc(selected.policeStation.trim() || '—')}</span>
        <span class="dues-modal-sep">|</span>
        <span>Category: ${esc(selected.category.trim() || '—')}</span>
      </div>
      <div class="dues-modal-split">
        <div class="dues-modal-main">
          <div class="dues-modal-section">${ICON_DOC}<span>${group.length === 1 ? 'Application detail' : 'Each application — expand for full detail'}</span></div>
          <div class="dues-modal-tablewrap entry-cnic-tree-wrap">
            <div class="entry-cnic-split">
              <div class="entry-cnic-list" aria-label="Applications list">
                <div class="entry-cnic-detail-tree"></div>
              </div>
              <aside class="entry-cnic-detailpane" aria-label="Selected application detail"></aside>
            </div>
          </div>
        </div>
      </div>
      <div class="dues-modal-total entry-cnic-group-totals">
        <div class="gt-title">Group totals</div>
        <div class="gt-line">
          <span>Total Sale <b>${formatRs(sumSale)}</b></span>
          <span class="gt-dot">·</span>
          <span>Total Cost <b>${formatRs(sumCost)}</b></span>
          <span class="gt-dot">·</span>
          <span>Total Profit <b>${formatRs(sumProfit)}</b></span>
          <span class="gt-dot">·</span>
          <span>Total Dues <b>${formatRs(sumDues)}</b></span>
        </div>
      </div>
      <div class="dues-modal-actions entry-cnic-group-actions">
        <button type="button" class="btn ghost entry-cnic-detail-close">✕ Close</button>
        <button type="button" class="btn primary entry-cnic-new-under">${ICON_PLUS}<span>New Entry</span></button>
      </div>
    `

    const treeRoot = modal.querySelector<HTMLDivElement>('.entry-cnic-detail-tree')
    const detailPane = modal.querySelector<HTMLElement>('.entry-cnic-detailpane')
    if (treeRoot) {
      treeRoot.innerHTML = `
        <div class="entry-cnic-tree-head" role="row">
          <div class="entry-cnic-th">Name</div>
          <div class="entry-cnic-th">Father</div>
          <div class="entry-cnic-th">Weapon No.</div>
          <div class="entry-cnic-th">Status</div>
          <div class="entry-cnic-th entry-cnic-th-actions">Action</div>
        </div>
      ` + group
        .map((e) => {
          const st = entryStatusLabel(e)
          const name = e.name.trim() || '—'
          const father = e.fatherName.trim() || '—'
          const weapon = e.weaponNumber.trim() || '—'
          const completeBtn = e.manuallyCompleted
            ? ''
            : `<button type="button" class="action-dd-item" role="menuitem" data-act="complete" data-entry-id="${escAttr(e.id)}">Complete</button>`
          const sel = e.id === selectedId ? ' is-selected' : ''
          return `<div class="entry-cnic-row${sel}" role="row" data-entry-id="${escAttr(e.id)}">
            <div class="entry-cnic-sum">
              <span class="entry-cnic-sum-name">${esc(name)}</span>
              <span class="entry-cnic-sum-father">${esc(father)}</span>
              <span class="entry-cnic-sum-weapon">${esc(weapon)}</span>
              <span class="pill ${st.toLowerCase()}">${esc(st)}</span>
              <span class="entry-cnic-sum-actions">
                <button type="button" class="btn primary sm btn-eye entry-cnic-viewbtn" data-act="view-row" data-entry-id="${escAttr(e.id)}" aria-label="View">${ICON_EYE}</button>
                <div class="action-dd">
                  <button type="button" class="action-dd-btn mini" aria-haspopup="true" aria-expanded="false">Actions ▾</button>
                  <div class="action-dd-menu" role="menu">
                    <button type="button" class="action-dd-item action-dd-item-ico" role="menuitem" data-act="edit" data-entry-id="${escAttr(e.id)}">${ICON_EDIT_IMG}<span>Edit</span></button>
                    ${completeBtn}
                    <button type="button" class="action-dd-item" role="menuitem" data-act="print-bill" data-entry-id="${escAttr(e.id)}">Print bill</button>
                    <button type="button" class="action-dd-item" role="menuitem" data-act="print-detail" data-entry-id="${escAttr(e.id)}">Print detail</button>
                    <button type="button" class="action-dd-item action-dd-danger" role="menuitem" data-act="recycle" data-entry-id="${escAttr(e.id)}">Move to bin</button>
                  </div>
                </div>
              </span>
            </div>
          </div>`
        })
        .join('')
    }
    if (detailPane) {
      detailPane.innerHTML = `
        <div class="entry-cnic-detail-title">Detail</div>
        <div class="entry-cnic-detail-body">${entryCnicDetailKvHtml(selected)}</div>
      `
    }

    modal.querySelector('.entry-cnic-detail-close')?.addEventListener('click', tearDown)
    modal.querySelector<HTMLButtonElement>('.entry-cnic-new-under')?.addEventListener('click', () => {
      const cur = loadEntries().find((x) => x.id === selectedId) ?? selected
      const draft: NewEntryInsertOpts['draft'] = {
        entryDate: isoToday(),
        name: (cur.name || '').trim(),
        fatherName: (cur.fatherName || '').trim(),
        cnic: (cur.cnic || '').trim(),
        reference: (cur.reference || '').trim(),
        mobileNumber: (cur.mobileNumber || '').trim(),
        policeStation: (cur.policeStation || '').trim(),
        category: (cur.category || '').trim(),
        urgency: cur.urgency,
        urgentDays: cur.urgentDays,
        otherReminderDays: cur.otherReminderDays,
      }
      const insertAfterId = selectedId
      tearDown()
      opts.onNewEntry?.({ draft, insertAfterId })
    })
  }

  render()

  document.addEventListener('keydown', onEscKey, true)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) tearDown()
  })

  modal.addEventListener('click', async (ev) => {
    const row = (ev.target as HTMLElement).closest<HTMLElement>('.entry-cnic-row[data-entry-id]')
    if (row && !(ev.target as HTMLElement).closest('.entry-cnic-sum-actions')) {
      const id = row.getAttribute('data-entry-id')
      if (id) {
        selectedId = id
        render()
      }
      return
    }
    const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-act][data-entry-id]')
    if (!b) {
      const ddBtn = (ev.target as HTMLElement).closest<HTMLElement>('.action-dd-btn')
      if (ddBtn) {
        ev.preventDefault()
        ev.stopPropagation()
        const wrap = ddBtn.closest('.action-dd')
        const menu = wrap?.querySelector('.action-dd-menu') as HTMLElement | null
        if (!menu) return
        const opening = !menu.classList.contains('is-open')
        closeAllActionDropdownMenus()
        if (opening) {
          requestAnimationFrame(() => {
            menu.classList.add('is-open')
            ddBtn.setAttribute('aria-expanded', 'true')
            positionActionDropdownFixed(ddBtn as HTMLElement, menu)
            requestAnimationFrame(() => positionActionDropdownFixed(ddBtn as HTMLElement, menu))
          })
        } else {
          resetActionDropdownMenu(menu)
          ddBtn.setAttribute('aria-expanded', 'false')
        }
      }
      return
    }
    const act = b.getAttribute('data-act')
    const id = b.getAttribute('data-entry-id')
    if (!act || !id) return
    ev.preventDefault()
    ev.stopPropagation()
    const cur = loadEntries().find((x) => x.id === id)
    if (!cur) return
    if (act === 'view-row') {
      selectedId = id
      render()
      return
    }
    if (act === 'edit') {
      tearDown()
      opts.onEdit?.(cur)
      return
    }
    if (act === 'complete') {
      const duesNow = entryLineDues(cur)
      let cmsg = 'Mark this entry as Completed?'
      if (duesNow > 0) {
        cmsg +=
          '\n\nThis record still has outstanding dues. It will stay in Pending Dues until the amount is fully collected.'
      }
      if (
        !(await confirmModal({
          title: 'Complete entry',
          message: cmsg,
          confirmText: 'Complete',
          cancelText: 'Cancel',
        }))
      )
        return
      patchEntryById(id, { manuallyCompleted: true })
      opts.onChanged?.()
      render()
      return
    }
    if (act === 'print-bill') {
      printClientBill(cur)
      return
    }
    if (act === 'print-detail') {
      printClientDetail(cur)
      return
    }
    if (act === 'recycle') {
      if (
        !(await confirmModal({
          title: 'Move to Recycle Bin',
          message:
            'Move this record to the Recycle Bin?\n\nIt will be removed from the main list until you restore it or delete it permanently from the bin.',
          confirmText: 'Move',
          cancelText: 'Cancel',
          variant: 'danger',
        }))
      )
        return
      moveEntryToRecycle(id)
      opts.onChanged?.()
      render()
    }
  })
}

function patchEntryById(id: string, patch: Partial<Entry>) {
  const all = loadEntries()
  const ix = all.findIndex((e) => e.id === id)
  if (ix < 0) return
  all[ix] = { ...all[ix], ...patch }
  saveEntries(all)
}

function saveEntries(entries: Entry[]) {
  localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify(entries))
}

const RECYCLE_STORAGE_KEY = 'esysoft.recycle.v1'

type RecycleRecord = {
  entry: Entry
  deletedAt: string
}

function loadRecycle(): RecycleRecord[] {
  try {
    const raw = localStorage.getItem(RECYCLE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecycleRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRecycle(rows: RecycleRecord[]) {
  localStorage.setItem(RECYCLE_STORAGE_KEY, JSON.stringify(rows))
}

function moveEntryToRecycle(entryId: string): boolean {
  const all = loadEntries()
  const ix = all.findIndex((e) => e.id === entryId)
  if (ix < 0) return false
  const [removed] = all.splice(ix, 1)
  saveEntries(all)
  const bin = loadRecycle()
  bin.push({ entry: removed, deletedAt: new Date().toISOString() })
  saveRecycle(bin)
  return true
}

function restoreFromRecycle(entryId: string): boolean {
  const bin = loadRecycle()
  const ix = bin.findIndex((r) => r.entry.id === entryId)
  if (ix < 0) return false
  const [{ entry }] = bin.splice(ix, 1)
  saveRecycle(bin)
  const all = loadEntries()
  if (all.some((e) => e.id === entry.id)) return false
  all.push(normalizeEntry(entry))
  saveEntries(all)
  return true
}

function purgeRecycleEntry(entryId: string): boolean {
  const bin = loadRecycle()
  const ix = bin.findIndex((r) => r.entry.id === entryId)
  if (ix < 0) return false
  bin.splice(ix, 1)
  saveRecycle(bin)
  return true
}

function fireRecycleBin() {
  saveRecycle([])
}

function cryptoId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return String(Date.now()) + '-' + String(Math.random()).slice(2)
}

function parseNumOrNull(s: string) {
  const trimmed = s.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function computeDues(salePrice: number | null, cashReceived: number | null) {
  if (salePrice === null) return 0
  if (cashReceived === null) return 0 // empty = full payment
  return Math.max(0, salePrice - cashReceived)
}

function formatRs(n: number) {
  const rounded = Math.round(n * 100) / 100
  const s = String(rounded)
  const [intRaw, dec] = s.split('.')
  const intNum = Number(intRaw)
  const intPart = Number.isFinite(intNum) ? intNum.toLocaleString('en-US') : intRaw
  return dec ? `Rs. ${intPart}.${dec}` : `Rs. ${intPart}`
}

function isoToday() {
  const d = new Date()
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Whole calendar days from `fromIso` to `toIso` (YYYY-MM-DD); negative if `toIso` is before `fromIso`. */
function calendarDaysBetweenIso(fromIso: string, toIso: string): number {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromIso.trim())
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toIso.trim())
  if (!a || !b) return 0
  const d0 = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]))
  const d1 = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]))
  return Math.round((d1 - d0) / 86400000)
}

function formatDateDisplay(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return iso || '-'
  return `${m[3]}/${m[2]}/${m[1]}`
}

type WeaponAllotLine = {
  id: string
  entryDate: string
  client: string
  weaponNumber: string
  costPrice: number | null
  salePrice: number | null
  cashReceived: number | null
}

type WeaponDateMode = 'allRecords' | 'all' | 'daily' | 'monthly' | 'range'

const WEAPON_ALLOT_KEY = 'esysoft.weaponAllot.v1'

function loadWeaponAllotLines(): WeaponAllotLine[] {
  try {
    const raw = localStorage.getItem(WEAPON_ALLOT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WeaponAllotLine[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveWeaponAllotLines(lines: WeaponAllotLine[]) {
  localStorage.setItem(WEAPON_ALLOT_KEY, JSON.stringify(lines))
}

function lineProfit(l: WeaponAllotLine) {
  const c = l.costPrice ?? 0
  const s = l.salePrice ?? 0
  return s - c
}

function lineDues(l: WeaponAllotLine) {
  return computeDues(l.salePrice, l.cashReceived)
}

/** Collected toward weapon sale (sale − dues); no cost. */
function weaponLinePaidTowardSale(l: WeaponAllotLine): number {
  const sp = l.salePrice
  if (sp == null) return 0
  return Math.round(Math.max(0, sp - lineDues(l)) * 100) / 100
}

/** Sum of recorded receipts on visible lines (search + date filter): cash received, plus full-paid rows (empty cash → count sale). */
function totalPaidRecordedOnWeaponLines(lines: WeaponAllotLine[]): number {
  let t = 0
  for (const l of lines) {
    const sale = l.salePrice
    const saleOk = sale != null && sale > 0
    if (!saleOk) continue
    const cr = l.cashReceived
    if (cr != null && cr > 0) {
      t += cr
      continue
    }
    if (cr === null && lineDues(l) === 0) {
      t += sale
    }
  }
  return Math.round(t * 100) / 100
}

function weaponLinePassesDateFilter(line: WeaponAllotLine, mode: WeaponDateMode, fromIso: string, toIso: string) {
  const d = line.entryDate
  if (mode === 'allRecords' || mode === 'all') return true
  const now = new Date()
  const p = (x: number) => String(x).padStart(2, '0')
  const t = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
  if (mode === 'daily') return d === t
  if (mode === 'monthly') return d.slice(0, 7) === t.slice(0, 7)
  if (mode === 'range') {
    if (!fromIso || !toIso) return true
    return d >= fromIso && d <= toIso
  }
  return true
}

/** Weapon allotment treeview: fixed 3in @ 96px/in (explicit px for WebView2). */
const WEAPON_ALLOT_TREE_SCROLL_HEIGHT_PX = Math.round(3 * 96)

/** Apply height to THIS scroll pane (caller must hold ref — doc.querySelector misses before mount). */
function applyWeaponAllotScrollHeightPx(el: HTMLElement) {
  const reserve = 380
  const cap = Math.min(
    WEAPON_ALLOT_TREE_SCROLL_HEIGHT_PX,
    Math.max(160, window.innerHeight - reserve),
  )
  el.style.height = `${cap}px`
  el.style.maxHeight = `${cap}px`
  el.style.minHeight = `${cap}px`
  el.style.overflowY = 'scroll'
}

function syncWeaponAllotTreeScrollHeightInDom() {
  const el = document.querySelector<HTMLElement>('.allot-screen-weapon .allot-table-scroll')
  if (el) applyWeaponAllotScrollHeightPx(el)
}

let weaponAllotScrollResizeBound = false
function ensureWeaponAllotScrollResizeListener() {
  if (weaponAllotScrollResizeBound) return
  weaponAllotScrollResizeBound = true
  window.addEventListener('resize', syncWeaponAllotTreeScrollHeightInDom)
}

/** Expenses list: WebView2 often ignores grid/flex min-height shrink — force scroll pane height like weapon allotment. */
function applyExpenseListScrollHeightPx(el: HTMLElement) {
  const reserve = 340
  const cap = Math.max(180, window.innerHeight - reserve)
  el.style.height = `${cap}px`
  el.style.maxHeight = `${cap}px`
  el.style.minHeight = '140px'
  el.style.overflowY = 'scroll'
}

function syncExpenseListScrollHeightInDom() {
  const el = document.querySelector<HTMLElement>('.allot-table-scroll-expense')
  if (el) applyExpenseListScrollHeightPx(el)
}

let expenseListScrollResizeBound = false
function ensureExpenseListScrollResizeListener() {
  if (expenseListScrollResizeBound) return
  expenseListScrollResizeBound = true
  window.addEventListener('resize', syncExpenseListScrollHeightInDom)
}

/** General entry grouped list: WebView2 ignores flex/grid shrink here too — force list height in px (same idea as expenses). */
function applyGeneralEntryListScrollHeightPx(el: HTMLElement) {
  const reserve = 340
  const cap = Math.max(180, window.innerHeight - reserve)
  el.style.height = `${cap}px`
  el.style.maxHeight = `${cap}px`
  el.style.minHeight = '140px'
  el.style.overflowY = 'scroll'
}

function syncGeneralEntryListScrollHeightInDom() {
  const el = document.querySelector<HTMLElement>('.allot-table-scroll-general')
  if (el) applyGeneralEntryListScrollHeightPx(el)
}

let generalEntryListScrollResizeBound = false
function ensureGeneralEntryListScrollResizeListener() {
  if (generalEntryListScrollResizeBound) return
  generalEntryListScrollResizeBound = true
  window.addEventListener('resize', syncGeneralEntryListScrollHeightInDom)
}

function filterWeaponLinesForTable(
  lines: WeaponAllotLine[],
  opts: { search: string; mode: WeaponDateMode; fromIso: string; toIso: string },
): WeaponAllotLine[] {
  const q = opts.search.trim().toLowerCase()
  const filtered = lines.filter((l) => {
    if (!weaponLinePassesDateFilter(l, opts.mode, opts.fromIso, opts.toIso)) return false
    if (!q) return true
    return l.client.toLowerCase().includes(q) || l.weaponNumber.toLowerCase().includes(q)
  })
  return filtered.slice().sort((a, b) => {
    const c = b.entryDate.localeCompare(a.entryDate)
    if (c !== 0) return c
    return a.client.localeCompare(b.client)
  })
}

function makeWeaponAllotScreen(opts: { onBack: () => void }) {
  const wrap = makeEl('section', { className: 'entry entry-dark allot-screen allot-screen-weapon' })

  const head = makeEl('div', { className: 'allot-head allot-head-weapon-row' })
  const headMain = makeEl('div', { className: 'allot-head-weapon-main' })
  const back = makeEl('button', { className: 'mini back', attrs: { type: 'button' } }) as HTMLButtonElement
  back.textContent = '← Main Screen'
  back.addEventListener('click', () => opts.onBack())
  const title = makeEl('div', { className: 'allot-title', text: 'Weapon Number Allotment' })
  const sums = makeEl('div', { className: 'allot-sums allot-sums-weapon-head', text: '' })
  headMain.append(back, title)
  head.append(headMain, sums)

  const form = makeEl('form', { className: 'allot-form' })
  const card = makeEl('div', { className: 'entry-card allot-card' })
  const kicker = makeEl('div', { className: 'allot-kicker', text: 'New Entry' })

  const mkField = (label: string, el: HTMLElement) => {
    const w = makeEl('label', { className: 'f' })
    const l = makeEl('span', { className: 'fl', text: label })
    w.append(l, el)
    return w
  }
  const input = (ph: string, attrs?: Record<string, string>) =>
    makeEl('input', { className: 'in', attrs: { placeholder: ph, ...attrs } }) as HTMLInputElement

  const entryDate = input('Date', { type: 'date' })
  entryDate.value = isoToday()
  const client = input('Client')
  const weaponNumber = input('Weapon No.')
  const costPrice = input('Cost Price', { inputmode: 'decimal' })
  const salePrice = input('Sale Price', { inputmode: 'decimal' })
  const cashReceived = input('Cash…', { inputmode: 'decimal', title: 'Empty = full paid' })

  const live = makeEl('div', { className: 'allot-live' })
  const updateLive = () => {
    const c = parseNumOrNull(costPrice.value) ?? 0
    const s = parseNumOrNull(salePrice.value) ?? 0
    const cr = parseNumOrNull(cashReceived.value)
    const sp = parseNumOrNull(salePrice.value)
    const profit = s - c
    const dues = computeDues(sp, cr)
    const duesLabel =
      cr === null && sp === null ? '—' : cr === null && sp !== null ? '0 (full paid)' : String(dues)
    live.textContent = `Profit: ${formatRs(profit)} | Dues: ${duesLabel}`
  }
  ;[costPrice, salePrice, cashReceived].forEach((el) => el.addEventListener('input', updateLive))
  updateLive()

  const rowTop = makeEl('div', { className: 'allot-fields allot-fields-weapon-top' })
  rowTop.append(
    mkField('Date', entryDate),
    mkField('Client', client),
    mkField('Weapon No.', weaponNumber),
    mkField('Cost Price', costPrice),
  )

  const actions = makeEl('div', { className: 'allot-actions' })
  let editingWeaponId: string | null = null

  const saveBtn = makeEl('button', { className: 'btn primary allot-save', attrs: { type: 'submit' } }) as HTMLButtonElement
  saveBtn.textContent = 'Save (Enter)'
  const cancelBtn = makeEl('button', { className: 'btn ghost', attrs: { type: 'button' } }) as HTMLButtonElement
  cancelBtn.textContent = 'Cancel'
  const clearEditing = () => {
    editingWeaponId = null
    saveBtn.textContent = 'Save (Enter)'
  }
  cancelBtn.addEventListener('click', () => {
    client.value = ''
    weaponNumber.value = ''
    costPrice.value = ''
    salePrice.value = ''
    cashReceived.value = ''
    entryDate.value = isoToday()
    clearEditing()
    msg.textContent = ''
    updateLive()
  })
  actions.append(saveBtn, cancelBtn)

  const liveSave = makeEl('div', { className: 'allot-live-save' })
  liveSave.append(live, actions)

  const rowBot = makeEl('div', { className: 'allot-fields allot-fields-weapon-bot' })
  rowBot.append(mkField('Sale Price', salePrice), mkField('Cash Received', cashReceived), liveSave)

  const msg = makeEl('div', { className: 'entry-msg', attrs: { role: 'status' } })
  card.append(kicker, rowTop, rowBot, msg)
  form.append(card)

  const searchIn = makeEl('input', {
    className: 'in allot-search-in',
    attrs: {
      type: 'search',
      placeholder: 'Ref / weapon…',
      'aria-label': 'Search weapon allotment table',
    },
  }) as HTMLInputElement

  const filt = makeEl('div', { className: 'allot-filters allot-filters-weapon' })
  let dateMode: WeaponDateMode = 'monthly'
  const fromIn = input('', { type: 'date' })
  const toIn = input('', { type: 'date' })
  fromIn.classList.add('allot-date-in')
  toIn.classList.add('allot-date-in')

  const mkFiltBtn = (label: string, mode: WeaponDateMode, extraClass?: string) => {
    const b = makeEl('button', {
      className: `tool-btn allot-filt-btn${extraClass ? ` ${extraClass}` : ''}`,
      attrs: { type: 'button', 'data-mode': mode },
    }) as HTMLButtonElement
    b.textContent = label
    return b
  }
  const bAll = mkFiltBtn('All', 'allRecords')
  const bDaily = mkFiltBtn('Daily', 'daily')
  const bMonthly = mkFiltBtn('Monthly', 'monthly', 'tool-purple')
  const applyBtn = makeEl('button', { className: 'btn primary allot-apply', attrs: { type: 'button' } }) as HTMLButtonElement
  applyBtn.textContent = 'Apply'

  const printBtn = makeEl('button', { className: 'btn primary tool-purple allot-print', attrs: { type: 'button' } }) as HTMLButtonElement
  printBtn.textContent = 'Print Statement'
  printBtn.addEventListener('click', () => window.print())

  const filtTail = makeEl('div', { className: 'allot-filters-tail allot-filters-tail-weapon' })
  filtTail.append(
    makeEl('span', { className: 'range-lbl allot-search-lbl', text: 'Search' }),
    searchIn,
    printBtn,
  )

  filt.append(
    bAll,
    bDaily,
    bMonthly,
    makeEl('span', { className: 'range-lbl', text: 'From:' }),
    fromIn,
    makeEl('span', { className: 'range-lbl', text: 'To:' }),
    toIn,
    applyBtn,
    filtTail,
  )

  const setFiltActive = () => {
    filt.querySelectorAll<HTMLButtonElement>('.allot-filt-btn').forEach((x) => {
      const m = x.getAttribute('data-mode') as WeaponDateMode
      x.classList.toggle('active', m === dateMode)
    })
  }

  const tableScroll = makeEl('div', { className: 'allot-table-scroll', attrs: { 'aria-label': 'Weapon allotment list' } })
  const tableBlock = makeEl('div', { className: 'allot-table-block' })

  const table = makeEl('div', { className: 'table allot-table' })
  table.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Client</th><th>Entries</th><th>Total Sale</th><th>Total Received</th><th>Total Profit</th><th>Total Dues</th><th class="th-weapon-eye" aria-label="View all entries">View</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `
  const tbody = table.querySelector<HTMLTableSectionElement>('tbody')

  const fromIsoForRender = () => (dateMode === 'range' ? fromIn.value : '')
  const toIsoForRender = () => (dateMode === 'range' ? toIn.value : '')

  const linesForDecodedRef = (refDecoded: string) => {
    const filtered = filterWeaponLinesForTable(loadWeaponAllotLines(), {
      search: searchIn.value,
      mode: dateMode,
      fromIso: fromIsoForRender(),
      toIso: toIsoForRender(),
    })
    return filtered.filter((l) => (l.client.trim() || '(No reference)') === refDecoded)
  }

  const renderTable = () => {
    const lines = filterWeaponLinesForTable(loadWeaponAllotLines(), {
      search: searchIn.value,
      mode: dateMode,
      fromIso: fromIsoForRender(),
      toIso: toIsoForRender(),
    })
    const esc = (s: string) => s.replaceAll('<', '&lt;')
    const refKeyFn = (l: WeaponAllotLine) => l.client.trim() || '(No reference)'
    const groups = new Map<string, WeaponAllotLine[]>()
    for (const l of lines) {
      const k = refKeyFn(l)
      const g = groups.get(k) ?? []
      g.push(l)
      groups.set(k, g)
    }
    const ordered = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
    const html = ordered
      .map(([ref, gLines]) => {
        let ts = 0,
          trcv = 0,
          tp = 0,
          td = 0
        for (const l of gLines) {
          ts += l.salePrice ?? 0
          trcv += l.cashReceived ?? l.salePrice ?? 0
          tp += lineProfit(l)
          td += lineDues(l)
        }
        const n = gLines.length
        const entriesLabel = `${n} ${n === 1 ? 'entry' : 'entries'}`
        const refAttr = encodeURIComponent(ref)
        return `<tr class="weapon-group-summary-row" data-ref="${refAttr}">
        <td>${esc(ref)}</td>
        <td>${entriesLabel}</td>
        <td>${formatRs(ts)}</td>
        <td>${formatRs(trcv)}</td>
        <td>${formatRs(tp)}</td>
        <td>${formatRs(td)}</td>
        <td class="td-icon"><button type="button" class="weapon-group-view weapon-ref-expand" data-ref="${refAttr}" aria-label="View entries for reference" title="View">&#128065;</button></td>
      </tr>`
      })
      .join('')
    if (tbody) tbody.innerHTML = html || `<tr><td colspan="7" class="empty">No records for this filter.</td></tr>`

    let ts = 0,
      td = 0
    for (const l of lines) {
      ts += l.salePrice ?? 0
      td += lineDues(l)
    }
    const todayIso = isoToday()
    const dailyLines = loadWeaponAllotLines().filter((l) => (l.entryDate || '') === todayIso)
    const dailySale = dailyLines.reduce((s, l) => s + (l.salePrice ?? 0), 0)
    const dailyDues = dailyLines.reduce((s, l) => s + lineDues(l), 0)
    const dailyPaid = totalPaidRecordedOnWeaponLines(dailyLines)
    sums.textContent = `Daily | Total Sale: ${formatRs(dailySale)} | Total dues: ${formatRs(dailyDues)} | Total paid: ${formatRs(dailyPaid)}`
  }

  const deleteWeaponLineQuiet = (wid: string) => {
    const all = loadWeaponAllotLines().filter((x) => x.id !== wid)
    saveWeaponAllotLines(all)
    if (editingWeaponId === wid) {
      clearEditing()
      client.value = ''
      weaponNumber.value = ''
      costPrice.value = ''
      salePrice.value = ''
      cashReceived.value = ''
      entryDate.value = isoToday()
      updateLive()
    }
    msg.textContent = 'Deleted.'
    renderTable()
  }

  const loadWeaponLineIntoForm = (line: WeaponAllotLine, wid: string) => {
    editingWeaponId = wid
    saveBtn.textContent = 'Update'
    entryDate.value = line.entryDate || isoToday()
    client.value = line.client
    weaponNumber.value = line.weaponNumber
    costPrice.value = line.costPrice != null ? String(line.costPrice) : ''
    salePrice.value = line.salePrice != null ? String(line.salePrice) : ''
    cashReceived.value = line.cashReceived != null ? String(line.cashReceived) : ''
    updateLive()
    msg.textContent = 'Editing this row — press Update to save or Cancel to discard.'
    closeAllActionDropdownMenus()
  }

  const openWeaponGroupEntriesModal = (refDisplay: string) => {
    if (document.querySelector('.weapon-group-detail-overlay')) return
    if (linesForDecodedRef(refDisplay).length === 0) return

    const overlay = makeEl('div', { className: 'entry-detail-overlay weapon-group-detail-overlay' })
    const box = makeEl('div', {
      className: 'entry-detail-box weapon-allot-detail-box weapon-group-detail-inner weapon-modal-10x5',
    })

    overlay.append(box)
    document.body.append(overlay)

    let sumEl: HTMLParagraphElement | null = null

    const tearDown = () => {
      document.removeEventListener('keydown', onEsc, true)
      if (overlay.isConnected) overlay.remove()
    }

    const updateGroupTotals = (gLines: WeaponAllotLine[]) => {
      let ts = 0,
        tc = 0,
        trcv = 0,
        tp = 0,
        td = 0
      for (const l of gLines) {
        ts += l.salePrice ?? 0
        tc += l.costPrice ?? 0
        trcv += l.cashReceived ?? l.salePrice ?? 0
        tp += lineProfit(l)
        td += lineDues(l)
      }
      const n = gLines.length
      const label = `${n} ${n === 1 ? 'entry' : 'entries'}`
      if (sumEl) {
        sumEl.innerHTML = `
          <span class="wad-stat"><b>${escHtml(label)}</b></span>
          <span class="wad-stat">Sale <b>${escHtml(formatRs(ts))}</b></span>
          <span class="wad-stat">Received <b>${escHtml(formatRs(trcv))}</b></span>
          <span class="wad-stat">Profit <b>${escHtml(formatRs(tp))}</b></span>
          <span class="wad-stat">Dues <b>${escHtml(formatRs(td))}</b></span>
          <span class="wad-stat">Cost <b>${escHtml(formatRs(tc))}</b></span>
        `
      }
    }

    const printGroupDetail = () => {
      const gLines = linesForDecodedRef(refDisplay)
      if (!gLines.length) return
      const sorted = gLines.slice().sort((a, b) => {
        const d = (a.entryDate || '').localeCompare(b.entryDate || '')
        if (d !== 0) return d
        return (a.weaponNumber || '').localeCompare(b.weaponNumber || '', undefined, { sensitivity: 'base' })
      })
      let ts = 0,
        trcv = 0,
        td = 0
      for (const l of sorted) {
        ts += l.salePrice ?? 0
        trcv += l.cashReceived ?? l.salePrice ?? 0
        td += lineDues(l)
      }

      const now = new Date()
      const printedAt = now.toLocaleString('en-US', { hour12: true })
      const periodLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()

      const doc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<title>${escAttr(`Client detail — ${refDisplay}`)}</title>
<style>
  @page{size:A4 portrait;margin:12mm;}
  :root{--ink:#0f172a;--mut:#475569;--line:#e2e8f0;--head:#0f4c81;--head2:#0b3a63;--panel:#f1f5f9;}
  *{box-sizing:border-box;}
  body{margin:0;background:#fff;color:var(--ink);font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .sheet{max-width:190mm;margin:0 auto;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#fff;}
  .top{display:flex;justify-content:space-between;gap:14px;padding:16px 16px 12px;background:linear-gradient(90deg,var(--head) 0%, var(--head2) 100%);color:#fff;}
  .brand{display:flex;align-items:center;gap:10px;min-width:0;}
  .logo{width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,.14);display:grid;place-items:center;flex-shrink:0;border:1px solid rgba(255,255,255,.2);}
  .brandtxt{min-width:0;}
  .brandname{font-weight:1000;letter-spacing:.12em;text-transform:uppercase;font-size:14px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .brandsub{opacity:.92;font-weight:800;font-size:11px;margin-top:4px;}
  .stmt{ text-align:right; }
  .stmt .t{font-weight:1000;letter-spacing:.08em;text-transform:uppercase;font-size:13px;}
  .stmt .p{opacity:.92;font-weight:900;font-size:11px;margin-top:4px;}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);background:linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);}
  .card{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--panel);}
  .kv{display:grid;grid-template-columns:110px 1fr;gap:6px 10px;font-size:11px;}
  .k{color:var(--mut);font-weight:800;}
  .v{font-weight:900;}
  table{width:100%;border-collapse:collapse;font-size:11px;}
  thead th{background:var(--head);color:#fff;font-weight:1000;text-transform:uppercase;letter-spacing:.05em;font-size:10px;padding:9px 10px;border-bottom:1px solid #083257;}
  tbody td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top;}
  tbody tr:nth-child(even) td{background:#fbfdff;}
  td.num{text-align:right;white-space:nowrap;}
  .wrap{padding:10px 16px 0;}
  .summary{margin:12px 16px 14px;border:1px solid var(--line);border-radius:10px;overflow:hidden;}
  .summary-h{background:var(--head);color:#fff;font-weight:1000;text-transform:uppercase;letter-spacing:.06em;font-size:11px;padding:8px 10px;}
  .summary-b{background:#fff;}
  .sum-row{display:flex;justify-content:space-between;gap:12px;padding:8px 10px;border-top:1px solid var(--line);font-weight:900;font-size:11px;}
  .sum-row:first-child{border-top:none;}
  .sum-row .lab{color:var(--mut);font-weight:900;}
  .sum-row .val{min-width:120px;text-align:right;}
  .foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding:12px 16px 16px;border-top:1px solid var(--line);background:#fff;}
  .note{font-size:10px;color:var(--mut);font-weight:700;line-height:1.35;max-width:65%;}
  .sig{min-width:140px;text-align:center;}
  .sig .line{height:1px;background:var(--mut);opacity:.6;margin:22px 0 6px;}
  .sig .lbl{font-size:10px;color:var(--mut);font-weight:800;}
</style>
</head><body>
  <div class="sheet">
    <div class="top">
      <div class="brand">
        <div class="logo" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M4 18.5L12 3l8 15.5" stroke="rgba(255,255,255,.95)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M7.5 14h9" stroke="rgba(255,255,255,.95)" stroke-width="2.2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="brandtxt">
          <div class="brandname">${escHtml(PRINT_INVOICE_SHOP.name)}</div>
          <div class="brandsub">${escHtml(PRINT_INVOICE_SHOP.phone)}</div>
        </div>
      </div>
      <div class="stmt">
        <div class="t">Monthly Statement</div>
        <div class="p">— ${escHtml(periodLabel)} —</div>
      </div>
    </div>

    <div class="info">
      <div class="card">
        <div class="kv">
          <div class="k">Customer name</div><div class="v">${escHtml(refDisplay)}</div>
          <div class="k">Printed</div><div class="v">${escHtml(printedAt)}</div>
          <div class="k">Entries</div><div class="v">${escHtml(String(sorted.length))}</div>
        </div>
      </div>
      <div class="card">
        <div class="kv">
          <div class="k">Statement type</div><div class="v">Weapon Allotment</div>
          <div class="k">Currency</div><div class="v">PKR</div>
          <div class="k">Software</div><div class="v">ESYSOFT</div>
        </div>
      </div>
    </div>

    <div class="wrap">
      <table>
        <thead><tr>
          <th style="width:34px">#</th>
          <th style="width:86px">Date</th>
          <th>Description</th>
          <th style="width:92px">Weapon No.</th>
          <th style="text-align:right;width:86px">Sale</th>
          <th style="text-align:right;width:108px">Cash Received</th>
          <th style="text-align:right;width:86px">Dues</th>
        </tr></thead>
        <tbody>
          ${sorted
            .map((l, i) => {
              const sale = l.salePrice ?? 0
              const recvRaw = l.cashReceived
              const recv = recvRaw === null ? sale : recvRaw ?? 0
              const dues = lineDues(l)
              return `<tr>
                <td>${i + 1}</td>
                <td>${escHtml(formatDateDisplay(l.entryDate))}</td>
                <td>${escHtml('Weapon entry')}</td>
                <td>${escHtml(l.weaponNumber.trim() || '—')}</td>
                <td class="num">${escHtml(formatRs(sale))}</td>
                <td class="num">${escHtml(formatRs(recv))}</td>
                <td class="num">${escHtml(formatRs(dues))}</td>
              </tr>`
            })
            .join('') || `<tr><td colspan="7">—</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="summary">
      <div class="summary-h">Summary</div>
      <div class="summary-b">
        <div class="sum-row"><span class="lab">Total Sale</span><span class="val">${escHtml(formatRs(ts))}</span></div>
        <div class="sum-row"><span class="lab">Total Received</span><span class="val">${escHtml(formatRs(trcv))}</span></div>
        <div class="sum-row"><span class="lab">Total Dues</span><span class="val">${escHtml(formatRs(td))}</span></div>
      </div>
    </div>

    <div class="foot">
      <div class="note">
        Important details shown in this statement are generated by the software.
        Please verify totals before record keeping.
      </div>
      <div class="sig">
        <div class="line"></div>
        <div class="lbl">Signature</div>
      </div>
    </div>
  </div>
</body></html>`

      printFullDocument(doc, 'a4')
    }

    const refillBodyRows = (): boolean => {
      const gLines = linesForDecodedRef(refDisplay)
      if (gLines.length === 0) return false
      const sorted = gLines.slice().sort((a, b) => {
        const d = b.entryDate.localeCompare(a.entryDate)
        if (d !== 0) return d
        return (a.weaponNumber || '').localeCompare(b.weaponNumber || '', undefined, { sensitivity: 'base' })
      })
      updateGroupTotals(sorted)
      const tbodyHost = box.querySelector<HTMLTableSectionElement>('.weapon-group-detail-tbody')
      if (!tbodyHost) return false
      tbodyHost.innerHTML = sorted
        .map((l) => {
          const recv = l.cashReceived ?? l.salePrice ?? 0
          return `<tr data-weapon-id="${escAttr(l.id)}">
        <td>${escHtml(formatDateDisplay(l.entryDate))}</td>
        <td>${escHtml(l.weaponNumber)}</td>
        <td>${formatRs(l.salePrice ?? 0)}</td>
        <td>${formatRs(recv)}</td>
        <td>${formatRs(lineProfit(l))}</td>
        <td>${formatRs(lineDues(l))}</td>
        <td class="weapon-group-modal-actions-cell">
          ${editIconBtnHtml('mini weapon-detail-edit-row', `data-weapon-detail-id="${escAttr(l.id)}"`)}
          ${deleteIconBtnHtml('mini mini-danger weapon-detail-delete-row', `data-weapon-detail-id="${escAttr(l.id)}"`)}
        </td>
      </tr>`
        })
        .join('')
      return true
    }

    sumEl = makeEl('p', { className: 'weapon-group-sum-line weapon-allot-detail-sums' })

    box.innerHTML = `
    <div class="entry-detail-hd weapon-detail-hd">
      <div class="entry-detail-title weapon-detail-title">${escHtml(refDisplay)}</div>
      <button type="button" class="mini entry-detail-x weapon-detail-close">✕</button>
    </div>
    <div class="entry-detail-body">
      <div class="weapon-group-sum-mount"></div>
      <div class="weapon-detail-toolbar">
        <button type="button" class="mini weapon-detail-print">Print</button>
      </div>
      <div class="weapon-allot-detail-table-wrap">
        <table class="entry-detail-table weapon-allot-detail-table weapon-group-lines-table">
          <thead><tr><th>Date</th><th>Weapon No.</th><th>Sale</th><th>Recv.</th><th>Profit</th><th>Dues</th><th>Action</th></tr></thead>
          <tbody class="weapon-group-detail-tbody"></tbody>
        </table>
      </div>
    </div>
    `
    box.querySelector('.weapon-group-sum-mount')?.replaceWith(sumEl)

    refillBodyRows()

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        tearDown()
      }
    }
    document.addEventListener('keydown', onEsc, true)
    box.querySelector('.entry-detail-x')?.addEventListener('click', tearDown)
    box.querySelector<HTMLButtonElement>('.weapon-detail-print')?.addEventListener('click', () => printGroupDetail())

    overlay.addEventListener('click', async (e: MouseEvent) => {
      if (e.target === overlay) {
        tearDown()
        return
      }
      const targ = e.target as HTMLElement | null
      if (!targ?.closest('.entry-detail-box')) return

      const ed = targ.closest('button.weapon-detail-edit-row')
      if (ed instanceof HTMLButtonElement) {
        const id = ed.getAttribute('data-weapon-detail-id')
        if (!id) return
        const line = loadWeaponAllotLines().find((x) => x.id === id)
        if (!line) return
        tearDown()
        loadWeaponLineIntoForm(line, id)
        return
      }
      const delBtn = targ.closest('button.weapon-detail-delete-row')
      if (delBtn instanceof HTMLButtonElement) {
        const id = delBtn.getAttribute('data-weapon-detail-id')
        if (!id) return
        const line = loadWeaponAllotLines().find((x) => x.id === id)
        if (!line) return
        const wn = line.weaponNumber.trim() || '(no weapon)'
        if (
          !(await confirmModal({
            title: 'Delete weapon line',
            message: `Delete this weapon line permanently?\n${wn}`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
          }))
        )
          return
        deleteWeaponLineQuiet(id)
        if (!linesForDecodedRef(refDisplay).length) tearDown()
        else refillBodyRows()
      }
    })
  }

  filt.querySelectorAll<HTMLButtonElement>('.allot-filt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      dateMode = (btn.getAttribute('data-mode') as WeaponDateMode) || 'monthly'
      setFiltActive()
      renderTable()
    })
  })
  applyBtn.addEventListener('click', () => {
    dateMode = 'range'
    setFiltActive()
    renderTable()
  })
  searchIn.addEventListener('input', () => renderTable())

  table.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    const viewBtn = t.closest('button.weapon-group-view')
    if (viewBtn) {
      e.stopPropagation()
      const refEnc = viewBtn.getAttribute('data-ref')
      if (!refEnc) return
      let refDecoded: string
      try {
        refDecoded = decodeURIComponent(refEnc)
      } catch {
        refDecoded = refEnc
      }
      openWeaponGroupEntriesModal(refDecoded)
    }
  })

  setFiltActive()
  renderTable()

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const cl = client.value.trim()
    const wn = weaponNumber.value.trim()
    if (!cl || !wn) {
      msg.textContent = 'Client and Weapon No. are required.'
      return
    }
    const sp = parseNumOrNull(salePrice.value)
    const cr = parseNumOrNull(cashReceived.value)
    const payload: Omit<WeaponAllotLine, 'id'> = {
      entryDate: entryDate.value || isoToday(),
      client: cl,
      weaponNumber: wn,
      costPrice: parseNumOrNull(costPrice.value),
      salePrice: sp,
      cashReceived: cr,
    }
    const all = loadWeaponAllotLines()
    if (editingWeaponId) {
      const ix = all.findIndex((x) => x.id === editingWeaponId)
      if (ix < 0) {
        msg.textContent = 'Record no longer exists.'
        clearEditing()
        renderTable()
        return
      }
      all[ix] = { ...all[ix], ...payload }
      saveWeaponAllotLines(all)
      msg.textContent = 'Updated.'
      clearEditing()
    } else {
      all.push({ id: cryptoId(), ...payload })
      saveWeaponAllotLines(all)
      msg.textContent = 'Saved.'
    }
    weaponNumber.value = ''
    costPrice.value = ''
    salePrice.value = ''
    cashReceived.value = ''
    updateLive()
    renderTable()
  })

  tableScroll.append(table)
  tableBlock.append(tableScroll)

  ensureWeaponAllotScrollResizeListener()
  wrap.append(head, form, filt, tableBlock)

  queueMicrotask(() => applyWeaponAllotScrollHeightPx(tableScroll))
  window.requestAnimationFrame(() => applyWeaponAllotScrollHeightPx(tableScroll))

  return wrap
}

type ExpenseLine = {
  id: string
  entryDate: string
  description: string
  amount: number
}

const EXPENSE_STORAGE_KEY = 'esysoft.expenses.v1'

type GeneralEntryKind = 'dues' | 'expense' | 'other'

type GeneralEntryLine = {
  id: string
  entryDate: string
  name: string
  description: string
  amount: number
  kind: GeneralEntryKind
  /** For kind=dues: already collected amount (<= amount). */
  collected?: number
}

const GENERAL_ENTRY_KEY = 'esysoft.generalEntry.v1'

function loadGeneralEntries(): GeneralEntryLine[] {
  try {
    const raw = localStorage.getItem(GENERAL_ENTRY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    let needPersist = false
    const out: GeneralEntryLine[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const r = item as Partial<GeneralEntryLine>
      const rawName = typeof r.name === 'string' ? r.name : ''
      const rawDescription = typeof r.description === 'string' ? r.description : ''
      const name = rawName.trim() || rawDescription.trim()
      const description = rawDescription.trim() || name
      const amount = typeof r.amount === 'number' ? r.amount : NaN
      if (!name || !Number.isFinite(amount)) continue
      const entryDate = typeof r.entryDate === 'string' && r.entryDate ? r.entryDate : isoToday()
      const id = typeof r.id === 'string' && r.id.length > 0 ? r.id : null
      const kind: GeneralEntryKind = r.kind === 'dues' || r.kind === 'expense' || r.kind === 'other' ? r.kind : 'other'
      let collected: number | undefined = undefined
      if (kind === 'dues') {
        const c = typeof r.collected === 'number' && Number.isFinite(r.collected) ? r.collected : 0
        collected = Math.max(0, Math.min(amount, c))
      }
      if (!id) {
        needPersist = true
        out.push({ id: cryptoId(), entryDate, name, description, amount, kind, collected })
      } else {
        if (!rawName.trim()) needPersist = true
        out.push({ id, entryDate, name, description, amount, kind, collected })
      }
    }
    if (needPersist) saveGeneralEntries(out)
    return out
  } catch {
    return []
  }
}

function saveGeneralEntries(rows: GeneralEntryLine[]) {
  localStorage.setItem(GENERAL_ENTRY_KEY, JSON.stringify(rows))
}

function generalDuesRemaining(r: GeneralEntryLine): number {
  if (r.kind !== 'dues') return 0
  const c = r.collected ?? 0
  return Math.max(0, r.amount - c)
}

/** Amount already collected on a general dues line. */
function generalDuesPaidAmount(r: GeneralEntryLine): number {
  if (r.kind !== 'dues') return 0
  return Math.min(r.amount, Math.max(0, r.collected ?? 0))
}

function generalEntryDisplayName(r: GeneralEntryLine): string {
  return (r.name || '').trim() || r.description.trim() || '—'
}

function generalEntryGroupKey(r: GeneralEntryLine): string {
  return generalEntryDisplayName(r).toLowerCase()
}

function loadExpenses(): ExpenseLine[] {
  try {
    const raw = localStorage.getItem(EXPENSE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    let needPersist = false
    const out: ExpenseLine[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const r = item as Partial<ExpenseLine>
      if (typeof r.description !== 'string' || typeof r.amount !== 'number' || !Number.isFinite(r.amount)) continue
      const entryDate = typeof r.entryDate === 'string' && r.entryDate ? r.entryDate : isoToday()
      const id = typeof r.id === 'string' && r.id.length > 0 ? r.id : null
      if (!id) {
        needPersist = true
        out.push({ id: cryptoId(), entryDate, description: r.description, amount: r.amount })
      } else {
        out.push({ id, entryDate, description: r.description, amount: r.amount })
      }
    }
    if (needPersist) saveExpenses(out)
    return out
  } catch {
    return []
  }
}

function saveExpenses(rows: ExpenseLine[]) {
  localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(rows))
}

function makeExpenseScreen(opts: { onBack: () => void }) {
  const wrap = makeEl('section', { className: 'entry entry-dark allot-screen allot-screen-expense' })
  const head = makeEl('div', { className: 'allot-head' })
  const back = makeEl('button', { className: 'mini back', attrs: { type: 'button' } }) as HTMLButtonElement
  back.textContent = '← Main Screen'
  back.addEventListener('click', () => opts.onBack())
  const title = makeEl('div', { className: 'allot-title', text: 'Expenses' })
  head.append(back, title)

  const form = makeEl('form', { className: 'allot-form' })
  const card = makeEl('div', { className: 'entry-card allot-card' })
  const mkField = (label: string, el: HTMLElement) => {
    const w = makeEl('label', { className: 'f' })
    w.append(makeEl('span', { className: 'fl', text: label }), el)
    return w
  }
  const input = (ph: string, attrs?: Record<string, string>) =>
    makeEl('input', { className: 'in', attrs: { placeholder: ph, ...attrs } }) as HTMLInputElement

  const entryDate = input('Date', { type: 'date' })
  entryDate.value = isoToday()
  const description = input('Description') as HTMLInputElement
  const amount = input('Amount', { inputmode: 'decimal' })

  const actions = makeEl('div', { className: 'allot-actions' })
  const saveBtn = makeEl('button', { className: 'btn primary allot-save', attrs: { type: 'submit' } }) as HTMLButtonElement
  saveBtn.textContent = 'Save'
  const cancelBtn = makeEl('button', { className: 'btn ghost', attrs: { type: 'button' } }) as HTMLButtonElement
  cancelBtn.textContent = 'Clear'
  cancelBtn.addEventListener('click', () => {
    clearEditing()
    msg.textContent = ''
  })
  actions.append(saveBtn, cancelBtn)
  const msg = makeEl('div', { className: 'entry-msg', attrs: { role: 'status' } })

  const kicker = makeEl('div', { className: 'allot-kicker', text: 'New expense' })

  let editingId: string | null = null
  const clearEditing = () => {
    editingId = null
    kicker.textContent = 'New expense'
    saveBtn.textContent = 'Save'
    description.value = ''
    amount.value = ''
    entryDate.value = isoToday()
  }

  const fieldGrid = makeEl('div', { className: 'allot-fields allot-fields-exp' })
  fieldGrid.append(
    mkField('Date (old entry allowed)', entryDate),
    mkField('Description', description),
    mkField('Amount', amount),
  )
  card.append(kicker, fieldGrid, actions, msg)

  form.append(card)

  const tableScroll = makeEl('div', {
    className: 'allot-table-scroll allot-table-scroll-expense',
    attrs: { 'aria-label': 'Expense list' },
  })
  const table = makeEl('div', { className: 'table allot-table' })
  table.innerHTML = `
    <table>
      <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Action</th></tr></thead>
      <tbody></tbody>
    </table>
  `
  const tbody = table.querySelector<HTMLTableSectionElement>('tbody')
  tableScroll.append(table)
  const foot = makeEl('div', { className: 'allot-foot' })
  const sums = makeEl('div', { className: 'allot-sums', text: '' })
  foot.append(sums)

  const renderRows = () => {
    const rows = loadExpenses().slice().reverse()
    const esc = (s: string) => s.replaceAll('<', '&lt;')
    const html = rows
      .map(
        (r) =>
          `<tr><td>${formatDateDisplay(r.entryDate)}</td><td>${esc(r.description)}</td><td>${formatRs(r.amount)}</td><td class="expense-actions">${editIconBtnHtml('mini expense-edit-row', `data-expense-id="${escAttr(r.id)}"`)}${deleteIconBtnHtml('mini mini-danger expense-delete-row', `data-expense-id="${escAttr(r.id)}"`)}</td></tr>`,
      )
      .join('')
    if (tbody) tbody.innerHTML = html || `<tr><td colspan="4" class="empty">No expenses yet.</td></tr>`
    const sumAll = loadExpenses().reduce((a, r) => a + r.amount, 0)
    sums.textContent = `Total expenses: ${formatRs(sumAll)}`
  }

  const startEdit = (id: string) => {
    const r = loadExpenses().find((x) => x.id === id)
    if (!r) return
    editingId = id
    entryDate.value = r.entryDate
    description.value = r.description
    amount.value = String(Math.round(r.amount * 100) / 100)
    kicker.textContent = 'Edit expense'
    saveBtn.textContent = 'Update'
    msg.textContent = ''
  }

  tableScroll.addEventListener('click', async (ev) => {
    const targ = ev.target
    if (!(targ instanceof Element)) return
    const ed = targ.closest('button.expense-edit-row')
    if (ed instanceof HTMLButtonElement) {
      const id = ed.getAttribute('data-expense-id')
      if (id) startEdit(id)
      return
    }
    const delBtn = targ.closest('button.expense-delete-row')
    if (delBtn instanceof HTMLButtonElement) {
      const id = delBtn.getAttribute('data-expense-id')
      if (!id) return
      const row = loadExpenses().find((x) => x.id === id)
      const preview = row ? `${formatDateDisplay(row.entryDate)} — ${row.description}`.slice(0, 80) : ''
      if (
        !(await confirmModal({
          title: 'Delete expense',
          message: `Delete this expense?\n${preview}`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          variant: 'danger',
        }))
      )
        return
      const next = loadExpenses().filter((x) => x.id !== id)
      saveExpenses(next)
      if (editingId === id) {
        clearEditing()
        msg.textContent = ''
      }
      renderRows()
    }
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const desc = description.value.trim()
    const am = parseNumOrNull(amount.value)
    if (!desc || am === null) {
      msg.textContent = 'Description and amount are required.'
      return
    }
    if (editingId) {
      const all = loadExpenses()
      const ix = all.findIndex((x) => x.id === editingId)
      if (ix === -1) {
        msg.textContent = 'Entry not found.'
        clearEditing()
        renderRows()
        return
      }
      all[ix] = {
        id: editingId,
        entryDate: entryDate.value || isoToday(),
        description: desc,
        amount: am,
      }
      saveExpenses(all)
      msg.textContent = 'Updated.'
      clearEditing()
      renderRows()
      return
    }
    const row: ExpenseLine = {
      id: cryptoId(),
      entryDate: entryDate.value || isoToday(),
      description: desc,
      amount: am,
    }
    const all = loadExpenses()
    all.push(row)
    saveExpenses(all)
    msg.textContent = 'Saved.'
    description.value = ''
    amount.value = ''
    entryDate.value = isoToday()
    renderRows()
  })

  renderRows()
  wrap.append(head, form, tableScroll, foot)

  ensureExpenseListScrollResizeListener()
  queueMicrotask(() => applyExpenseListScrollHeightPx(tableScroll))
  window.requestAnimationFrame(() => applyExpenseListScrollHeightPx(tableScroll))

  return wrap
}

function makeGeneralEntryScreen(opts: { onBack: () => void }) {
  const wrap = makeEl('section', { className: 'entry entry-dark allot-screen allot-screen-general' })
  const head = makeEl('div', { className: 'allot-head' })
  const back = makeEl('button', { className: 'mini back', attrs: { type: 'button' } }) as HTMLButtonElement
  back.textContent = '← Main Screen'
  back.addEventListener('click', () => opts.onBack())
  const title = makeEl('div', { className: 'allot-title', text: 'Genral Entry' })
  head.append(back, title)

  const form = makeEl('form', { className: 'allot-form' })
  const card = makeEl('div', { className: 'entry-card allot-card' })
  const mkField = (label: string, el: HTMLElement) => {
    const w = makeEl('label', { className: 'f' })
    w.append(makeEl('span', { className: 'fl', text: label }), el)
    return w
  }
  const input = (ph: string, attrs?: Record<string, string>) =>
    makeEl('input', { className: 'in', attrs: { placeholder: ph, ...attrs } }) as HTMLInputElement

  const entryDate = input('Date', { type: 'date' })
  entryDate.value = isoToday()
  const name = input('Name', { maxlength: '80' })
  const description = input('Details (e.g. Imran ko 500 diye)', { maxlength: '140' })
  const amount = input('Amount', { inputmode: 'decimal' })
  const kind = makeEl('select', { className: 'in', attrs: { 'aria-label': 'Type' } }) as HTMLSelectElement
  kind.innerHTML = `
    <option value="dues">Dues</option>
    <option value="expense">Expense</option>
    <option value="other">Other</option>
  `

  const actions = makeEl('div', { className: 'allot-actions' })
  const saveBtn = makeEl('button', { className: 'btn primary allot-save', attrs: { type: 'submit' } }) as HTMLButtonElement
  saveBtn.textContent = 'Save'
  const cancelBtn = makeEl('button', { className: 'btn ghost', attrs: { type: 'button' } }) as HTMLButtonElement
  cancelBtn.textContent = 'Clear'
  const msg = makeEl('div', { className: 'entry-msg', attrs: { role: 'status' } })
  actions.append(saveBtn, cancelBtn)

  const kicker = makeEl('div', { className: 'allot-kicker', text: 'New general entry' })
  let editingId: string | null = null

  const clearEditing = () => {
    editingId = null
    kicker.textContent = 'New general entry'
    saveBtn.textContent = 'Save'
    entryDate.value = isoToday()
    name.value = ''
    description.value = ''
    amount.value = ''
    kind.value = 'dues'
  }
  cancelBtn.addEventListener('click', () => {
    clearEditing()
    msg.textContent = ''
  })

  const rowTop = makeEl('div', { className: 'allot-fields allot-fields-general-top' })
  rowTop.append(
    mkField('Date', entryDate),
    mkField('Name', name),
    mkField('Details', description),
    mkField('Amount', amount),
  )
  const rowBottom = makeEl('div', { className: 'allot-general-form-bottom' })
  rowBottom.append(mkField('Type', kind), actions)
  card.append(kicker, rowTop, rowBottom, msg)
  form.append(card)

  const tableScroll = makeEl('div', {
    className: 'allot-table-scroll allot-table-scroll-general',
    attrs: { 'aria-label': 'General entry list' },
  })

  const table = makeEl('div', { className: 'table allot-table allot-table-general' })
  table.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th><th>Entries</th><th>Latest Date</th><th style="text-align:right">Total Amount</th><th style="text-align:right">Remaining</th><th>Action</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `
  const tbody = table.querySelector<HTMLTableSectionElement>('tbody')
  tableScroll.append(table)

  const rowsForNameKey = (nameKey: string) =>
    loadGeneralEntries().filter((r) => generalEntryGroupKey(r) === nameKey)

  const startEdit = (cur: GeneralEntryLine) => {
    editingId = cur.id
    kicker.textContent = 'Edit general entry'
    saveBtn.textContent = 'Save changes'
    entryDate.value = cur.entryDate || isoToday()
    name.value = generalEntryDisplayName(cur)
    description.value = cur.description
    amount.value = String(cur.amount)
    kind.value = cur.kind
    msg.textContent = ''
  }

  const deleteRowById = async (id: string) => {
    const all = loadGeneralEntries()
    const cur = all.find((x) => x.id === id)
    if (!cur) return false
    if (
      !(await confirmModal({
        title: 'Delete general entry',
        message: `Delete this record?\n${generalEntryDisplayName(cur)} · ${formatDateDisplay(cur.entryDate)}`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
      }))
    )
      return false
    saveGeneralEntries(all.filter((x) => x.id !== id))
    if (editingId === id) clearEditing()
    msg.textContent = 'Deleted.'
    renderRows()
    return true
  }

  const openGeneralNameDetailModal = (nameKey: string) => {
    if (document.querySelector('.general-name-detail-overlay')) return
    const current = rowsForNameKey(nameKey)
    if (!current.length) return

    const overlay = makeEl('div', { className: 'entry-detail-overlay general-name-detail-overlay' })
    const box = makeEl('div', {
      className: 'entry-detail-box weapon-allot-detail-box general-name-detail-box',
    })
    overlay.append(box)
    document.body.append(overlay)

    const label = generalEntryDisplayName(current[0])
    let sumEl: HTMLParagraphElement | null = null

    const tearDown = () => {
      document.removeEventListener('keydown', onEsc, true)
      if (overlay.isConnected) overlay.remove()
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      tearDown()
    }

    const updateTotals = (rows: GeneralEntryLine[]) => {
      const total = rows.reduce((s, r) => s + r.amount, 0)
      const remaining = rows.reduce((s, r) => s + generalDuesRemaining(r), 0)
      const duesCount = rows.filter((r) => r.kind === 'dues').length
      if (sumEl) {
        sumEl.innerHTML = `
          <span class="wad-stat"><b>${escHtml(String(rows.length))}</b> entries</span>
          <span class="wad-stat">Dues lines <b>${escHtml(String(duesCount))}</b></span>
          <span class="wad-stat">Total <b>${escHtml(formatRs(total))}</b></span>
          <span class="wad-stat">Remaining <b>${escHtml(formatRs(remaining))}</b></span>
        `
      }
    }

    const refillBodyRows = (): boolean => {
      const rows = rowsForNameKey(nameKey).sort((a, b) => {
        const d = (b.entryDate || '').localeCompare(a.entryDate || '')
        if (d !== 0) return d
        return a.id.localeCompare(b.id)
      })
      if (!rows.length) return false
      updateTotals(rows)
      const tbodyHost = box.querySelector<HTMLTableSectionElement>('.general-name-detail-tbody')
      if (!tbodyHost) return false
      tbodyHost.innerHTML = rows
        .map((r) => {
          const rem = r.kind === 'dues' ? generalDuesRemaining(r) : 0
          return `<tr data-general-id="${escAttr(r.id)}">
            <td>${escHtml(formatDateDisplay(r.entryDate))}</td>
            <td>${escHtml(r.description.trim() || generalEntryDisplayName(r))}</td>
            <td>${escHtml(r.kind)}</td>
            <td style="text-align:right">${formatRs(r.amount)}</td>
            <td style="text-align:right">${r.kind === 'dues' ? formatRs(rem) : '—'}</td>
            <td class="weapon-group-modal-actions-cell">
              ${editIconBtnHtml('mini general-detail-edit-row', `data-general-detail-id="${escAttr(r.id)}"`)}
              ${deleteIconBtnHtml('mini mini-danger general-detail-delete-row', `data-general-detail-id="${escAttr(r.id)}"`)}
            </td>
          </tr>`
        })
        .join('')
      return true
    }

    sumEl = makeEl('p', { className: 'weapon-group-sum-line weapon-allot-detail-sums general-name-detail-sums' })
    box.innerHTML = `
      <div class="entry-detail-hd weapon-detail-hd">
        <div class="entry-detail-title weapon-detail-title">${escHtml(label)}</div>
        <button type="button" class="mini entry-detail-x general-detail-close">✕</button>
      </div>
      <div class="entry-detail-body">
        <div class="general-name-sum-mount"></div>
        <div class="weapon-allot-detail-table-wrap">
          <table class="entry-detail-table weapon-allot-detail-table general-name-detail-table">
            <thead><tr><th>Date</th><th>Details</th><th>Type</th><th>Amount</th><th>Remaining</th><th>Action</th></tr></thead>
            <tbody class="general-name-detail-tbody"></tbody>
          </table>
        </div>
      </div>
    `
    box.querySelector('.general-name-sum-mount')?.replaceWith(sumEl)
    refillBodyRows()

    document.addEventListener('keydown', onEsc, true)
    box.querySelector('.entry-detail-x')?.addEventListener('click', tearDown)
    overlay.addEventListener('click', async (e: MouseEvent) => {
      if (e.target === overlay) {
        tearDown()
        return
      }
      const targ = e.target as HTMLElement | null
      if (!targ?.closest('.entry-detail-box')) return

      const ed = targ.closest('button.general-detail-edit-row')
      if (ed instanceof HTMLButtonElement) {
        const id = ed.getAttribute('data-general-detail-id')
        if (!id) return
        const line = loadGeneralEntries().find((x) => x.id === id)
        if (!line) return
        tearDown()
        startEdit(line)
        return
      }
      const delBtn = targ.closest('button.general-detail-delete-row')
      if (delBtn instanceof HTMLButtonElement) {
        const id = delBtn.getAttribute('data-general-detail-id')
        if (!id) return
        const deleted = await deleteRowById(id)
        if (!deleted) return
        if (!rowsForNameKey(nameKey).length) tearDown()
        else refillBodyRows()
      }
    })
  }

  const renderRows = () => {
    const rows = loadGeneralEntries()
    if (!tbody) return
    const groups = new Map<string, GeneralEntryLine[]>()
    for (const r of rows) {
      const key = generalEntryGroupKey(r)
      const list = groups.get(key) ?? []
      list.push(r)
      groups.set(key, list)
    }
    const ordered = [...groups.entries()].sort((a, b) => {
      const latestA = a[1].reduce((m, r) => (r.entryDate > m ? r.entryDate : m), '')
      const latestB = b[1].reduce((m, r) => (r.entryDate > m ? r.entryDate : m), '')
      return latestB.localeCompare(latestA) || generalEntryDisplayName(a[1][0]).localeCompare(generalEntryDisplayName(b[1][0]), undefined, { sensitivity: 'base' })
    })
    tbody.innerHTML =
      ordered
        .map(([key, list]) => {
          const latest = list.reduce((m, r) => (r.entryDate > m ? r.entryDate : m), '')
          const total = list.reduce((s, r) => s + r.amount, 0)
          const remaining = list.reduce((s, r) => s + generalDuesRemaining(r), 0)
          const count = list.length
          return `<tr class="general-name-row" tabindex="0" data-name-key="${escAttr(encodeURIComponent(key))}" title="Double-click for detail">
            <td>${escHtml(generalEntryDisplayName(list[0]))}</td>
            <td>${count} ${count === 1 ? 'entry' : 'entries'}</td>
            <td>${escHtml(formatDateDisplay(latest))}</td>
            <td style="text-align:right">${formatRs(total)}</td>
            <td style="text-align:right">${remaining > 0 ? formatRs(remaining) : '—'}</td>
            <td class="td-actions">
              <button type="button" class="btn primary sm btn-eye general-name-detail-btn" data-name-key="${escAttr(encodeURIComponent(key))}" data-act="detail" aria-label="Show detail" title="Show detail">${ICON_EYE}</button>
            </td>
          </tr>`
        })
        .join('') || `<tr><td colspan="6" class="empty">No records yet.</td></tr>`
  }

  table.addEventListener('click', async (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]')
    if (!b) return
    const act = b.getAttribute('data-act')
    if (!act) return
    if (act === 'detail') {
      const enc = b.getAttribute('data-name-key')
      if (!enc) return
      let key = enc
      try {
        key = decodeURIComponent(enc)
      } catch {
        key = enc
      }
      openGeneralNameDetailModal(key)
    }
  })

  table.addEventListener('dblclick', (ev) => {
    const tr = (ev.target as HTMLElement).closest<HTMLTableRowElement>('tr[data-name-key]')
    const enc = tr?.getAttribute('data-name-key')
    if (!enc) return
    let key = enc
    try {
      key = decodeURIComponent(enc)
    } catch {
      key = enc
    }
    openGeneralNameDetailModal(key)
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const entryName = name.value.trim()
    const desc = description.value.trim() || entryName
    const am = parseNumOrNull(amount.value)
    const k = (kind.value as GeneralEntryKind) || 'other'
    if (!entryName) {
      msg.textContent = 'Name required.'
      return
    }
    if (am === null || am <= 0) {
      msg.textContent = 'Enter valid amount.'
      return
    }
    const all = loadGeneralEntries()
    if (editingId) {
      const ix = all.findIndex((x) => x.id === editingId)
      if (ix < 0) {
        msg.textContent = 'Record not found.'
        clearEditing()
        renderRows()
        return
      }
      const prev = all[ix]
      const prevCollected = prev.kind === 'dues' ? prev.collected ?? 0 : 0
      const nextCollected = k === 'dues' ? Math.max(0, Math.min(am, prevCollected)) : undefined
      all[ix] = { ...prev, entryDate: entryDate.value || isoToday(), name: entryName, description: desc, amount: am, kind: k, collected: nextCollected }
      saveGeneralEntries(all)
      msg.textContent = 'Updated.'
      clearEditing()
      renderRows()
      return
    }
    const row: GeneralEntryLine = {
      id: cryptoId(),
      entryDate: entryDate.value || isoToday(),
      name: entryName,
      description: desc,
      amount: am,
      kind: k,
      collected: k === 'dues' ? 0 : undefined,
    }
    all.push(row)
    saveGeneralEntries(all)
    msg.textContent = 'Saved.'
    clearEditing()
    renderRows()
  })

  renderRows()
  wrap.append(head, form, tableScroll)

  ensureGeneralEntryListScrollResizeListener()
  queueMicrotask(() => applyGeneralEntryListScrollHeightPx(tableScroll))
  window.requestAnimationFrame(() => applyGeneralEntryListScrollHeightPx(tableScroll))

  return wrap
}

type DuesRow = {
  kind: 'app' | 'weapon' | 'general'
  /** App: `appDuesGroupKey`; weapon: client map key (trimmed or "(No client)") */
  groupKey: string
  count: number
  nameRef: string
  cnic: string
  /** App: reference; weapon: client; general: description (dues list column). */
  referenceOta: string
  totalDues: number
}

function entryLineDues(e: Entry) {
  return computeDues(e.salePrice, e.cashReceived)
}

/** Days left in a reminder window from entry date, or null if window not set. */
function reminderWindowRemaining(entryDate: string, windowDays: number | null): number | null {
  if (windowDays == null || windowDays <= 0) return null
  const elapsed = Math.max(0, calendarDaysBetweenIso(entryDate, isoToday()))
  return windowDays - elapsed
}

/** Urgent entries with at most 7 days left in the urgent window (or overdue). */
function buildUrgentReminderEntries(): Entry[] {
  return loadEntries().filter((e) => {
    if (e.manuallyCompleted || e.urgency !== 'urgent') return false
    const r = reminderWindowRemaining(e.entryDate, e.urgentDays)
    return r !== null && r <= 7
  })
}

/** "Other" reminder entries with at most 7 days left in the other window (or overdue). */
function buildOtherReminderEntries(): Entry[] {
  return loadEntries().filter((e) => {
    if (e.manuallyCompleted || e.urgency !== 'other') return false
    const r = reminderWindowRemaining(e.entryDate, e.otherReminderDays)
    return r !== null && r <= 7
  })
}

/** Dashboard Warning tile: same rule as startup reminder (urgent or other, ≤7 days). */
function entryCountsForDashboardWarning(e: Entry): boolean {
  if (e.manuallyCompleted) return false
  if (e.urgency === 'urgent') {
    const r = reminderWindowRemaining(e.entryDate, e.urgentDays)
    return r !== null && r <= 7
  }
  if (e.urgency === 'other') {
    const r = reminderWindowRemaining(e.entryDate, e.otherReminderDays)
    return r !== null && r <= 7
  }
  return false
}

function loadAppDuesGroup(groupKey: string): Entry[] {
  return loadEntries().filter((e) => appDuesGroupKey(e) === groupKey && entryLineDues(e) > 0)
}

function loadWeaponDuesGroup(clientKey: string): WeaponAllotLine[] {
  return loadWeaponAllotLines().filter((l) => {
    const k = (l.client || '').trim() || '(No client)'
    return k === clientKey && lineDues(l) > 0
  })
}

function applyCollectionToEntries(entries: Entry[], amount: number): Entry[] {
  let left = amount
  const sorted = entries
    .slice()
    .sort((a, b) => (a.entryDate || '').localeCompare(b.entryDate || '') || a.id.localeCompare(b.id))
  return sorted.map((e) => {
    const copy = { ...e }
    if (left <= 0) return copy
    const d = entryLineDues(copy)
    if (d <= 0) return copy
    const pay = Math.min(d, left)
    const prev = copy.cashReceived
    const base = prev ?? 0
    copy.cashReceived = base + pay
    copy.totalDues = computeDues(copy.salePrice, copy.cashReceived)
    left -= pay
    return copy
  })
}

function mergeEntriesById(updated: Entry[]) {
  const map = new Map(updated.map((e) => [e.id, e]))
  const all = loadEntries().map((e) => map.get(e.id) ?? e)
  saveEntries(all)
}

function applyCollectionToWeaponLines(lines: WeaponAllotLine[], amount: number): WeaponAllotLine[] {
  let left = amount
  const sorted = lines.slice().sort((a, b) => a.entryDate.localeCompare(b.entryDate))
  return sorted.map((l) => {
    const copy = { ...l }
    if (left <= 0) return copy
    const d = lineDues(copy)
    if (d <= 0) return copy
    const pay = Math.min(d, left)
    const base = copy.cashReceived ?? 0
    copy.cashReceived = base + pay
    left -= pay
    return copy
  })
}

function mergeWeaponLinesById(updated: WeaponAllotLine[]) {
  const map = new Map(updated.map((l) => [l.id, l]))
  const all = loadWeaponAllotLines().map((l) => map.get(l.id) ?? l)
  saveWeaponAllotLines(all)
}

function applyCollectionToGeneral(entries: GeneralEntryLine[], amount: number): GeneralEntryLine[] {
  let left = amount
  const sorted = entries
    .slice()
    .sort((a, b) => (a.entryDate || '').localeCompare(b.entryDate || '') || a.id.localeCompare(b.id))
  return sorted.map((e) => {
    const copy: GeneralEntryLine = { ...e }
    if (left <= 0) return copy
    const d = generalDuesRemaining(copy)
    if (d <= 0) return copy
    const pay = Math.min(d, left)
    const base = copy.collected ?? 0
    copy.collected = base + pay
    left -= pay
    return copy
  })
}

function mergeGeneralEntriesById(updated: GeneralEntryLine[]) {
  const map = new Map(updated.map((e) => [e.id, e]))
  const all = loadGeneralEntries().map((e) => map.get(e.id) ?? e)
  saveGeneralEntries(all)
}

type DuesPaymentLog = {
  id: string
  kind: 'app' | 'weapon' | 'general'
  groupKey: string
  amount: number
  paidAt: string
  note?: string
}

const DUES_PAYMENTS_KEY = 'esysoft.duesPayments.v1'

function loadDuesPaymentLogs(): DuesPaymentLog[] {
  try {
    const raw = localStorage.getItem(DUES_PAYMENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as DuesPaymentLog[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveDuesPaymentLogs(logs: DuesPaymentLog[]) {
  localStorage.setItem(DUES_PAYMENTS_KEY, JSON.stringify(logs))
}

const BACKUP_FORMAT_VERSION = 1

function allBackupStorageKeys(): string[] {
  return [
    ENTRY_STORAGE_KEY,
    WEAPON_ALLOT_KEY,
    EXPENSE_STORAGE_KEY,
    GENERAL_ENTRY_KEY,
    DUES_PAYMENTS_KEY,
    RECYCLE_STORAGE_KEY,
    PIN_STORAGE_KEY,
    THEME_STORAGE_KEY,
  ]
}

function buildBackupObject() {
  const keys: Record<string, string | null> = {}
  for (const k of allBackupStorageKeys()) {
    keys[k] = localStorage.getItem(k)
  }
  return {
    format: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'EsySoft_HayatBrothers',
    keys,
  }
}

async function downloadBackupDbFile(): Promise<string> {
  const payload = buildBackupObject()
  const text = JSON.stringify(payload, null, 2)
  const suggestedName = `esysoft_hayat_${new Date().toISOString().slice(0, 10)}.db`

  const w = window as unknown as {
    showSaveFilePicker?: (options: {
      suggestedName?: string
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<{ createWritable: () => Promise<{ write: (data: Blob | string) => Promise<void>; close: () => Promise<void> }> }>
  }
  if (typeof w.showSaveFilePicker === 'function') {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'EsySoft backup',
            accept: { 'application/json': ['.db', '.json'] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(new Blob([text], { type: 'application/json' }))
      await writable.close()
      return 'Backup saved to the file you chose.'
    } catch (e) {
      const err = e as { name?: string }
      if (err?.name === 'AbortError') return ''
    }
  }

  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = suggestedName
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.append(a)
  a.click()
  window.setTimeout(() => {
    URL.revokeObjectURL(url)
    a.remove()
  }, 2500)
  let clip = ''
  try {
    await navigator.clipboard.writeText(text)
    clip = ' Backup text is also on the clipboard — paste into Notepad and Save as .db if the file did not download.'
  } catch {
    /* ignore */
  }
  return `Download started.${clip}`
}

function restoreFromBackupText(text: string): { ok: boolean; message: string } {
  try {
    const obj = JSON.parse(text) as { keys?: Record<string, string | null> }
    if (!obj.keys || typeof obj.keys !== 'object') {
      return { ok: false, message: 'Invalid backup file (missing keys).' }
    }
    for (const [k, v] of Object.entries(obj.keys)) {
      if (v === null || v === undefined) localStorage.removeItem(k)
      else localStorage.setItem(k, v)
    }
    return { ok: true, message: 'Backup restored. Reloading…' }
  } catch {
    return { ok: false, message: 'Could not read backup file.' }
  }
}

function appendDuesPaymentLog(
  kind: 'app' | 'weapon' | 'general',
  groupKey: string,
  amount: number,
  note?: string,
) {
  const all = loadDuesPaymentLogs()
  const trimmed = (note ?? '').trim()
  all.push({
    id: cryptoId(),
    kind,
    groupKey,
    amount,
    paidAt: new Date().toISOString(),
    ...(trimmed ? { note: trimmed } : {}),
  })
  saveDuesPaymentLogs(all)
}


function duesPaymentLogDateIso(paidAt: string): string {
  const d = new Date(paidAt)
  if (!Number.isNaN(d.getTime())) {
    const p = (x: number) => String(x).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  }
  return (paidAt || '').slice(0, 10)
}

function duesPaymentLogInRange(log: DuesPaymentLog, fromIso: string, toIso: string): boolean {
  const d = duesPaymentLogDateIso(log.paidAt)
  if (!fromIso || !toIso) return true
  return d >= fromIso && d <= toIso
}

async function promptDateRangeModal(opts: {
  title: string
  subtitle?: string
}): Promise<{ fromIso: string; toIso: string } | null> {
  document.querySelector('.confirm-overlay')?.remove()
  const today = isoToday()
  const d = new Date()
  const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  const overlay = makeEl('div', { className: 'confirm-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } })
  const card = makeEl('div', { className: 'confirm-card' })
  overlay.append(card)
  card.innerHTML = `
    <div class="confirm-hd"><div class="confirm-title">${escHtml(opts.title)}</div></div>
    <div class="confirm-bd">
      ${opts.subtitle ? `<div class="confirm-msg">${escHtml(opts.subtitle)}</div>` : ''}
      <div class="dues-print-range-fields">
        <label class="dues-print-range-lbl"><span>From</span><input type="date" class="in dues-print-from" value="${escAttr(monthStart)}" /></label>
        <label class="dues-print-range-lbl"><span>To</span><input type="date" class="in dues-print-to" value="${escAttr(today)}" /></label>
      </div>
      <div class="dues-print-range-err" role="alert"></div>
    </div>
    <div class="confirm-actions">
      <button type="button" class="btn ghost confirm-cancel">${escHtml('Cancel')}</button>
      <button type="button" class="btn primary confirm-ok">${escHtml('Print')}</button>
    </div>`
  document.body.append(overlay)
  queueMicrotask(() => overlay.classList.add('is-open'))
  const fromIn = card.querySelector<HTMLInputElement>('.dues-print-from')
  const toIn = card.querySelector<HTMLInputElement>('.dues-print-to')
  const errEl = card.querySelector<HTMLDivElement>('.dues-print-range-err')
  const okBtn = card.querySelector<HTMLButtonElement>('.confirm-ok')
  const cancelBtn = card.querySelector<HTMLButtonElement>('.confirm-cancel')
  const tearDown = async () => {
    overlay.classList.remove('is-open')
    await sleepMs(140)
    overlay.remove()
  }
  return await new Promise<{ fromIso: string; toIso: string } | null>((resolve) => {
    const finish = async (result: { fromIso: string; toIso: string } | null) => {
      window.removeEventListener('keydown', onKey)
      await tearDown()
      resolve(result)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void finish(null)
    }
    const tryPrint = () => {
      const fromIso = (fromIn?.value ?? '').trim()
      const toIso = (toIn?.value ?? '').trim()
      if (!fromIso || !toIso) {
        if (errEl) errEl.textContent = 'From aur To dono dates select karein.'
        return
      }
      if (fromIso > toIso) {
        if (errEl) errEl.textContent = 'From date, To se zyada nahi ho sakti.'
        return
      }
      if (errEl) errEl.textContent = ''
      void finish({ fromIso, toIso })
    }
    window.addEventListener('keydown', onKey)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) void finish(null)
    })
    okBtn?.addEventListener('click', tryPrint)
    cancelBtn?.addEventListener('click', () => void finish(null))
    queueMicrotask(() => fromIn?.focus())
  })
}

type ClientDuesLedgerRow = {
  sortAt: string
  date: string
  nameRef: string
  /** Client detail: gen → Name; appl → Reference; wepl → Client */
  colName: string
  colReference: string
  colClient: string
  note: string
  /** Customer par charge / qardan (balance barhta hai) */
  debit: number | null
  /** Wasool / payment (balance kam hota hai) */
  credit: number | null
  /** Application / weapon allot / general — client detail print */
  srcTag?: 'appl' | 'gen' | 'wepl'
  /** Source record still has pending dues (Name / Reference / Client row highlight). */
  hasOpenDues?: boolean
  /** Application / weapon / general record id — per-row received & balance. */
  sourceId?: string
  /** Total received on source entry (sale − remaining dues). */
  rowReceived?: number | null
  /** Remaining dues on source entry. */
  rowBalance?: number | null
}

const LEDGER_COL_DASH = '—'

function ledgerRowCols(
  srcTag: 'appl' | 'gen' | 'wepl',
  fields: {
    entryName?: string
    reference?: string
    client?: string
    generalName?: string
  },
): { colName: string; colReference: string; colClient: string } {
  if (srcTag === 'appl') {
    const ref =
      (fields.reference || '').trim() ||
      [fields.entryName, fields.reference].map((x) => (x || '').trim()).filter(Boolean)[0] ||
      LEDGER_COL_DASH
    return { colName: LEDGER_COL_DASH, colReference: ref, colClient: LEDGER_COL_DASH }
  }
  if (srcTag === 'wepl') {
    const cl = (fields.client || '').trim() || LEDGER_COL_DASH
    return { colName: LEDGER_COL_DASH, colReference: LEDGER_COL_DASH, colClient: cl }
  }
  const nm = (fields.generalName || fields.entryName || '').trim() || LEDGER_COL_DASH
  return { colName: nm, colReference: LEDGER_COL_DASH, colClient: LEDGER_COL_DASH }
}

function appEntryReferenceLabel(e: Entry): string {
  const name = (e.name || '').trim()
  const cnic = formatCnicDigits(e.cnic).trim()
  const ref = (e.reference || '').trim()
  const parts: string[] = []
  if (name && cnic) parts.push(`${name} · ${cnic}`)
  else if (name) parts.push(name)
  else if (cnic) parts.push(cnic)
  if (ref && ref !== name && !parts.some((p) => p === ref || p.endsWith(ref))) parts.push(ref)
  for (const x of [e.category, e.trackingId].map((s) => s.trim()).filter(Boolean)) {
    if (!parts.some((p) => p.includes(x))) parts.push(x)
  }
  return parts.join(' · ') || LEDGER_COL_DASH
}

function ledgerEntryAmounts(
  srcTag: 'appl' | 'wepl' | 'gen',
  sourceId: string,
): { received: number; balance: number } | null {
  if (srcTag === 'appl') {
    const e = loadEntries().find((x) => x.id === sourceId)
    if (!e) return null
    return {
      received: Math.round(entryPaidTowardSale(e) * 100) / 100,
      balance: Math.round(entryLineDues(e) * 100) / 100,
    }
  }
  if (srcTag === 'wepl') {
    const l = loadWeaponAllotLines().find((x) => x.id === sourceId)
    if (!l) return null
    return {
      received: Math.round(weaponLinePaidTowardSale(l) * 100) / 100,
      balance: Math.round(lineDues(l) * 100) / 100,
    }
  }
  const r = loadGeneralEntries().find((x) => x.id === sourceId)
  if (!r) return null
  return {
    received: Math.round(generalDuesPaidAmount(r) * 100) / 100,
    balance: Math.round(generalDuesRemaining(r) * 100) / 100,
  }
}

function attachLedgerEntryAmounts(
  row: ClientDuesLedgerRow,
  srcTag: 'appl' | 'wepl' | 'gen',
  sourceId: string,
): ClientDuesLedgerRow {
  const am = ledgerEntryAmounts(srcTag, sourceId)
  if (!am) return { ...row, sourceId }
  return {
    ...row,
    sourceId,
    rowReceived: am.received,
    rowBalance: am.balance,
    hasOpenDues: am.balance > 0.001,
  }
}

function ledgerColsFromDefaultRef(
  kind: 'app' | 'weapon' | 'general',
  defaultNameRef: string,
): { colName: string; colReference: string; colClient: string } {
  const parts = defaultNameRef.split(' / ').map((x) => x.trim()).filter(Boolean)
  if (kind === 'app') {
    return ledgerRowCols('appl', { reference: parts[1] || parts[0] || '', entryName: parts[0] })
  }
  if (kind === 'weapon') {
    return ledgerRowCols('wepl', { client: parts[0] || '' })
  }
  return ledgerRowCols('gen', { generalName: parts[0] || '' })
}

function stmtNameRef(name: string, ref: string): string {
  const n = name.trim()
  const r = ref.trim()
  if (n && r) return `${n} / ${r}`
  return n || r || '—'
}

function entryDateInRange(entryDate: string, fromIso: string, toIso: string): boolean {
  const d = (entryDate || '').trim()
  if (!d) return false
  return d >= fromIso && d <= toIso
}

function groupTotalPaidTowardSale(kind: 'app' | 'weapon' | 'general', groupKey: string): number {
  if (kind === 'app') {
    return loadEntries()
      .filter((e) => appDuesGroupKey(e) === groupKey)
      .reduce((s, e) => s + entryPaidTowardSale(e), 0)
  }
  if (kind === 'weapon') {
    return loadWeaponAllotLines()
      .filter((l) => ((l.client || '').trim() || '(No client)') === groupKey)
      .reduce((s, l) => s + weaponLinePaidTowardSale(l), 0)
  }
  return loadGeneralEntries()
    .filter((r) => r.kind === 'dues' && generalEntryGroupKey(r) === groupKey)
    .reduce((s, r) => s + generalDuesPaidAmount(r), 0)
}

function groupTotalOutstanding(kind: 'app' | 'weapon' | 'general', groupKey: string): number {
  if (kind === 'app') {
    return loadEntries()
      .filter((e) => appDuesGroupKey(e) === groupKey)
      .reduce((s, e) => s + entryLineDues(e), 0)
  }
  if (kind === 'weapon') {
    return loadWeaponAllotLines()
      .filter((l) => ((l.client || '').trim() || '(No client)') === groupKey)
      .reduce((s, l) => s + lineDues(l), 0)
  }
  return loadGeneralEntries()
    .filter((r) => r.kind === 'dues' && generalEntryGroupKey(r) === groupKey)
    .reduce((s, r) => s + generalDuesRemaining(r), 0)
}

/** On-record wasool: har entry/line ki alag credit row (ek din 10 credit = 10 lines). */
function reconcileGroupLedgerRows(
  rows: ClientDuesLedgerRow[],
  kind: 'app' | 'weapon' | 'general',
  groupKey: string,
  srcTag: 'appl' | 'gen' | 'wepl',
  defaultNameRef: string,
  daySeqMap: Map<string, number>,
): void {
  const totalPaid = Math.round(groupTotalPaidTowardSale(kind, groupKey) * 100) / 100
  const credited = Math.round(rows.reduce((s, r) => s + (r.credit != null ? r.credit : 0), 0) * 100) / 100
  const gap = Math.round((totalPaid - credited) * 100) / 100
  if (gap <= 0.001) return

  type Part = {
    paid: number
    entryDate: string
    nameRef: string
    cols: { colName: string; colReference: string; colClient: string }
    note: string
    sourceId: string
  }
  const parts: Part[] = []
  if (kind === 'app') {
    for (const e of loadEntries()) {
      if (appDuesGroupKey(e) !== groupKey) continue
      const paid = entryPaidTowardSale(e)
      if (paid <= 0.001) continue
      const tid = (e.trackingId || '').trim()
      parts.push({
        paid,
        entryDate: e.entryDate,
        nameRef: stmtNameRef((e.name || '').trim() || '—', appEntryReferenceLabel(e)),
        cols: ledgerRowCols('appl', {
          reference: appEntryReferenceLabel(e),
          entryName: (e.name || '').trim(),
        }),
        note: tid ? `Received (on record) — ${tid}` : 'Received (on record)',
        sourceId: e.id,
      })
    }
  } else if (kind === 'weapon') {
    for (const l of loadWeaponAllotLines()) {
      const k = (l.client || '').trim() || '(No client)'
      if (k !== groupKey) continue
      const paid = weaponLinePaidTowardSale(l)
      if (paid <= 0.001) continue
      const wn = (l.weaponNumber || '').trim()
      parts.push({
        paid,
        entryDate: l.entryDate,
        nameRef: stmtNameRef(k, wn || '—'),
        cols: ledgerRowCols('wepl', { client: k }),
        note: wn ? `Received (on record) — ${wn}` : 'Received (on record)',
        sourceId: l.id,
      })
    }
  } else {
    for (const r of loadGeneralEntries()) {
      if (r.kind !== 'dues' || generalEntryGroupKey(r) !== groupKey) continue
      const paid = generalDuesPaidAmount(r)
      if (paid <= 0.001) continue
      parts.push({
        paid,
        entryDate: r.entryDate,
        nameRef: stmtNameRef(generalEntryDisplayName(r), (r.description || '').trim() || '—'),
        cols: ledgerRowCols('gen', { generalName: (r.name || '').trim() || generalEntryDisplayName(r) }),
        note: (r.description || '').trim() || 'Received (on record)',
        sourceId: r.id,
      })
    }
  }

  const totalPartsPaid = parts.reduce((s, p) => s + p.paid, 0)
  if (totalPartsPaid <= 0.001) return

  let remaining = gap
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    let amt: number
    if (i === parts.length - 1) {
      amt = Math.round(remaining * 100) / 100
    } else {
      amt = Math.round(((gap * p.paid) / totalPartsPaid) * 100) / 100
      remaining = Math.round((remaining - amt) * 100) / 100
    }
    if (amt <= 0.001) continue
    const sortAt = nextLedgerSortAtForDay(daySeqMap, p.entryDate)
    const creditRow: ClientDuesLedgerRow = {
      sortAt,
      date: formatDateTime12hFromSortAt(sortAt),
      nameRef: p.nameRef || defaultNameRef,
      ...p.cols,
      note: p.note,
      debit: null,
      credit: amt,
      srcTag,
    }
    rows.push(attachLedgerEntryAmounts(creditRow, srcTag, p.sourceId))
  }
}

function buildClientDuesLedgerRows(opts: {
  kind: 'app' | 'weapon' | 'general'
  groupKey: string
  clientName: string
  clientReference: string
  fromIso: string
  toIso: string
}): ClientDuesLedgerRow[] {
  const rows: ClientDuesLedgerRow[] = []
  const daySeqMap = new Map<string, number>()
  const clientName = opts.clientName.trim() || '—'
  const clientRef = opts.clientReference.trim() || '—'
  const defaultNameRef = stmtNameRef(clientName, clientRef)
  const noteLine = (parts: string[]) => parts.map((x) => x.trim()).filter(Boolean).join(' · ') || '—'
  if (opts.kind === 'general') {
    for (const r of loadGeneralEntries()) {
      if (r.kind !== 'dues' || generalEntryGroupKey(r) !== opts.groupKey) continue
      if (!entryDateInRange(r.entryDate, opts.fromIso, opts.toIso)) continue
      const sortAt = nextLedgerSortAtForDay(daySeqMap, r.entryDate)
      rows.push(
        attachLedgerEntryAmounts(
          {
            sortAt,
            date: formatDateTime12hFromSortAt(sortAt),
            nameRef: stmtNameRef(generalEntryDisplayName(r), clientRef),
            ...ledgerRowCols('gen', {
              generalName: (r.name || '').trim() || generalEntryDisplayName(r),
            }),
            note: r.description.trim() || '—',
            debit: r.amount,
            credit: null,
            srcTag: 'gen',
          },
          'gen',
          r.id,
        ),
      )
    }
  } else if (opts.kind === 'app') {
    for (const e of loadEntries()) {
      if (appDuesGroupKey(e) !== opts.groupKey) continue
      if (!entryDateInRange(e.entryDate, opts.fromIso, opts.toIso)) continue
      const noteParts = [e.trackingId, e.weaponNumber, e.category].map((x) => x.trim()).filter(Boolean)
      const sortAt = nextLedgerSortAtForDay(daySeqMap, e.entryDate)
      rows.push(
        attachLedgerEntryAmounts(
          {
            sortAt,
            date: formatDateTime12hFromSortAt(sortAt),
            nameRef: stmtNameRef((e.name || '').trim() || clientName, e.reference.trim() || e.category.trim() || clientRef),
            ...ledgerRowCols('appl', {
              reference: appEntryReferenceLabel(e),
              entryName: (e.name || '').trim() || clientName,
            }),
            note: noteLine(noteParts),
            debit: e.salePrice,
            credit: null,
            srcTag: 'appl',
          },
          'appl',
          e.id,
        ),
      )
    }
  } else {
    for (const l of loadWeaponAllotLines()) {
      const k = (l.client || '').trim() || '(No client)'
      if (k !== opts.groupKey) continue
      if (!entryDateInRange(l.entryDate, opts.fromIso, opts.toIso)) continue
      const wn = (l.weaponNumber || '').trim()
      const sortAt = nextLedgerSortAtForDay(daySeqMap, l.entryDate)
      rows.push(
        attachLedgerEntryAmounts(
          {
            sortAt,
            date: formatDateTime12hFromSortAt(sortAt),
            nameRef: stmtNameRef(k, wn || clientRef),
            ...ledgerRowCols('wepl', { client: k }),
            note: wn || '—',
            debit: l.salePrice,
            credit: null,
            srcTag: 'wepl',
          },
          'wepl',
          l.id,
        ),
      )
    }
  }
  for (const log of loadDuesPaymentLogs()) {
    if (log.kind !== opts.kind || log.groupKey !== opts.groupKey) continue
    if (!duesPaymentLogInRange(log, opts.fromIso, opts.toIso)) continue
    const payNote = (log.note ?? '').trim() || 'Wasool'
    rows.push({
      sortAt: log.paidAt,
      date: formatDateTime12hFromSortAt(log.paidAt),
      nameRef: defaultNameRef,
      ...ledgerColsFromDefaultRef(opts.kind, defaultNameRef),
      note: payNote,
      debit: null,
      credit: log.amount,
      srcTag: opts.kind === 'app' ? 'appl' : opts.kind === 'general' ? 'gen' : 'wepl',
      rowReceived: Math.round(log.amount * 100) / 100,
      rowBalance: null,
    })
  }
  const srcTag = opts.kind === 'app' ? 'appl' : opts.kind === 'general' ? 'gen' : 'wepl'
  reconcileGroupLedgerRows(rows, opts.kind, opts.groupKey, srcTag, defaultNameRef, daySeqMap)
  rows.sort((a, b) => compareLedgerRows(a, b))
  return rows
}

function compareLedgerRows(a: ClientDuesLedgerRow, b: ClientDuesLedgerRow): number {
  const c = a.sortAt.localeCompare(b.sortAt)
  if (c !== 0) return c
  const da = a.debit != null ? 0 : 1
  const db = b.debit != null ? 0 : 1
  if (da !== db) return da - db
  return a.note.localeCompare(b.note)
}

function clientDetailSrcTag(kind: 'app' | 'weapon' | 'general'): 'appl' | 'gen' | 'wepl' {
  if (kind === 'app') return 'appl'
  if (kind === 'general') return 'gen'
  return 'wepl'
}

function clientDetailGroupMeta(h: ClientDetailHit): {
  kind: 'app' | 'weapon' | 'general'
  groupKey: string
  nameRef: string
} {
  if (h.kind === 'app') {
    const e = h.entry
    const ref = e.reference.trim() || e.cnic.trim() || e.category.trim() || '—'
    return {
      kind: 'app',
      groupKey: appDuesGroupKey(e),
      nameRef: stmtNameRef((e.name || '').trim() || '—', ref),
    }
  }
  if (h.kind === 'weapon') {
    const l = h.line
    const k = (l.client || '').trim() || '(No client)'
    const wn = (l.weaponNumber || '').trim()
    return { kind: 'weapon', groupKey: k, nameRef: stmtNameRef(k, wn || '—') }
  }
  const r = h.row
  return {
    kind: 'general',
    groupKey: generalEntryGroupKey(r),
    nameRef: stmtNameRef(generalEntryDisplayName(r), (r.description || '').trim() || '—'),
  }
}

function buildClientSearchLedgerRows(hits: ClientDetailHit[], fromIso: string, toIso: string): ClientDuesLedgerRow[] {
  const noteLine = (parts: string[]) => parts.map((x) => x.trim()).filter(Boolean).join(' · ') || '—'
  const groups = new Map<string, { kind: 'app' | 'weapon' | 'general'; groupKey: string; defaultNameRef: string }>()
  const rows: ClientDuesLedgerRow[] = []

  for (const h of hits) {
    const meta = clientDetailGroupMeta(h)
    const mapKey = `${meta.kind}:${meta.groupKey}`
    if (!groups.has(mapKey)) {
      groups.set(mapKey, { kind: meta.kind, groupKey: meta.groupKey, defaultNameRef: meta.nameRef })
    }
  }

  for (const [, g] of groups) {
    const chunk: ClientDuesLedgerRow[] = []
    const daySeqMap = new Map<string, number>()
    const srcTag = clientDetailSrcTag(g.kind)
    const mapKey = `${g.kind}:${g.groupKey}`

    for (const h of hits) {
      const meta = clientDetailGroupMeta(h)
      if (`${meta.kind}:${meta.groupKey}` !== mapKey) continue
      if (h.kind === 'app') {
        const e = h.entry
        if (!entryDateInRange(e.entryDate, fromIso, toIso)) continue
        const noteParts = [e.trackingId, e.weaponNumber, e.category].map((x) => x.trim()).filter(Boolean)
        const sortAt = nextLedgerSortAtForDay(daySeqMap, e.entryDate)
        chunk.push(
          attachLedgerEntryAmounts(
            {
              sortAt,
              date: formatDateTime12hFromSortAt(sortAt),
              nameRef: meta.nameRef,
              ...ledgerRowCols('appl', {
                reference: appEntryReferenceLabel(e),
                entryName: (e.name || '').trim(),
              }),
              note: noteLine(noteParts),
              debit: e.salePrice,
              credit: null,
              srcTag: 'appl',
            },
            'appl',
            e.id,
          ),
        )
      } else if (h.kind === 'weapon') {
        const l = h.line
        if (!entryDateInRange(l.entryDate, fromIso, toIso)) continue
        const wn = (l.weaponNumber || '').trim()
        const wClient = (l.client || '').trim() || '(No client)'
        const sortAt = nextLedgerSortAtForDay(daySeqMap, l.entryDate)
        chunk.push(
          attachLedgerEntryAmounts(
            {
              sortAt,
              date: formatDateTime12hFromSortAt(sortAt),
              nameRef: meta.nameRef,
              ...ledgerRowCols('wepl', { client: wClient }),
              note: wn || '—',
              debit: l.salePrice,
              credit: null,
              srcTag: 'wepl',
            },
            'wepl',
            l.id,
          ),
        )
      } else {
        const r = h.row
        if (!entryDateInRange(r.entryDate, fromIso, toIso)) continue
        const sortAt = nextLedgerSortAtForDay(daySeqMap, r.entryDate)
        chunk.push(
          attachLedgerEntryAmounts(
            {
              sortAt,
              date: formatDateTime12hFromSortAt(sortAt),
              nameRef: meta.nameRef,
              ...ledgerRowCols('gen', {
                generalName: (r.name || '').trim() || generalEntryDisplayName(r),
              }),
              note: r.description.trim() || '—',
              debit: r.amount,
              credit: null,
              srcTag: 'gen',
            },
            'gen',
            r.id,
          ),
        )
      }
    }

    for (const log of loadDuesPaymentLogs()) {
      if (`${log.kind}:${log.groupKey}` !== mapKey) continue
      if (!duesPaymentLogInRange(log, fromIso, toIso)) continue
      const payNote = (log.note ?? '').trim() || 'Wasool'
      chunk.push({
        sortAt: log.paidAt,
        date: formatDateTime12hFromSortAt(log.paidAt),
        nameRef: g.defaultNameRef,
        ...ledgerColsFromDefaultRef(g.kind, g.defaultNameRef),
        note: payNote,
        debit: null,
        credit: log.amount,
        srcTag,
        rowReceived: Math.round(log.amount * 100) / 100,
        rowBalance: null,
      })
    }

    reconcileGroupLedgerRows(chunk, g.kind, g.groupKey, srcTag, g.defaultNameRef, daySeqMap)
    rows.push(...chunk)
  }

  rows.sort((a, b) => compareLedgerRows(a, b))
  return rows
}

function computeClientDetailOutstanding(hits: ClientDetailHit[]): number {
  const seen = new Set<string>()
  let t = 0
  for (const h of hits) {
    const meta = clientDetailGroupMeta(h)
    const k = `${meta.kind}:${meta.groupKey}`
    if (seen.has(k)) continue
    seen.add(k)
    t += groupTotalOutstanding(meta.kind, meta.groupKey)
  }
  return Math.round(t * 100) / 100
}

function clientDetailAllTimeRange(hits: ClientDetailHit[]): { fromIso: string; toIso: string } {
  let min = ''
  let max = isoToday()
  for (const h of hits) {
    const d =
      h.kind === 'app' ? h.entry.entryDate : h.kind === 'weapon' ? h.line.entryDate : h.row.entryDate
    if (!d) continue
    if (!min || d < min) min = d
    if (d > max) max = d
  }
  if (!min) min = max
  return { fromIso: min, toIso: max }
}

function printClientLedgerDocument(opts: {
  title: string
  subTitle: string
  clientLine: string
  ledger: ClientDuesLedgerRow[]
  showSrcCol: boolean
  /** Pending dues (abhi) — same as Pending Dues screen when set */
  outstandingBalance?: number
}) {
  const esc = escHtml
  const now = new Date()
  const sumDebit = opts.ledger.reduce((s, r) => s + (r.debit != null ? r.debit : 0), 0)
  const sumCredit = opts.ledger.reduce((s, r) => s + (r.credit != null ? r.credit : 0), 0)
  const stmtBalance = Math.round((sumDebit - sumCredit) * 100) / 100
  const balanceShow =
    opts.outstandingBalance != null ? Math.round(opts.outstandingBalance * 100) / 100 : stmtBalance
  let idx = 0
  const srcTh = opts.showSrcCol ? `<th class="col-src">Cat</th>` : ''
  const srcCol = opts.showSrcCol ? `<col style="width:4%" />` : ''
  const nameColsTh = opts.showSrcCol
    ? `<th class="col-name">Name</th><th class="col-ref">Reference</th><th class="col-client">Client</th>`
    : `<th class="col-nameref">Name / Reference</th>`
  const nameColsCol = opts.showSrcCol
    ? `<col style="width:10%" /><col style="width:14%" /><col style="width:10%" />`
    : `<col style="width:20%" />`
  const entryAmtTh = opts.showSrcCol ? `<th class="num">Received</th><th class="num">Balance</th>` : ''
  const entryAmtCol = opts.showSrcCol ? `<col style="width:9%" /><col style="width:9%" />` : ''
  const colspan = opts.showSrcCol ? 11 : 6
  const trs = opts.ledger
    .map((r) => {
      idx += 1
      const srcTd = opts.showSrcCol
        ? `<td class="col-src">${esc(r.srcTag ?? '—')}</td>`
        : ''
      const nameTds = opts.showSrcCol
        ? `<td class="col-name">${esc(r.colName)}</td><td class="col-ref">${esc(r.colReference)}</td><td class="col-client">${esc(r.colClient)}</td>`
        : `<td class="col-nameref">${esc(r.nameRef)}</td>`
      const entryAmtTds = opts.showSrcCol
        ? `<td class="num">${esc(stmtPrintRowReceivedBal(r.rowReceived))}</td><td class="num">${esc(stmtPrintRowReceivedBal(r.rowBalance))}</td>`
        : ''
      const rowCls = r.hasOpenDues ? ' class="row-open-dues"' : ''
      return `<tr${rowCls}>
        <td class="col-srl">${idx}</td>
        ${srcTd}
        <td class="col-date">${esc(r.date)}</td>
        ${nameTds}
        <td class="col-note">${esc(r.note)}</td>
        ${entryAmtTds}
        <td class="num">${esc(stmtPrintDebitCredit(r.debit))}</td>
        <td class="num">${esc(stmtPrintDebitCredit(r.credit))}</td>
      </tr>`
    })
    .join('')
  const printedWhen = `${formatHeaderDate(now)} | ${formatHeaderTime(now)}`
  const doc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<title>${escAttr(opts.title)}</title>
<style>${PRINT_CLIENT_LEDGER_CSS}</style>
</head><body>
<div class="page">
  <div class="hdr">
    <div class="shop">
      <div class="name">${esc(PRINT_INVOICE_SHOP.name)}</div>
      <div class="line">${esc(PRINT_INVOICE_SHOP.phone)}</div>
    </div>
    <div class="stmt-hd">
      <div class="title">STATEMENT</div>
      <div class="sub">${esc(opts.subTitle)}</div>
      <div class="when">${esc(printedWhen)}</div>
    </div>
  </div>
  <hr class="rule" />
  <div class="client-line">${esc(opts.clientLine)}</div>
  <div class="stmt-table-wrap">
  <table class="stmt-table">
    <colgroup>
      <col style="width:3%" />${srcCol}<col style="width:8%" />${nameColsCol}<col style="width:12%" />${entryAmtCol}
      <col style="width:10%" /><col style="width:10%" />
    </colgroup>
    <thead><tr>
      <th class="col-srl">Srl No</th>${srcTh}<th class="col-date">Date &amp; Time</th>${nameColsTh}<th class="col-note">Note</th>${entryAmtTh}
      <th class="num">Debit</th><th class="num">Credit</th>
    </tr></thead>
    <tbody>${trs || `<tr><td colspan="${colspan}">—</td></tr>`}</tbody>
  </table>
  </div>
  <div class="fin-wrap">
    <div class="fin-box">
      <div class="fin-title">SUMMARY</div>
      <div class="fin-row"><span>Total Debit</span><span>${esc(stmtPrintMoney(sumDebit))}</span></div>
      <div class="fin-row"><span>Total Credit</span><span>${esc(stmtPrintMoney(sumCredit))}</span></div>
      <div class="fin-row net"><span>Balance (baqi)</span><span>${esc(stmtPrintMoney(balanceShow))}</span></div>
    </div>
  </div>
  <div class="foot"><div>*** This is a Computer Generated Print ***</div><div class="p2">POWERED BY GUL CORPORATION LLC</div></div>
</div></body></html>`
  printFullDocument(doc)
}

function stmtPrintMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || Math.abs(n) < 0.001) return 'RS 0.00'
  return formatInvoiceRupee(n)
}

/** Debit/Credit cell: khali jab amount na ho */
function stmtPrintDebitCredit(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || Math.abs(n) < 0.001) return '—'
  return formatInvoiceRupee(n)
}

function stmtPrintRowReceivedBal(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return stmtPrintMoney(n)
}

function refreshLedgerRowAmounts(rows: ClientDuesLedgerRow[]): ClientDuesLedgerRow[] {
  return rows.map((r) => {
    if (!r.sourceId || !r.srcTag) return r
    return attachLedgerEntryAmounts(r, r.srcTag, r.sourceId)
  })
}

const PRINT_CLIENT_LEDGER_CSS = `
  @page { size: A4 portrait; margin: 10mm; }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;width:100%;max-width:100%;overflow-x:hidden;font-family:Arial,'Segoe UI',Helvetica,sans-serif;font-size:10px;color:#000;background:#fff;}
  .page{width:100%;max-width:100%;margin:0;padding:0;}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;width:100%;}
  .shop{flex:1;min-width:0;}
  .shop .name{font-size:16px;font-weight:700;line-height:1.15;}
  .shop .line{margin-top:3px;font-size:10px;}
  .stmt-hd{flex:0 0 auto;text-align:right;max-width:48%;}
  .stmt-hd .title{font-size:17px;font-weight:700;}
  .stmt-hd .sub{margin-top:2px;font-size:10px;font-weight:700;}
  .stmt-hd .when{margin-top:2px;font-size:9px;line-height:1.3;}
  .rule{border:none;border-top:3px solid #000;margin:10px 0 12px;width:100%;}
  .client-line{margin:0 0 10px;font-size:10px;font-weight:700;width:100%;}
  .stmt-table-wrap{width:100%;max-width:100%;overflow:hidden;}
  .stmt-table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;}
  .stmt-table th,.stmt-table td{border:1px solid #000;padding:4px 5px;vertical-align:middle;overflow:hidden;text-overflow:ellipsis;}
  .stmt-table thead th{background:#f2f2f2;font-weight:700;font-size:9px;line-height:1.2;}
  .stmt-table th.num,.stmt-table td.num{text-align:right;font-size:9px;padding:4px 3px;white-space:normal;word-break:break-word;}
  .stmt-table .col-srl{text-align:center;white-space:nowrap;}
  .stmt-table .col-src{text-align:center;white-space:nowrap;font-weight:700;text-transform:lowercase;}
  .stmt-table .col-date{white-space:nowrap;font-size:9px;}
  .stmt-table .col-nameref,.stmt-table .col-name,.stmt-table .col-ref,.stmt-table .col-client,.stmt-table .col-note{word-break:break-word;overflow-wrap:break-word;line-height:1.25;}
  .stmt-table tr.row-open-dues td{background:#fecaca !important;color:#991b1b;font-weight:700;}
  .stmt-table tr.row-open-dues td.num{color:#991b1b;}
  .fin-wrap{display:flex;justify-content:flex-end;margin-top:20px;width:100%;}
  .fin-box{width:240px;max-width:42%;border:2px solid #000;flex-shrink:0;}
  .fin-title{text-align:center;font-weight:700;font-size:10px;padding:6px 8px;border-bottom:1px solid #000;}
  .fin-row{display:flex;justify-content:space-between;gap:8px;padding:5px 8px;border-bottom:1px solid #bdbdbd;font-weight:700;font-size:10px;}
  .fin-row:last-child{border-bottom:none;}
  .fin-row.net{color:#15803d;font-size:11px;padding:7px 8px;}
  .foot{margin-top:36px;text-align:center;font-size:9px;line-height:1.5;width:100%;}
  .foot .p2{margin-top:4px;font-weight:700;}
  @media print{
    html,body{width:100%;overflow:visible;}
    .page{width:100%;}
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  }
`

function printDuesCollectionStatement(opts: {
  kind: 'app' | 'weapon' | 'general'
  groupKey: string
  clientLabel: string
  clientReference: string
  fromIso: string
  toIso: string
}) {
  const kindLabel = opts.kind === 'app' ? 'Application' : opts.kind === 'weapon' ? 'Weapon' : 'General'
  const rangeLabel = `${opts.fromIso} → ${opts.toIso}`
  const ledger = buildClientDuesLedgerRows({
    kind: opts.kind,
    groupKey: opts.groupKey,
    clientName: opts.clientLabel,
    clientReference: opts.clientReference,
    fromIso: opts.fromIso,
    toIso: opts.toIso,
  })
  printClientLedgerDocument({
    title: `Statement — ${opts.clientLabel}`,
    subTitle: 'CUSTOMER STATEMENT',
    clientLine: `Name: ${opts.clientLabel} | Reference: ${opts.clientReference.trim() || '—'} | Period: ${rangeLabel} | ${kindLabel}`,
    ledger,
    showSrcCol: false,
  })
}

function duesModalCollectFooterHtml(withPrint: boolean): string {
  const printBtn = withPrint
    ? `<button type="button" class="btn primary tool-purple dues-print-btn">${ICON_RECEIPT}<span>Custom print</span></button>`
    : ''
  return `
      <div class="dues-modal-actions">
        <label class="dues-collect-lbl">Collect Amount (Rs.):</label>
        <input type="text" class="in dues-collect-in" inputmode="decimal" />
        <span class="dues-collect-max"></span>
        <button type="button" class="btn primary dues-collect-btn">✓ Collect Now</button>
      </div>
      <div class="dues-modal-actions dues-modal-actions-note">
        <label class="dues-collect-lbl">Note (wasool detail):</label>
        <input type="text" class="in dues-collect-note" placeholder="Cash kis se wasool hovi hai..." />
        ${printBtn}
        <button type="button" class="btn ghost dues-close-btn">✕ Close</button>
      </div>
      <div class="dues-modal-msg" role="status"></div>`
}

function formatPaidDateTime(iso: string) {
  return formatDateTime12hFromSortAt(iso)
}

function renderDuesPayHistBody(el: HTMLElement | null, kind: 'app' | 'weapon' | 'general', groupKey: string) {
  if (!el) return
  const logs = loadDuesPaymentLogs()
    .filter((l) => l.kind === kind && l.groupKey === groupKey)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
  if (!logs.length) {
    el.innerHTML = `<div class="dues-payhist-empty">Koi pichli adayigi record nahi. <b>Collect Now</b> se yahan log ho ga.</div>`
    return
  }
  const last = logs[0]
  const noteLine = (n?: string) => {
    const t = (n ?? '').trim()
    return t ? `<div class="dues-payhist-note">${escHtml(t)}</div>` : ''
  }
  const older = logs.slice(1, 9)
  const recent =
    older.length === 0
      ? ''
      : `<div class="dues-payhist-listwrap"><div class="dues-payhist-listhdr">Purane</div><ol class="dues-payhist-ol">${older
          .map(
            (x) =>
              `<li><span class="dues-payhist-amt">${formatRs(x.amount)}</span> <span class="dues-payhist-when">${formatPaidDateTime(x.paidAt)}</span>${(x.note ?? '').trim() ? ` <span class="dues-payhist-note-inline">${escHtml((x.note ?? '').trim())}</span>` : ''}</li>`,
          )
          .join('')}</ol></div>`
  el.innerHTML = `
    <div class="dues-payhist-highlight">
      <div class="dues-payhist-lastamt">${formatRs(last.amount)}</div>
      <div class="dues-payhist-lastwhen">${formatPaidDateTime(last.paidAt)}</div>
      ${noteLine(last.note)}
    </div>
    ${recent}
  `
}

function openDuesDetailModal(opts: {
  kind: 'app' | 'weapon' | 'general'
  groupKey: string
  setModalOpen: (v: boolean) => void
  onSaved: () => void
}) {
  const esc = (s: string) => s.replaceAll('<', '&lt;')
  const overlay = makeEl('div', { className: 'dues-modal-overlay' })
  const modal = makeEl('div', { className: 'dues-modal' })
  overlay.append(modal)
  document.body.append(overlay)
  opts.setModalOpen(true)

  function tearDown() {
    document.removeEventListener('keydown', escKey, true)
    opts.setModalOpen(false)
    if (overlay.isConnected) overlay.remove()
  }
  function escKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      tearDown()
    }
  }

  if (opts.kind === 'app') {
    let entries = loadAppDuesGroup(opts.groupKey)
    if (!entries.length) {
      tearDown()
      return
    }
    const first = entries[0]
    const total = entries.reduce((s, e) => s + entryLineDues(e), 0)

    modal.innerHTML = `
      <div class="dues-modal-hd">
        <div class="dues-modal-hd-top">
          <div class="dues-modal-hd-name">${esc(first.name.trim() || '—')}</div>
          <div class="dues-modal-hd-cnic">CNIC: ${esc(first.cnic.trim() || '—')}</div>
        </div>
        <div class="dues-modal-hd-sub">
          <span class="dues-modal-hd-kicker">${ICON_COIN}<span>Dues Detail</span></span>
          <span class="dues-modal-sep">|</span>
          <span>Father: ${esc(first.fatherName.trim() || '—')}</span>
        </div>
      </div>
      <div class="dues-modal-meta">
        <span>Category: ${esc(first.category.trim() || '—')}</span>
        <span class="dues-modal-sep">|</span>
        <span>Police Station: ${esc(first.policeStation.trim() || '—')}</span>
        <span class="dues-modal-sep">|</span>
        <span>Mobile: ${esc(first.mobileNumber.trim() || '—')}</span>
      </div>
      <div class="dues-modal-split">
        <aside class="dues-modal-aside" aria-label="Payment history">
          <div class="dues-modal-aside-title">Last payment</div>
          <div class="dues-modal-payhist-body"></div>
        </aside>
        <div class="dues-modal-main">
          <div class="dues-modal-section">${ICON_DUES_APP}<span>All Due Entries (${entries.length}):</span></div>
          <div class="dues-modal-tablewrap">
            <table class="dues-modal-table">
              <thead>
                <tr>
                  <th>Type</th><th>ID</th><th>Tracking ID / Weapon No</th><th>Category / Ref</th><th>Date</th>
                  <th>Sale Price</th><th>Received</th><th>Dues</th><th>Status</th>
                </tr>
              </thead>
              <tbody class="dues-modal-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="dues-modal-total">TOTAL DUES: ${formatRs(total)} (${entries.length} entries)</div>
      ${duesModalCollectFooterHtml(true)}
    `

    const tbody = modal.querySelector<HTMLTableSectionElement>('.dues-modal-tbody')
    const collectIn = modal.querySelector<HTMLInputElement>('.dues-collect-in')
    const collectNote = modal.querySelector<HTMLInputElement>('.dues-collect-note')
    const collectBtn = modal.querySelector<HTMLButtonElement>('.dues-collect-btn')
    const printBtn = modal.querySelector<HTMLButtonElement>('.dues-print-btn')
    const closeBtn = modal.querySelector<HTMLButtonElement>('.dues-close-btn')
    const totalEl = modal.querySelector<HTMLDivElement>('.dues-modal-total')
    const msg = modal.querySelector<HTMLDivElement>('.dues-modal-msg')
    const payHistBody = modal.querySelector<HTMLDivElement>('.dues-modal-payhist-body')

    const maxEl = modal.querySelector<HTMLSpanElement>('.dues-collect-max')
    if (maxEl) maxEl.textContent = `Max: ${formatRs(total)}`
    const renderRows = () => {
      entries = loadAppDuesGroup(opts.groupKey)
      const t = entries.reduce((s, e) => s + entryLineDues(e), 0)
      if (totalEl) totalEl.textContent = `TOTAL DUES: ${formatRs(t)} (${entries.length} entries)`
      if (maxEl) maxEl.textContent = `Max: ${formatRs(t)}`
      renderDuesPayHistBody(payHistBody, 'app', opts.groupKey)
      if (!tbody) return
      tbody.innerHTML = entries
        .map((e, i) => {
          const tw = [e.trackingId, e.weaponNumber].filter((x) => x.trim()).join(' / ') || '—'
          const cr = e.cashReceived
          const recv =
            cr === null && e.salePrice !== null ? formatRs(e.salePrice) : cr !== null ? formatRs(cr) : '—'
          const d = entryLineDues(e)
          return `<tr>
            <td class="dues-modal-type">${ICON_DUES_APP}<span>App</span></td>
            <td>${i + 1}</td>
            <td>${esc(tw)}</td>
            <td>${esc([e.category, e.reference].filter((x) => x.trim()).join(' / ') || '—')}</td>
            <td>${esc(e.entryDate || '—')}</td>
            <td>${e.salePrice !== null ? formatRs(e.salePrice) : '—'}</td>
            <td>${recv}</td>
            <td>${formatRs(d)}</td>
            <td>${d > 0 ? '☐ Active' : '☑ Paid'}</td>
          </tr>`
        })
        .join('')
      if (collectIn) collectIn.value = ''
      if (collectNote) collectNote.value = ''
      if (msg) msg.textContent = ''
    }
    renderRows()

    collectIn?.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter') return
      ev.preventDefault()
      collectBtn?.click()
    })

    printBtn?.addEventListener('click', async () => {
      const cur = loadAppDuesGroup(opts.groupKey)
      const f = cur[0] ?? first
      const range = await promptDateRangeModal({
        title: 'Custom print',
        subtitle: 'From — To date range select karein.',
      })
      if (!range) return
      printDuesCollectionStatement({
        kind: 'app',
        groupKey: opts.groupKey,
        clientLabel: (f.name || '').trim() || '—',
        clientReference: (f.reference || '').trim() || (f.cnic || '').trim() || '—',
        fromIso: range.fromIso,
        toIso: range.toIso,
      })
    })

    collectBtn?.addEventListener('click', () => {
      const amt = parseNumOrNull(collectIn?.value ?? '')
      const curTotal = entries.reduce((s, e) => s + entryLineDues(e), 0)
      if (amt === null || amt <= 0) {
        if (msg) msg.textContent = 'Enter a valid amount.'
        return
      }
      if (amt > curTotal + 0.001) {
        if (msg) msg.textContent = `Amount cannot exceed ${formatRs(curTotal)}.`
        return
      }
      const merged = applyCollectionToEntries(entries, amt)
      mergeEntriesById(merged)
      appendDuesPaymentLog('app', opts.groupKey, amt, collectNote?.value ?? '')
      if (msg) msg.textContent = 'Saved.'
      opts.onSaved()
      renderRows()
      const newTotal = loadAppDuesGroup(opts.groupKey).reduce((s, e) => s + entryLineDues(e), 0)
      if (newTotal <= 0) {
        window.setTimeout(tearDown, 400)
      }
    })

    closeBtn?.addEventListener('click', tearDown)
  } else if (opts.kind === 'weapon') {
    let lines = loadWeaponDuesGroup(opts.groupKey)
    if (!lines.length) {
      tearDown()
      return
    }
    const total = lines.reduce((s, l) => s + lineDues(l), 0)
    const clientLabel = opts.groupKey

    modal.innerHTML = `
      <div class="dues-modal-hd">
        <div class="dues-modal-hd-top">
          <div class="dues-modal-hd-name">${esc(clientLabel)}</div>
          <div class="dues-modal-hd-cnic">Weapon</div>
        </div>
        <div class="dues-modal-hd-sub">
          <span class="dues-modal-hd-kicker">${ICON_COIN}<span>Dues Detail</span></span>
        </div>
      </div>
      <div class="dues-modal-meta">
        <span>Weapon allot · grouped by client</span>
      </div>
      <div class="dues-modal-split">
        <aside class="dues-modal-aside" aria-label="Payment history">
          <div class="dues-modal-aside-title">Last payment</div>
          <div class="dues-modal-payhist-body"></div>
        </aside>
        <div class="dues-modal-main">
          <div class="dues-modal-section">${ICON_DUES_WEAPON}<span>All Due Entries (${lines.length}):</span></div>
          <div class="dues-modal-tablewrap">
            <table class="dues-modal-table">
              <thead>
                <tr>
                  <th>Type</th><th>ID</th><th>Weapon No.</th><th>Date</th>
                  <th>Sale Price</th><th>Received</th><th>Dues</th><th>Status</th>
                </tr>
              </thead>
              <tbody class="dues-modal-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="dues-modal-total">TOTAL DUES: ${formatRs(total)} (${lines.length} entries)</div>
      ${duesModalCollectFooterHtml(true)}
    `

    const tbody = modal.querySelector<HTMLTableSectionElement>('.dues-modal-tbody')
    const collectIn = modal.querySelector<HTMLInputElement>('.dues-collect-in')
    const collectNote = modal.querySelector<HTMLInputElement>('.dues-collect-note')
    const collectBtn = modal.querySelector<HTMLButtonElement>('.dues-collect-btn')
    const printBtn = modal.querySelector<HTMLButtonElement>('.dues-print-btn')
    const closeBtn = modal.querySelector<HTMLButtonElement>('.dues-close-btn')
    const totalEl = modal.querySelector<HTMLDivElement>('.dues-modal-total')
    const msg = modal.querySelector<HTMLDivElement>('.dues-modal-msg')
    const payHistBody = modal.querySelector<HTMLDivElement>('.dues-modal-payhist-body')

    const maxEl = modal.querySelector<HTMLSpanElement>('.dues-collect-max')
    const renderRows = () => {
      lines = loadWeaponDuesGroup(opts.groupKey)
      const t = lines.reduce((s, l) => s + lineDues(l), 0)
      if (totalEl) totalEl.textContent = `TOTAL DUES: ${formatRs(t)} (${lines.length} entries)`
      if (maxEl) maxEl.textContent = `Max: ${formatRs(t)}`
      renderDuesPayHistBody(payHistBody, 'weapon', opts.groupKey)
      if (!tbody) return
      tbody.innerHTML = lines
        .map((l, i) => {
          const cr = l.cashReceived
          const recv =
            cr === null && l.salePrice !== null ? formatRs(l.salePrice) : cr !== null ? formatRs(cr) : '—'
          const d = lineDues(l)
          return `<tr>
            <td class="dues-modal-type">${ICON_DUES_WEAPON}<span>Weapon</span></td>
            <td>${i + 1}</td>
            <td>${esc(l.weaponNumber.trim() || '—')}</td>
            <td>${esc(l.entryDate)}</td>
            <td>${l.salePrice !== null ? formatRs(l.salePrice) : '—'}</td>
            <td>${recv}</td>
            <td>${formatRs(d)}</td>
            <td>${d > 0 ? '☐ Active' : '☑ Paid'}</td>
          </tr>`
        })
        .join('')
      if (collectIn) collectIn.value = ''
      if (collectNote) collectNote.value = ''
      if (msg) msg.textContent = ''
    }
    renderRows()

    printBtn?.addEventListener('click', async () => {
      const range = await promptDateRangeModal({
        title: 'Custom print',
        subtitle: 'From — To date range select karein.',
      })
      if (!range) return
      printDuesCollectionStatement({
        kind: 'weapon',
        groupKey: opts.groupKey,
        clientLabel: clientLabel,
        clientReference: opts.groupKey,
        fromIso: range.fromIso,
        toIso: range.toIso,
      })
    })

    collectBtn?.addEventListener('click', () => {
      const amt = parseNumOrNull(collectIn?.value ?? '')
      const curTotal = lines.reduce((s, l) => s + lineDues(l), 0)
      if (amt === null || amt <= 0) {
        if (msg) msg.textContent = 'Enter a valid amount.'
        return
      }
      if (amt > curTotal + 0.001) {
        if (msg) msg.textContent = `Amount cannot exceed ${formatRs(curTotal)}.`
        return
      }
      const merged = applyCollectionToWeaponLines(lines, amt)
      mergeWeaponLinesById(merged)
      appendDuesPaymentLog('weapon', opts.groupKey, amt, collectNote?.value ?? '')
      if (msg) msg.textContent = 'Saved.'
      opts.onSaved()
      renderRows()
      const newTotal = loadWeaponDuesGroup(opts.groupKey).reduce((s, l) => s + lineDues(l), 0)
      if (newTotal <= 0) {
        window.setTimeout(tearDown, 400)
      }
    })

    closeBtn?.addEventListener('click', tearDown)
  } else {
    // General dues (manual)
    const groupKey = opts.groupKey
    const loadGroup = () =>
      loadGeneralEntries()
        .filter((r) => r.kind === 'dues' && generalEntryGroupKey(r) === groupKey && generalDuesRemaining(r) > 0)
        .slice()
        .sort((a, b) => (a.entryDate || '').localeCompare(b.entryDate || '') || a.id.localeCompare(b.id))
    let lines = loadGroup()
    if (!lines.length) {
      tearDown()
      return
    }
    const label = lines[0] ? generalEntryDisplayName(lines[0]) : groupKey || '—'
    const total = lines.reduce((s, r) => s + generalDuesRemaining(r), 0)

    modal.innerHTML = `
      <div class="dues-modal-hd">
        <div class="dues-modal-hd-top">
          <div class="dues-modal-hd-name">${esc(label)}</div>
          <div class="dues-modal-hd-cnic">General</div>
        </div>
        <div class="dues-modal-hd-sub">
          <span class="dues-modal-hd-kicker">${ICON_COIN}<span>Dues Detail</span></span>
        </div>
      </div>
      <div class="dues-modal-meta">
        <span>General dues · grouped by Name</span>
      </div>
      <div class="dues-modal-split">
        <aside class="dues-modal-aside" aria-label="Payment history">
          <div class="dues-modal-aside-title">Last payment</div>
          <div class="dues-modal-payhist-body"></div>
        </aside>
        <div class="dues-modal-main">
          <div class="dues-modal-section">${ICON_DOC}<span>All Due Entries (${lines.length}):</span></div>
          <div class="dues-modal-tablewrap">
            <table class="dues-modal-table">
              <thead>
                <tr>
                  <th>Type</th><th>ID</th><th>Date</th><th>Details</th><th style="text-align:right">Amount</th><th style="text-align:right">Remaining</th><th>Status</th>
                </tr>
              </thead>
              <tbody class="dues-modal-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="dues-modal-total">TOTAL DUES: ${formatRs(total)} (${lines.length} entries)</div>
      ${duesModalCollectFooterHtml(true)}
    `

    const tbody = modal.querySelector<HTMLTableSectionElement>('.dues-modal-tbody')
    const collectIn = modal.querySelector<HTMLInputElement>('.dues-collect-in')
    const collectNote = modal.querySelector<HTMLInputElement>('.dues-collect-note')
    const collectBtn = modal.querySelector<HTMLButtonElement>('.dues-collect-btn')
    const printBtn = modal.querySelector<HTMLButtonElement>('.dues-print-btn')
    const closeBtn = modal.querySelector<HTMLButtonElement>('.dues-close-btn')
    const totalEl = modal.querySelector<HTMLDivElement>('.dues-modal-total')
    const msg = modal.querySelector<HTMLDivElement>('.dues-modal-msg')
    const payHistBody = modal.querySelector<HTMLDivElement>('.dues-modal-payhist-body')
    const maxEl = modal.querySelector<HTMLSpanElement>('.dues-collect-max')

    const renderRows = () => {
      lines = loadGroup()
      const t = lines.reduce((s, r) => s + generalDuesRemaining(r), 0)
      if (totalEl) totalEl.textContent = `TOTAL DUES: ${formatRs(t)} (${lines.length} entries)`
      if (maxEl) maxEl.textContent = `Max: ${formatRs(t)}`
      renderDuesPayHistBody(payHistBody, 'general', groupKey)
      if (!tbody) return
      tbody.innerHTML =
        lines
          .map((r, i) => {
            const rem = generalDuesRemaining(r)
            return `<tr>
              <td class="dues-modal-type">${ICON_DOC}<span>General</span></td>
              <td>${i + 1}</td>
              <td>${esc(r.entryDate || '—')}</td>
              <td>${esc(r.description.trim() || generalEntryDisplayName(r))}</td>
              <td style="text-align:right">${formatRs(r.amount)}</td>
              <td style="text-align:right">${formatRs(rem)}</td>
              <td>${rem > 0 ? '☐ Active' : '☑ Paid'}</td>
            </tr>`
          })
          .join('')
      if (collectIn) collectIn.value = ''
      if (collectNote) collectNote.value = ''
      if (msg) msg.textContent = ''
    }
    renderRows()

    printBtn?.addEventListener('click', async () => {
      lines = loadGroup()
      const first = lines[0]
      const range = await promptDateRangeModal({
        title: 'Custom print',
        subtitle: 'From — To date range select karein.',
      })
      if (!range) return
      const ref = (first?.description ?? '').trim() || groupKey
      printDuesCollectionStatement({
        kind: 'general',
        groupKey,
        clientLabel: label,
        clientReference: ref,
        fromIso: range.fromIso,
        toIso: range.toIso,
      })
    })

    collectBtn?.addEventListener('click', () => {
      const amt = parseNumOrNull(collectIn?.value ?? '')
      const curTotal = lines.reduce((s, r) => s + generalDuesRemaining(r), 0)
      if (amt === null || amt <= 0) {
        if (msg) msg.textContent = 'Enter a valid amount.'
        return
      }
      if (amt > curTotal + 0.001) {
        if (msg) msg.textContent = `Amount cannot exceed ${formatRs(curTotal)}.`
        return
      }
      const updated = applyCollectionToGeneral(lines, amt)
      mergeGeneralEntriesById(updated)
      appendDuesPaymentLog('general', groupKey, amt, collectNote?.value ?? '')
      if (msg) msg.textContent = 'Saved.'
      opts.onSaved()
      renderRows()
      const newTotal = loadGroup().reduce((s, r) => s + generalDuesRemaining(r), 0)
      if (newTotal <= 0) {
        window.setTimeout(tearDown, 400)
      }
    })

    closeBtn?.addEventListener('click', tearDown)
  }

  document.addEventListener('keydown', escKey, true)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) tearDown()
  })
}

function appDuesGroupKey(e: Entry) {
  const ref = e.reference.trim()
  if (ref) return `ref:${ref.toLowerCase()}`
  const c = e.cnic.trim()
  if (c) return `cnic:${c.toLowerCase()}`
  return `n:${e.name.trim().toLowerCase()}|${e.reference.trim().toLowerCase()}`
}

function buildDuesRows(): DuesRow[] {
  const rows: DuesRow[] = []
  const appEntries = loadEntries().filter((e) => entryLineDues(e) > 0)
  const appMap = new Map<string, Entry[]>()
  for (const e of appEntries) {
    const k = appDuesGroupKey(e)
    if (!appMap.has(k)) appMap.set(k, [])
    appMap.get(k)!.push(e)
  }
  for (const [k, list] of appMap) {
    const first = list[0]
    const parts = [first.name.trim(), first.reference.trim()].filter(Boolean)
    const nameRef = parts.length ? parts.join(' / ') : '—'
    const totalDues = list.reduce((s, x) => s + entryLineDues(x), 0)
    rows.push({
      kind: 'app',
      groupKey: k,
      count: list.length,
      nameRef,
      cnic: first.cnic.trim() || '—',
      referenceOta: first.reference.trim() || '—',
      totalDues,
    })
  }
  const wLines = loadWeaponAllotLines().filter((l) => lineDues(l) > 0)
  const wMap = new Map<string, WeaponAllotLine[]>()
  for (const l of wLines) {
    const k = (l.client || '').trim() || '(No client)'
    if (!wMap.has(k)) wMap.set(k, [])
    wMap.get(k)!.push(l)
  }
  for (const [client, list] of wMap) {
    const totalDues = list.reduce((s, x) => s + lineDues(x), 0)
    const wFirst = list[0]
    rows.push({
      kind: 'weapon',
      groupKey: client,
      count: list.length,
      nameRef: client,
      cnic: '—',
      referenceOta: (wFirst?.weaponNumber || '').trim() || '—',
      totalDues,
    })
  }
  const gLines = loadGeneralEntries().filter((r) => r.kind === 'dues' && generalDuesRemaining(r) > 0)
  const gMap = new Map<string, GeneralEntryLine[]>()
  for (const r of gLines) {
    const k = generalEntryGroupKey(r)
    if (!gMap.has(k)) gMap.set(k, [])
    gMap.get(k)!.push(r)
  }
  for (const [k, list] of gMap) {
    const totalDues = list.reduce((s, x) => s + generalDuesRemaining(x), 0)
    const label = list[0] ? generalEntryDisplayName(list[0]) : k || '—'
    const gFirst = list[0]
    rows.push({
      kind: 'general',
      groupKey: k,
      count: list.length,
      nameRef: label,
      cnic: '—',
      referenceOta: (gFirst?.description || '').trim() || '—',
      totalDues,
    })
  }
  rows.sort((a, b) => a.nameRef.localeCompare(b.nameRef))
  return rows
}

function openStartupReminderOverlay(opts: {
  duesRows: DuesRow[]
  urgentEntries: Entry[]
  otherEntries: Entry[]
}) {
  const overlay = makeEl('div', { className: 'startup-reminder-overlay' })
  const card = makeEl('div', { className: 'startup-reminder' })
  const head = makeEl('div', { className: 'startup-reminder-head' })
  head.innerHTML = `<div class="startup-reminder-title">Daily reminder</div><div class="startup-reminder-sub">Pending dues (application / weapon / general) · Urgent / Other · up to 7 days left</div>`

  const split = makeEl('div', { className: 'startup-reminder-split' })
  const duesPane = makeEl('div', { className: 'startup-reminder-pane startup-reminder-dues' })
  duesPane.innerHTML = `<div class="startup-reminder-pane-h">${ICON_COIN}<span>Pending dues</span></div><div class="startup-reminder-list startup-reminder-due-scroll"></div>`
  const urgentPane = makeEl('div', { className: 'startup-reminder-pane startup-reminder-urgent' })
  urgentPane.innerHTML = `<div class="startup-reminder-pane-h">${ICON_CHART}<span>Urgent &amp; Other (&le;7 days)</span></div><div class="startup-reminder-list startup-reminder-urg-scroll"></div>`

  const duesList = duesPane.querySelector<HTMLDivElement>('.startup-reminder-list')
  const urgentList = urgentPane.querySelector<HTMLDivElement>('.startup-reminder-list')

  const duesHtml =
    opts.duesRows.length === 0
      ? `<div class="startup-reminder-empty">Koi pending dues nahi — sab clear.</div>`
      : opts.duesRows
          .map((r) => {
            const isApp = r.kind === 'app'
            const isWeapon = r.kind === 'weapon'
            const kindClass = isApp ? 'is-app' : isWeapon ? 'is-weapon' : 'is-general'
            const badge = isApp
              ? `${ICON_DOC}<span>Application (tracking)</span>`
              : isWeapon
                ? `${ICON_TAG}<span>Weapon no. allotment</span>`
                : `${ICON_DOC}<span>General dues</span>`
            const meta = isApp
              ? `CNIC ${escHtml(r.cnic)} · ${r.count} entr${r.count === 1 ? 'y' : 'ies'}`
              : isWeapon
                ? `${r.count} entr${r.count === 1 ? 'y' : 'ies'} · weapon allotment (client / weapon no.)`
                : `${r.count} entr${r.count === 1 ? 'y' : 'ies'} · general`
            return `<div class="startup-reminder-due-card ${kindClass}" role="listitem">
  <div class="due-card-head"><span class="due-card-badge">${badge}</span><span class="due-card-amt">${escHtml(formatRs(r.totalDues))}</span></div>
  <div class="due-card-name">${escHtml(r.nameRef)}</div>
  <div class="due-card-meta">${meta}</div>
</div>`
          })
          .join('')

  const fmtRem = (rem: number) => (rem < 0 ? `Overdue ${Math.abs(rem)}d` : `${rem}d left`)

  const urgentBlock =
    opts.urgentEntries.length === 0
      ? ''
      : `<div class="startup-rem-subh">Urgent (&le;7 days)</div>${opts.urgentEntries
          .map((e) => {
            const rem = reminderWindowRemaining(e.entryDate, e.urgentDays) ?? 0
            return `<div class="startup-reminder-urg-card is-urgent" role="listitem">
  <div class="urg-card-top"><span class="urg-line-pill">Urgent</span><span class="urg-card-name">${escHtml((e.name || '—').trim() || '—')}</span><span class="urg-card-badge">${escHtml(fmtRem(rem))}</span></div>
  <div class="urg-card-meta">Tracking: ${escHtml(e.trackingId.trim() || '—')} · Date ${escHtml(formatDateDisplay(e.entryDate))}</div>
</div>`
          })
          .join('')}`

  const otherBlock =
    opts.otherEntries.length === 0
      ? ''
      : `<div class="startup-rem-subh">Other reminder (&le;7 days)</div>${opts.otherEntries
          .map((e) => {
            const rem = reminderWindowRemaining(e.entryDate, e.otherReminderDays) ?? 0
            return `<div class="startup-reminder-urg-card is-other" role="listitem">
  <div class="urg-card-top"><span class="urg-line-pill">Other</span><span class="urg-card-name">${escHtml((e.name || '—').trim() || '—')}</span><span class="urg-card-badge">${escHtml(fmtRem(rem))}</span></div>
  <div class="urg-card-meta">Tracking: ${escHtml(e.trackingId.trim() || '—')} · Date ${escHtml(formatDateDisplay(e.entryDate))}</div>
</div>`
          })
          .join('')}`

  const urgentHtml =
    opts.urgentEntries.length === 0 && opts.otherEntries.length === 0
      ? `<div class="startup-reminder-empty">Koi urgent / other reminder (&le;7 days) nahi.</div>`
      : `${urgentBlock}${otherBlock}`

  if (duesList) duesList.innerHTML = duesHtml
  if (urgentList) urgentList.innerHTML = urgentHtml

  split.append(duesPane, urgentPane)
  const foot = makeEl('div', { className: 'startup-reminder-foot' })
  const ok = makeEl('button', {
    className: 'startup-reminder-ok',
    attrs: { type: 'button' },
  }) as HTMLButtonElement
  ok.textContent = 'OK'

  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    document.removeEventListener('keydown', onEsc, true)
    if (overlay.isConnected) overlay.remove()
  }

  const onEsc = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    if (!overlay.isConnected) return
    e.preventDefault()
    e.stopPropagation()
    close()
  }
  document.addEventListener('keydown', onEsc, true)

  ok.addEventListener('click', close)
  foot.append(ok)
  card.append(head, split, foot)
  overlay.append(card)
  document.body.append(overlay)
  queueMicrotask(() => ok.focus())
}

function maybeOpenStartupReminder() {
  if (document.querySelector('.startup-reminder-overlay')) return
  const duesRows = buildDuesRows()
  const urgentEntries = buildUrgentReminderEntries()
  const otherEntries = buildOtherReminderEntries()
  if (duesRows.length === 0 && urgentEntries.length === 0 && otherEntries.length === 0) return
  openStartupReminderOverlay({ duesRows, urgentEntries, otherEntries })
}

function makeDuesScreen(opts: { onBack: () => void }) {
  const wrap = makeEl('section', { className: 'entry entry-dark dues-screen' })
  let duesDetailModalOpen = false

  const head = makeEl('div', { className: 'dues-head' })
  const back = makeEl('button', { className: 'mini back', attrs: { type: 'button' } }) as HTMLButtonElement
  back.textContent = '← Main Screen (ESC)'
  const tab = makeEl('div', { className: 'dues-tab', attrs: { role: 'heading', 'aria-level': '2' } })
  tab.innerHTML = `${ICON_COIN}<span>Pending Dues</span>`
  head.append(back, tab)

  const toolRow = makeEl('div', { className: 'dues-tool-row' })
  const summary = makeEl('div', { className: 'dues-summary' })
  const searchWrap = makeEl('div', { className: 'dues-search-wrap' })
  searchWrap.innerHTML = `<span class="dues-search-lbl">Search:</span>`
  const searchIn = makeEl('input', {
    className: 'in dues-search-in',
    attrs: { type: 'search', placeholder: '', 'aria-label': 'Search dues' },
  }) as HTMLInputElement
  searchWrap.append(searchIn)

  const hint = makeEl('p', {
    className: 'dues-hint',
    text: 'Search by Name / CNIC / Reference OTA — grouped by Reference | Double-click a row to open detail & collect',
  })

  const table = makeEl('div', { className: 'table dues-table' })
  table.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Name</th>
          <th>CNIC</th>
          <th>Reference OTA</th>
          <th>Entries</th>
          <th>Total Dues</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `
  const tbody = table.querySelector<HTMLTableSectionElement>('tbody')

  const escCell = (s: string) => s.replaceAll('<', '&lt;')

  const render = () => {
    const q = searchIn.value.trim().toLowerCase()
    const all = buildDuesRows()
    const filtered = q
      ? all.filter(
          (r) =>
            r.nameRef.toLowerCase().includes(q) ||
            r.cnic.toLowerCase().includes(q) ||
            r.referenceOta.toLowerCase().includes(q),
        )
      : all
    let totalOut = 0
    let entryCount = 0
    for (const r of filtered) {
      totalOut += r.totalDues
      entryCount += r.count
    }
    const persons = filtered.length
    summary.textContent = `Total Outstanding Dues: ${formatRs(totalOut)} | Persons: ${persons} | Entries: ${entryCount}`

    const html = filtered
      .map((r) => {
        const ico = r.kind === 'app' ? ICON_DUES_APP : r.kind === 'weapon' ? ICON_DUES_WEAPON : ICON_DOC
        const lbl = r.kind === 'app' ? 'App' : r.kind === 'weapon' ? 'Weapon' : 'General'
        const gk = encodeURIComponent(r.groupKey)
        return `<tr class="dues-row" tabindex="0" data-kind="${r.kind}" data-group-key="${gk}">
          <td class="dues-type-cell"><span class="dues-type-ico">${ico}</span><span class="dues-type-lbl">${lbl}(${r.count})</span></td>
          <td>${escCell(r.nameRef)}</td>
          <td>${escCell(r.cnic)}</td>
          <td>${escCell(r.referenceOta)}</td>
          <td>${r.count}</td>
          <td>${formatRs(r.totalDues)}</td>
        </tr>`
      })
      .join('')
    if (tbody) tbody.innerHTML = html || `<tr><td colspan="6" class="empty">No pending dues.</td></tr>`

    tbody?.querySelectorAll<HTMLTableRowElement>('tr.dues-row').forEach((tr) => {
      tr.addEventListener('dblclick', () => {
        const kind = tr.getAttribute('data-kind') as 'app' | 'weapon' | 'general' | null
        const enc = tr.getAttribute('data-group-key')
        if (!kind || !enc) return
        const groupKey = decodeURIComponent(enc)
        openDuesDetailModal({
          kind,
          groupKey,
          setModalOpen: (v) => {
            duesDetailModalOpen = v
          },
          onSaved: () => render(),
        })
      })
    })
  }

  searchIn.addEventListener('input', () => render())
  render()

  const onKey = (e: KeyboardEvent) => {
    if (!wrap.isConnected) {
      window.removeEventListener('keydown', onKey)
      return
    }
    if (e.key === 'Escape') {
      if (duesDetailModalOpen) return
      e.preventDefault()
      e.stopPropagation()
      window.removeEventListener('keydown', onKey)
      opts.onBack()
    }
  }
  window.addEventListener('keydown', onKey)
  back.addEventListener('click', () => {
    window.removeEventListener('keydown', onKey)
    opts.onBack()
  })

  toolRow.append(summary, searchWrap)
  wrap.append(head, toolRow, hint, table)
  return wrap
}

function makeNewEntry(
  opts: { onBack: () => void; initial?: Entry | null; draft?: NewEntryInsertOpts['draft']; insertAfterId?: string | null },
) {
  const initial = opts.initial ?? null
  const isEdit = Boolean(initial)

  const wrap = makeEl('section', { className: 'entry entry-dark' })
  const top = makeEl('div', { className: 'entry-top' })
  const back = makeEl('button', { className: 'mini back', attrs: { type: 'button' } }) as HTMLButtonElement
  back.textContent = 'Back'
  back.addEventListener('click', () => opts.onBack())
  const h = makeEl('div', { className: 'entry-title' })
  h.innerHTML = isEdit
    ? `<div class="entry-kicker">Edit entry</div><div class="entry-sub">Update this customer record</div>`
    : `<div class="entry-kicker">New Entry</div><div class="entry-sub">Create and save a customer record</div>`
  top.append(h, back)

  const card = makeEl('div', { className: 'entry-card' })

  const form = makeEl('form', { className: 'entry-form' })

  const mkField = (label: string, el: HTMLElement) => {
    const w = makeEl('label', { className: 'f' })
    const l = makeEl('span', { className: 'fl', text: label })
    w.append(l, el)
    return w
  }

  const input = (ph: string, attrs?: Record<string, string>) =>
    makeEl('input', { className: 'in', attrs: { placeholder: ph, ...attrs } }) as HTMLInputElement

  const entryDate = input('Date', { type: 'date' })
  const name = input('Name')
  const fatherName = input('Father Name')
  const cnic = input('00000-0000000-0', { inputmode: 'numeric', maxlength: '15' })
  cnic.classList.add('in-cnic')
  const syncCnicMask = () => {
    const next = formatCnicDigits(cnic.value)
    if (cnic.value !== next) cnic.value = next
  }
  cnic.addEventListener('input', syncCnicMask)
  const trackingId = input('Tracking ID')
  const reference = input('Reference / notes')
  const weaponNumber = input('Weapon Number')
  const policeStation = input('Police Station')
  const mobileNumber = input('Mobile Number')
  const category = input('Category')
  const costPrice = input('Cost Price', { inputmode: 'decimal' })
  const salePrice = input('Sale Price', { inputmode: 'decimal' })
  const cashReceived = input('Cash Received (leave empty = full paid)', { inputmode: 'decimal' })

  const urgencyWrap = makeEl('div', { className: 'urg' })
  urgencyWrap.innerHTML = `
    <div class="urg-title">Reminder</div>
    <div class="urg-rows">
      <label class="urg-opt"><input type="radio" name="urg" value="normal" checked /> <span>Normal</span></label>
      <label class="urg-opt"><input type="radio" name="urg" value="urgent" /> <span>Urgent</span></label>
      <label class="urg-opt"><input type="radio" name="urg" value="other" /> <span>Other</span></label>
    </div>
  `
  const urgentDays = input('Urgent: total days (e.g. 15)', { inputmode: 'numeric' })
  const otherDays = input('Other: remind after days (e.g. 45)', { inputmode: 'numeric' })

  const urgencyExtra = makeEl('div', { className: 'urg-extra' })
  urgencyExtra.append(mkField('Urgent days', urgentDays), mkField('Other days', otherDays))

  const totals = makeEl('div', { className: 'totals' })
  totals.innerHTML = `<div class="tot">Total dues: <b class="tot-dues">0</b></div>`
  const duesEl = totals.querySelector<HTMLSpanElement>('.tot-dues')
  const updateTotals = () => {
    const sp = parseNumOrNull(salePrice.value)
    const cr = parseNumOrNull(cashReceived.value)
    const d = computeDues(sp, cr)
    if (duesEl) duesEl.textContent = String(d)
  }
  salePrice.addEventListener('input', updateTotals)
  cashReceived.addEventListener('input', updateTotals)

  const msg = makeEl('div', { className: 'entry-msg', attrs: { role: 'status', 'aria-live': 'polite' } })

  const saveBtn = makeEl('button', { className: 'btn primary', attrs: { type: 'submit' } }) as HTMLButtonElement
  saveBtn.innerHTML = isEdit ? `${ICON_DOC}<span>Save changes</span>` : `${ICON_PLUS}<span>Save</span>`

  const grid = makeEl('div', { className: 'entry-grid' })
  const lblEntryDate = mkField('Entry date', entryDate)
  lblEntryDate.classList.add('f-entry-date')
  const lblCnic = mkField('CNIC', cnic)
  lblCnic.classList.add('f-cnic')
  const lblCost = mkField('Cost price', costPrice)
  const lblSale = mkField('Sale price', salePrice)
  const lblCashR = mkField('Cash received', cashReceived)
  lblCost.classList.add('f-price-cost')
  lblSale.classList.add('f-price-sale')
  lblCashR.classList.add('f-cash-received')

  const moneyCluster = makeEl('div', { className: 'entry-money-cluster' })
  moneyCluster.append(lblCost, lblSale, lblCashR)

  const pricingRow = makeEl('div', { className: 'entry-pricing-row' })
  pricingRow.append(mkField('Category', category), moneyCluster)

  grid.append(
    lblEntryDate,
    mkField('Name', name),
    mkField('Father name', fatherName),
    lblCnic,
    mkField('Tracking ID', trackingId),
    mkField('Reference', reference),
    mkField('Weapon number', weaponNumber),
    mkField('Police station', policeStation),
    mkField('Mobile number', mobileNumber),
    pricingRow,
  )

  const entryScroll = makeEl('div', { className: 'entry-scroll' })
  entryScroll.append(grid, urgencyWrap, urgencyExtra)
  const entryFooter = makeEl('div', { className: 'entry-footer entry-save-dock' })

  const getUrgency = () => {
    const checked = urgencyWrap.querySelector<HTMLInputElement>('input[name="urg"]:checked')
    const v = (checked?.value ?? 'normal') as EntryUrgency
    return v
  }
  const syncUrgencyFields = () => {
    const u = getUrgency()
    urgentDays.disabled = u !== 'urgent'
    otherDays.disabled = u !== 'other'
  }
  urgencyWrap.addEventListener('change', syncUrgencyFields)

  if (initial) {
    entryDate.value = initial.entryDate || isoToday()
    name.value = initial.name
    fatherName.value = initial.fatherName
    cnic.value = formatCnicDigits(initial.cnic)
    trackingId.value = initial.trackingId
    reference.value = initial.reference
    weaponNumber.value = initial.weaponNumber
    policeStation.value = initial.policeStation
    mobileNumber.value = initial.mobileNumber
    category.value = initial.category
    costPrice.value = initial.costPrice != null ? String(initial.costPrice) : ''
    salePrice.value = initial.salePrice != null ? String(initial.salePrice) : ''
    cashReceived.value = initial.cashReceived != null ? String(initial.cashReceived) : ''
    const ur = urgencyWrap.querySelector<HTMLInputElement>(`input[name="urg"][value="${initial.urgency}"]`)
    if (ur) ur.checked = true
    urgentDays.value = initial.urgentDays != null ? String(initial.urgentDays) : ''
    otherDays.value = initial.otherReminderDays != null ? String(initial.otherReminderDays) : ''
  } else {
    entryDate.valueAsDate = new Date()
    const d = opts.draft
    if (d) {
      if (typeof d.entryDate === 'string' && d.entryDate.trim()) entryDate.value = d.entryDate
      if (typeof d.name === 'string') name.value = d.name
      if (typeof d.fatherName === 'string') fatherName.value = d.fatherName
      if (typeof d.cnic === 'string') cnic.value = formatCnicDigits(d.cnic)
      if (typeof d.trackingId === 'string') trackingId.value = d.trackingId
      if (typeof d.reference === 'string') reference.value = d.reference
      if (typeof d.weaponNumber === 'string') weaponNumber.value = d.weaponNumber
      if (typeof d.policeStation === 'string') policeStation.value = d.policeStation
      if (typeof d.mobileNumber === 'string') mobileNumber.value = d.mobileNumber
      if (typeof d.category === 'string') category.value = d.category
      if (typeof d.costPrice === 'number') costPrice.value = String(d.costPrice)
      if (typeof d.salePrice === 'number') salePrice.value = String(d.salePrice)
      if (typeof d.cashReceived === 'number') cashReceived.value = String(d.cashReceived)
      if (d.urgency) {
        const ur = urgencyWrap.querySelector<HTMLInputElement>(`input[name="urg"][value="${d.urgency}"]`)
        if (ur) ur.checked = true
      }
      if (typeof d.urgentDays === 'number') urgentDays.value = String(d.urgentDays)
      if (typeof d.otherReminderDays === 'number') otherDays.value = String(d.otherReminderDays)
    }
  }
  syncUrgencyFields()
  updateTotals()

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const sp = parseNumOrNull(salePrice.value)
    const cr = parseNumOrNull(cashReceived.value)
    const dues = computeDues(sp, cr)

    const u = getUrgency()
    const urgentN = u === 'urgent' ? parseNumOrNull(urgentDays.value) : null
    const otherN = u === 'other' ? parseNumOrNull(otherDays.value) : null

    const now = new Date()
    const core = {
      entryDate: entryDate.value || now.toISOString().slice(0, 10),
      name: name.value.trim(),
      fatherName: fatherName.value.trim(),
      cnic: formatCnicDigits(cnic.value.trim()),
      trackingId: trackingId.value.trim(),
      reference: reference.value.trim(),
      weaponNumber: weaponNumber.value.trim(),
      policeStation: policeStation.value.trim(),
      mobileNumber: mobileNumber.value.trim(),
      category: category.value.trim(),
      costPrice: parseNumOrNull(costPrice.value),
      salePrice: sp,
      cashReceived: cr,
      totalDues: dues,
      urgency: u,
      urgentDays: urgentN,
      otherReminderDays: otherN,
    }

    const dupMatches = findDuplicateEntries(core.name, core.cnic, initial?.id)
    if (dupMatches.length > 0) {
      const proceed = await confirmProceedDespiteDuplicateEntry(dupMatches, Boolean(initial))
      if (!proceed) return
    }

    if (initial) {
      const next: Entry = {
        ...initial,
        ...core,
        id: initial.id,
        createdAt: initial.createdAt,
        manuallyCompleted: initial.manuallyCompleted,
        fees: initial.fees ?? null,
      }
      const all = loadEntries()
      const ix = all.findIndex((x) => x.id === initial.id)
      if (ix < 0) {
        msg.textContent = 'Record not found.'
        return
      }
      all[ix] = next
      saveEntries(all)
      msg.textContent = 'Updated.'
      window.setTimeout(() => opts.onBack(), 450)
      return
    }

    const newEntry: Entry = {
      ...core,
      id: cryptoId(),
      createdAt: now.toISOString(),
      manuallyCompleted: false,
      fees: null,
    }
    const all = loadEntries()
    const afterId = opts.insertAfterId ?? null
    const ix = afterId ? all.findIndex((x) => x.id === afterId) : -1
    if (ix >= 0) all.splice(ix + 1, 0, newEntry)
    else all.push(newEntry)
    saveEntries(all)
    msg.textContent = 'Saved.'
    form.reset()
    entryDate.valueAsDate = new Date()
    updateTotals()
    syncUrgencyFields()
    window.setTimeout(() => opts.onBack(), 450)
  })

  entryFooter.append(totals, msg, saveBtn)
  card.append(top, entryScroll)
  form.append(card, entryFooter)
  wrap.append(form)
  return wrap
}

function isoDateMatchesReportFilter(
  entryDate: string,
  mode: 'daily' | 'monthly' | 'custom' | 'full',
  fromIso: string,
  toIso: string,
): boolean {
  if (mode === 'full') return true
  const today = isoToday()
  if (mode === 'daily') return (entryDate || '').trim() === today
  if (mode === 'monthly') {
    const ref = new Date()
    const y = ref.getFullYear()
    const m = String(ref.getMonth() + 1).padStart(2, '0')
    return (entryDate || '').startsWith(`${y}-${m}`)
  }
  if (mode === 'custom' && fromIso && toIso) {
    const d = (entryDate || '').trim()
    return d >= fromIso && d <= toIso
  }
  return false
}

function filterReportEntries(
  entries: Entry[],
  mode: 'daily' | 'monthly' | 'custom',
  fromIso: string,
  toIso: string,
): Entry[] {
  return entries.filter((e) => isoDateMatchesReportFilter(e.entryDate, mode, fromIso, toIso))
}

type StmtRow = {
  kind: 'app' | 'weapon' | 'expense'
  date: string
  name: string
  catOrRef: string
  cost: number | null
  sale: number | null
  dues: number
  profit: number | null
  expenseAmt: number | null
}

function buildStatementRows(
  mode: 'daily' | 'monthly' | 'custom' | 'full',
  fromIso: string,
  toIso: string,
): StmtRow[] {
  const out: StmtRow[] = []
  for (const e of loadEntries()) {
    if (!isoDateMatchesReportFilter(e.entryDate, mode, fromIso, toIso)) continue
    out.push({
      kind: 'app',
      date: e.entryDate,
      name: (e.name || '').trim() || '—',
      catOrRef:
        [e.category, e.weaponNumber, e.trackingId, e.reference].map((x) => x.trim()).filter(Boolean).join(' / ') ||
        '—',
      cost: e.costPrice,
      sale: e.salePrice,
      dues: entryLineDues(e),
      profit: entryLineProfit(e),
      expenseAmt: null,
    })
  }
  for (const l of loadWeaponAllotLines()) {
    if (!isoDateMatchesReportFilter(l.entryDate, mode, fromIso, toIso)) continue
    out.push({
      kind: 'weapon',
      date: l.entryDate,
      name: (l.client || '').trim() || '—',
      catOrRef: (l.weaponNumber || '').trim() || '—',
      cost: l.costPrice,
      sale: l.salePrice,
      dues: lineDues(l),
      profit: lineProfit(l),
      expenseAmt: null,
    })
  }
  for (const x of loadExpenses()) {
    if (!isoDateMatchesReportFilter(x.entryDate, mode, fromIso, toIso)) continue
    out.push({
      kind: 'expense',
      date: x.entryDate,
      name: (x.description || '').trim() || '—',
      catOrRef: '—',
      cost: null,
      sale: null,
      dues: 0,
      profit: null,
      expenseAmt: x.amount,
    })
  }
  out.sort((a, b) => {
    const c = b.date.localeCompare(a.date)
    if (c !== 0) return c
    return a.kind.localeCompare(b.kind)
  })
  return out
}

function reportModeSubTitle(mode: 'daily' | 'monthly' | 'custom' | 'full'): string {
  if (mode === 'daily') return 'DAILY REPORT'
  if (mode === 'monthly') return 'MONTHLY REPORT'
  if (mode === 'custom') return 'CUSTOM REPORT'
  return 'FULL REPORT'
}

function stmtRowDescription(r: StmtRow): string {
  const type = r.kind === 'app' ? 'Application' : r.kind === 'weapon' ? 'Weapon allot' : 'Expense'
  const parts = [type, r.name, r.catOrRef !== '—' ? r.catOrRef : ''].map((x) => x.trim()).filter(Boolean)
  return parts.join(' · ') || '—'
}

function stmtRowPaid(r: StmtRow): number | null {
  if (r.sale == null) return null
  return Math.round(Math.max(0, r.sale - (r.dues || 0)) * 100) / 100
}

function reportPeriodLabel(mode: 'daily' | 'monthly' | 'custom' | 'full', fromIso: string, toIso: string): string {
  const f = (fromIso || '').trim()
  const t = (toIso || '').trim()
  if (mode === 'custom' && (f || t)) return `Period: ${f || '—'} → ${t || '—'}`
  if (mode === 'daily' && f) return `Period: ${f}`
  if (mode === 'monthly' && f) return `Period: ${f.slice(0, 7)}`
  if (mode === 'full') return 'Period: All records'
  return 'Period: —'
}

function printAccountStatement(mode: 'daily' | 'monthly' | 'custom' | 'full', fromIso: string, toIso: string) {
  const rows = buildStatementRows(mode, fromIso, toIso)
  const totalSale = rows.reduce((s, r) => s + (r.kind !== 'expense' && r.sale != null ? r.sale : 0), 0)
  const totalCost = rows.reduce((s, r) => s + (r.kind !== 'expense' && r.cost != null ? r.cost : 0), 0)
  const totalProfit = rows.reduce((s, r) => s + (r.profit != null ? r.profit : 0), 0)
  const totalExp = rows.reduce((s, r) => s + (r.expenseAmt != null ? r.expenseAmt : 0), 0)
  const netProfit = totalProfit - totalExp

  const esc = escHtml
  const now = new Date()
  let idx = 0
  const trs = rows
    .map((r) => {
      idx += 1
      const paid = stmtRowPaid(r)
      const duesHi = r.kind !== 'expense' && r.dues > 0.001
      const profHi = r.profit != null && Math.abs(r.profit) > 0.001
      return `<tr class="${r.kind === 'expense' ? 'row-exp' : ''}">
        <td class="col-id">${idx}</td>
        <td class="col-date">${esc(formatDateDisplay(r.date))}</td>
        <td class="col-desc">${esc(stmtRowDescription(r))}</td>
        <td class="num">${esc(stmtPrintDebitCredit(r.sale))}</td>
        <td class="num">${esc(stmtPrintDebitCredit(paid))}</td>
        <td class="num${duesHi ? ' dues-hi' : ''}">${esc(stmtPrintDebitCredit(r.kind === 'expense' ? null : r.dues))}</td>
        <td class="num">${esc(stmtPrintDebitCredit(r.expenseAmt))}</td>
        <td class="num${profHi ? ' profit-hi' : ''}">${esc(stmtPrintDebitCredit(r.profit))}</td>
      </tr>`
    })
    .join('')

  const periodLine = reportPeriodLabel(mode, fromIso, toIso)
  const printedWhen = `${formatHeaderDate(now)} | ${formatHeaderTime(now)}`
  const doc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Statement — ${escAttr(PRINT_INVOICE_SHOP.name)}</title>
<style>${PRINT_EXCEL_REPORT_CSS}</style>
</head><body>
<div class="page">
  <div class="hdr">
    <div class="shop">
      <div class="name">${esc(PRINT_INVOICE_SHOP.name)}</div>
      <div class="line">${esc(PRINT_INVOICE_SHOP.phone)}</div>
    </div>
    <div class="stmt-hd">
      <div class="title">STATEMENT</div>
      <div class="sub">${esc(reportModeSubTitle(mode))}</div>
      <div class="when">${esc(printedWhen)}</div>
    </div>
  </div>
  <hr class="rule" />
  <div class="period-line">${esc(periodLine)} | Records: ${rows.length} | Apps + Weapon + Expenses</div>
  <div class="stmt-table-wrap">
  <table class="stmt-table excel-report">
    <colgroup>
      <col style="width:5%" /><col style="width:10%" /><col style="width:28%" />
      <col style="width:11%" /><col style="width:11%" /><col style="width:11%" />
      <col style="width:11%" /><col style="width:11%" />
    </colgroup>
    <thead><tr>
      <th class="col-id">ID</th><th class="col-date">Date</th><th class="col-desc">Description</th>
      <th class="num">Sale</th><th class="num">Paid</th><th class="num">Dues</th>
      <th class="num">Expense</th><th class="num">Profit</th>
    </tr></thead>
    <tbody>${trs || '<tr><td colspan="8">—</td></tr>'}</tbody>
  </table>
  </div>
  <div class="fin-wrap">
    <div class="fin-box">
      <div class="fin-title">FINANCIAL SUMMARY</div>
      <div class="fin-row"><span>Total Sales</span><span>${esc(stmtPrintMoney(totalSale))}</span></div>
      <div class="fin-row"><span>Total Cost</span><span>${esc(stmtPrintMoney(totalCost))}</span></div>
      <div class="fin-row"><span>Total Expenses</span><span>${esc(stmtPrintMoney(totalExp))}</span></div>
      <div class="fin-row net"><span>NET PROFIT</span><span>${esc(stmtPrintMoney(netProfit))}</span></div>
    </div>
  </div>
  <div class="foot"><div>*** This is a Computer Generated Print ***</div><div class="p2">POWERED BY GUL CORPORATION LLC</div></div>
</div>
</body></html>`
  printFullDocument(doc)
}

const PRINT_EXCEL_REPORT_CSS = `
  @page { size: A4 portrait; margin: 10mm; }
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;width:100%;max-width:100%;overflow-x:hidden;font-family:Arial,'Segoe UI',Helvetica,sans-serif;font-size:10px;color:#000;background:#fff;}
  .page{width:100%;max-width:100%;margin:0;padding:0;}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;width:100%;}
  .shop{flex:1;min-width:0;}
  .shop .name{font-size:16px;font-weight:700;line-height:1.15;}
  .shop .line{margin-top:3px;font-size:10px;}
  .stmt-hd{flex:0 0 auto;text-align:right;max-width:48%;}
  .stmt-hd .title{font-size:17px;font-weight:700;}
  .stmt-hd .sub{margin-top:2px;font-size:10px;font-weight:700;}
  .stmt-hd .when{margin-top:2px;font-size:9px;line-height:1.3;}
  .rule{border:none;border-top:3px solid #000;margin:10px 0 12px;width:100%;}
  .period-line{margin:0 0 10px;font-size:10px;font-weight:700;width:100%;}
  .stmt-table-wrap{width:100%;max-width:100%;overflow:hidden;}
  .stmt-table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed;font-size:10px;}
  .stmt-table th,.stmt-table td{border:1px solid #000;padding:4px 5px;vertical-align:middle;overflow:hidden;text-overflow:ellipsis;}
  .stmt-table thead th{background:#f2f2f2;font-weight:700;font-size:9px;line-height:1.2;}
  .stmt-table th.num,.stmt-table td.num{text-align:right;font-size:9px;padding:4px 3px;white-space:normal;word-break:break-word;}
  .stmt-table .col-id{text-align:center;white-space:nowrap;}
  .stmt-table .col-date{white-space:nowrap;font-size:9px;}
  .stmt-table .col-desc{word-break:break-word;overflow-wrap:break-word;line-height:1.25;}
  .stmt-table tr.row-exp td{background:#fff7ed;}
  .stmt-table td.dues-hi{color:#dc2626;font-weight:700;}
  .stmt-table td.profit-hi{color:#15803d;font-weight:700;}
  .fin-wrap{display:flex;justify-content:flex-end;margin-top:20px;width:100%;}
  .fin-box{width:260px;max-width:46%;border:2px solid #000;flex-shrink:0;}
  .fin-title{text-align:center;font-weight:700;font-size:10px;padding:6px 8px;border-bottom:1px solid #000;}
  .fin-row{display:flex;justify-content:space-between;gap:8px;padding:5px 8px;border-bottom:1px solid #bdbdbd;font-weight:700;font-size:10px;}
  .fin-row:last-child{border-bottom:none;}
  .fin-row.net{color:#15803d;font-size:11px;padding:7px 8px;}
  .foot{margin-top:36px;text-align:center;font-size:9px;line-height:1.5;width:100%;}
  .foot .p2{margin-top:4px;font-weight:700;}
  @media print{
    html,body{width:100%;overflow:visible;}
    .page{width:100%;}
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  }
`


type ClientDetailHit =
  | { kind: 'app'; entry: Entry }
  | { kind: 'weapon'; line: WeaponAllotLine }
  | { kind: 'general'; row: GeneralEntryLine }

function matchesClientDetailSearch(qRaw: string, parts: string[]): boolean {
  const n = qRaw.trim().toLowerCase()
  if (!n) return false
  const blob = parts.join(' ').toLowerCase()
  const tokens = n.split(/\s+/).filter(Boolean)
  if (!tokens.length) return false
  return tokens.every((t) => blob.includes(t))
}

type ClientDetailSuggest = {
  label: string
  field: 'name' | 'reference' | 'client'
  src: 'appl' | 'wepl' | 'gen'
}

function clientDetailSuggestHint(s: ClientDetailSuggest): string {
  const field =
    s.field === 'name' ? 'Name' : s.field === 'reference' ? 'Reference' : 'Client'
  return `${field} · ${s.src}`
}

/** Unique name / reference / client strings for search autocomplete (all records). */
function buildClientDetailSearchSuggestions(): ClientDetailSuggest[] {
  const seen = new Set<string>()
  const out: ClientDetailSuggest[] = []
  const add = (raw: string, field: ClientDetailSuggest['field'], src: ClientDetailSuggest['src']) => {
    const label = raw.trim()
    if (!label || label === '—') return
    const key = `${src}:${field}:${label.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ label, field, src })
  }

  for (const e of loadEntries()) {
    add(e.name, 'name', 'appl')
    add(e.reference, 'reference', 'appl')
    add(e.cnic, 'reference', 'appl')
    add(e.trackingId, 'reference', 'appl')
    add(e.category, 'reference', 'appl')
  }
  for (const l of loadWeaponAllotLines()) {
    add(l.client || '', 'client', 'wepl')
  }
  for (const r of loadGeneralEntries()) {
    if (r.kind !== 'dues') continue
    add(r.name, 'name', 'gen')
    add(r.description, 'name', 'gen')
    add(generalEntryDisplayName(r), 'name', 'gen')
  }

  out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
  return out
}

function filterClientDetailSuggestions(
  query: string,
  all: ClientDetailSuggest[],
): ClientDetailSuggest[] {
  const n = query.trim().toLowerCase()
  if (!n) return []
  const tokens = n.split(/\s+/).filter(Boolean)
  if (!tokens.length) return []

  const matched = all.filter((s) => {
    const blob = s.label.toLowerCase()
    return tokens.every((t) => blob.includes(t))
  })

  matched.sort((a, b) => {
    const al = a.label.toLowerCase()
    const bl = b.label.toLowerCase()
    const aPri = al.startsWith(n) ? 0 : tokens.every((t) => al.startsWith(t)) ? 1 : 2
    const bPri = bl.startsWith(n) ? 0 : tokens.every((t) => bl.startsWith(t)) ? 1 : 2
    if (aPri !== bPri) return aPri - bPri
    return al.localeCompare(bl, undefined, { sensitivity: 'base' })
  })
  return matched.slice(0, 30)
}

function collectClientDetailHits(query: string): ClientDetailHit[] {
  const out: ClientDetailHit[] = []
  const q = query
  if (!q.trim()) return out
  const hitIds = new Set<string>()
  const linkKeys = new Set<string>()

  const pushHit = (h: ClientDetailHit) => {
    const id = h.kind === 'app' ? `app:${h.entry.id}` : h.kind === 'weapon' ? `wep:${h.line.id}` : `gen:${h.row.id}`
    if (hitIds.has(id)) return
    hitIds.add(id)
    out.push(h)
    if (h.kind === 'app') {
      const n = h.entry.name.trim().toLowerCase()
      const r = h.entry.reference.trim().toLowerCase()
      if (n) linkKeys.add(n)
      if (r) linkKeys.add(r)
    } else if (h.kind === 'weapon') {
      const c = (h.line.client || '').trim().toLowerCase()
      if (c) linkKeys.add(c)
    } else {
      const n = h.row.name.trim().toLowerCase()
      if (n) linkKeys.add(n)
    }
  }

  for (const e of loadEntries()) {
    const parts = [
      e.name,
      e.fatherName,
      e.cnic,
      e.trackingId,
      e.reference,
      e.mobileNumber,
      e.policeStation,
      e.category,
      e.weaponNumber,
    ]
    if (matchesClientDetailSearch(q, parts)) pushHit({ kind: 'app', entry: e })
  }
  for (const l of loadWeaponAllotLines()) {
    if (matchesClientDetailSearch(q, [l.client, l.weaponNumber])) pushHit({ kind: 'weapon', line: l })
  }
  for (const r of loadGeneralEntries()) {
    if (r.kind !== 'dues') continue
    if (matchesClientDetailSearch(q, [r.name, r.description])) pushHit({ kind: 'general', row: r })
  }

  for (const key of linkKeys) {
    if (!key) continue
    for (const e of loadEntries()) {
      const parts = [e.name, e.reference, e.cnic, e.trackingId]
      if (parts.some((p) => (p || '').trim().toLowerCase().includes(key))) pushHit({ kind: 'app', entry: e })
    }
    for (const l of loadWeaponAllotLines()) {
      if ((l.client || '').trim().toLowerCase().includes(key)) pushHit({ kind: 'weapon', line: l })
    }
    for (const r of loadGeneralEntries()) {
      if (r.kind !== 'dues') continue
      const parts = [r.name, r.description]
      if (parts.some((p) => (p || '').trim().toLowerCase().includes(key))) pushHit({ kind: 'general', row: r })
    }
  }

  out.sort((a, b) => {
    const da = a.kind === 'app' ? a.entry.entryDate : a.kind === 'weapon' ? a.line.entryDate : a.row.entryDate
    const db = b.kind === 'app' ? b.entry.entryDate : b.kind === 'weapon' ? b.line.entryDate : b.row.entryDate
    const c0 = db.localeCompare(da)
    if (c0 !== 0) return c0
    const ia = a.kind === 'app' ? a.entry.id : a.kind === 'weapon' ? a.line.id : a.row.id
    const ib = b.kind === 'app' ? b.entry.id : b.kind === 'weapon' ? b.line.id : b.row.id
    return ia.localeCompare(ib)
  })
  return out
}

function renderClientDetailLedgerTableHtml(ledger: ClientDuesLedgerRow[]): string {
  const esc = escHtml
  if (!ledger.length) {
    return `<tr><td colspan="10" class="empty">No ledger rows for this search.</td></tr>`
  }
  return ledger
    .map((r) => {
      const rowCls = r.hasOpenDues ? ' class="row-open-dues"' : ''
      const recv =
        r.rowReceived != null
          ? formatRs(r.rowReceived)
          : r.credit != null && r.credit > 0
            ? formatRs(r.credit)
            : '—'
      const bal = r.rowBalance != null ? formatRs(r.rowBalance) : '—'
      return `<tr${rowCls}>
        <td>${esc(r.srcTag ?? '—')}</td>
        <td>${esc(r.date)}</td>
        <td>${esc(r.colName)}</td>
        <td>${esc(r.colReference)}</td>
        <td>${esc(r.colClient)}</td>
        <td>${esc(r.note)}</td>
        <td class="num">${esc(recv)}</td>
        <td class="num">${esc(bal)}</td>
        <td class="num">${esc(r.debit != null ? formatRs(r.debit) : '—')}</td>
        <td class="num">${esc(r.credit != null ? formatRs(r.credit) : '—')}</td>
      </tr>`
    })
    .join('')
}

function openClientDetailStatementModal(opts: { onRefresh?: () => void }) {
  if (document.querySelector('.client-stmt-modal-overlay')) return
  const overlay = makeEl('div', { className: 'dues-modal-overlay client-stmt-modal-overlay' })
  const modal = makeEl('div', { className: 'client-stmt-modal' })
  overlay.append(modal)
  document.body.append(overlay)

  const tearDown = () => {
    document.removeEventListener('keydown', onEscKey, true)
    if (overlay.isConnected) overlay.remove()
  }
  const onEscKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (modal.querySelector('.client-stmt-suggest.is-open')) return
      e.preventDefault()
      tearDown()
    }
  }
  document.addEventListener('keydown', onEscKey, true)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) tearDown()
  })

  modal.innerHTML = `
    <div class="client-stmt-hd">
      <div class="client-stmt-title">Client Detail Statement</div>
      <button type="button" class="btn ghost sm client-stmt-close" aria-label="Close">✕</button>
    </div>
    <div class="client-stmt-search-row">
      <label class="client-stmt-lbl">Search (name · reference · weapon client · general)</label>
      <div class="client-stmt-search-wrap">
        <input type="search" class="in client-stmt-search-in" spellcheck="false" autocomplete="off" placeholder="e.g. adnan — type karke list se select karein" />
        <div class="client-stmt-suggest" role="listbox" aria-label="Search suggestions"></div>
      </div>
      <button type="button" class="btn primary client-stmt-go">${ICON_SEARCH}<span>Search</span></button>
    </div>
    <div class="client-stmt-summary"></div>
    <div class="client-stmt-table-wrap table">
      <table class="client-stmt-table">
        <thead>
          <tr>
            <th>Cat</th><th>Date &amp; Time</th><th>Name</th><th>Reference</th><th>Client</th><th>Note</th><th>Received</th><th>Balance</th><th>Debit</th><th>Credit</th>
          </tr>
        </thead>
        <tbody class="client-stmt-tbody"></tbody>
      </table>
    </div>
    <div class="client-stmt-fin"></div>
    <div class="client-stmt-actions">
      <button type="button" class="btn primary client-stmt-print">${ICON_RECEIPT}<span>Print statement</span></button>
      <button type="button" class="btn ghost client-stmt-close2">Close</button>
    </div>`

  const searchIn = modal.querySelector<HTMLInputElement>('.client-stmt-search-in')!
  const suggestEl = modal.querySelector<HTMLDivElement>('.client-stmt-suggest')!
  const summaryEl = modal.querySelector<HTMLDivElement>('.client-stmt-summary')!
  const tbody = modal.querySelector<HTMLTableSectionElement>('.client-stmt-tbody')!
  const finEl = modal.querySelector<HTMLDivElement>('.client-stmt-fin')!
  const esc = escHtml
  const allSuggestions = buildClientDetailSearchSuggestions()

  let lastHits: ClientDetailHit[] = []
  let lastLedger: ClientDuesLedgerRow[] = []
  let suggestItems: ClientDetailSuggest[] = []
  let suggestActive = -1

  const closeSuggest = () => {
    suggestActive = -1
    suggestEl.classList.remove('is-open')
    suggestEl.innerHTML = ''
    suggestEl.removeAttribute('aria-activedescendant')
  }

  const renderSuggest = (q: string) => {
    suggestItems = filterClientDetailSuggestions(q, allSuggestions)
    suggestActive = -1
    if (!q.trim() || !suggestItems.length) {
      closeSuggest()
      return
    }
    suggestEl.innerHTML = suggestItems
      .map((s, i) => {
        const hint = clientDetailSuggestHint(s)
        return `<button type="button" class="client-stmt-suggest-item" role="option" id="client-stmt-sug-${i}" data-idx="${i}">
          <span class="client-stmt-suggest-label">${esc(s.label)}</span>
          <span class="client-stmt-suggest-hint">${esc(hint)}</span>
        </button>`
      })
      .join('')
    suggestEl.classList.add('is-open')
  }

  const highlightSuggest = (idx: number) => {
    suggestActive = idx
    suggestEl.querySelectorAll<HTMLButtonElement>('.client-stmt-suggest-item').forEach((btn, i) => {
      btn.classList.toggle('is-active', i === idx)
      if (i === idx) {
        suggestEl.setAttribute('aria-activedescendant', btn.id)
        btn.scrollIntoView({ block: 'nearest' })
      }
    })
    if (idx < 0) suggestEl.removeAttribute('aria-activedescendant')
  }

  const pickSuggestion = (s: ClientDetailSuggest) => {
    searchIn.value = s.label
    closeSuggest()
    runSearch()
  }

  const runSearch = () => {
    closeSuggest()
    const q = searchIn.value.trim()
    if (!q) {
      lastHits = []
      lastLedger = []
      summaryEl.textContent = 'Name likhein — application, weapon allot, aur general dues teeno check honge.'
      tbody.innerHTML = `<tr><td colspan="10" class="empty">Search karein.</td></tr>`
      finEl.innerHTML = ''
      return
    }
    lastHits = collectClientDetailHits(q)
    if (!lastHits.length) {
      lastLedger = []
      summaryEl.textContent = `Search: "${q}" — koi record nahi mila.`
      tbody.innerHTML = `<tr><td colspan="10" class="empty">No matching records.</td></tr>`
      finEl.innerHTML = ''
      return
    }
    const range = clientDetailAllTimeRange(lastHits)
    lastLedger = refreshLedgerRowAmounts(
      buildClientSearchLedgerRows(lastHits, range.fromIso, range.toIso),
    )
    const sumDebit = lastLedger.reduce((s, r) => s + (r.debit != null ? r.debit : 0), 0)
    const sumCredit = lastLedger.reduce((s, r) => s + (r.credit != null ? r.credit : 0), 0)
    const outstanding = computeClientDetailOutstanding(lastHits)
    const appl = lastHits.filter((h) => h.kind === 'app').length
    const wepl = lastHits.filter((h) => h.kind === 'weapon').length
    const gen = lastHits.filter((h) => h.kind === 'general').length
    summaryEl.textContent = `Search: "${q}" | appl ${appl} · wepl ${wepl} · gen ${gen} | Period: ${range.fromIso} → ${range.toIso}`
    tbody.innerHTML = renderClientDetailLedgerTableHtml(lastLedger)
    finEl.innerHTML = `
      <div class="client-stmt-fin-box">
        <div class="client-stmt-fin-row"><span>Total Debit</span><b>${esc(formatRs(sumDebit))}</b></div>
        <div class="client-stmt-fin-row"><span>Total Credit</span><b>${esc(formatRs(sumCredit))}</b></div>
        <div class="client-stmt-fin-row client-stmt-fin-baqi"><span>Balance (baqi) — Pending Dues jaisa</span><b>${esc(formatRs(outstanding))}</b></div>
      </div>`
  }

  searchIn.addEventListener('input', () => renderSuggest(searchIn.value))
  searchIn.addEventListener('focus', () => {
    if (searchIn.value.trim()) renderSuggest(searchIn.value)
  })
  searchIn.addEventListener('blur', () => {
    window.setTimeout(() => closeSuggest(), 160)
  })
  searchIn.addEventListener('keydown', (ev) => {
    const open = suggestEl.classList.contains('is-open')
    if (ev.key === 'ArrowDown' && open) {
      ev.preventDefault()
      highlightSuggest(Math.min(suggestActive + 1, suggestItems.length - 1))
      return
    }
    if (ev.key === 'ArrowUp' && open) {
      ev.preventDefault()
      highlightSuggest(Math.max(suggestActive - 1, 0))
      return
    }
    if (ev.key === 'Escape') {
      if (open) {
        ev.preventDefault()
        ev.stopPropagation()
        closeSuggest()
      }
      return
    }
    if (ev.key === 'Enter') {
      if (open && suggestActive >= 0 && suggestItems[suggestActive]) {
        ev.preventDefault()
        pickSuggestion(suggestItems[suggestActive])
        return
      }
      closeSuggest()
      runSearch()
    }
  })
  suggestEl.addEventListener('mousedown', (ev) => ev.preventDefault())
  suggestEl.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('.client-stmt-suggest-item')
    if (!btn) return
    const idx = Number(btn.dataset.idx)
    if (!Number.isFinite(idx) || !suggestItems[idx]) return
    pickSuggestion(suggestItems[idx])
  })
  modal.querySelector('.client-stmt-go')?.addEventListener('click', () => {
    closeSuggest()
    runSearch()
  })
  modal.querySelectorAll('.client-stmt-close, .client-stmt-close2').forEach((b) => {
    b.addEventListener('click', tearDown)
  })
  modal.querySelector('.client-stmt-print')?.addEventListener('click', async () => {
    const q = searchIn.value.trim()
    if (!q || !lastHits.length) {
      window.alert('Pehle search karein.')
      return
    }
    const range = await promptDateRangeModal({
      title: 'Client statement print',
      subtitle: 'From — To (poori history ke liye pehle se dates chhod dein)',
    })
    if (!range) return
    const ledger = refreshLedgerRowAmounts(
      buildClientSearchLedgerRows(lastHits, range.fromIso, range.toIso),
    )
    if (!ledger.length) {
      window.alert('Is date range mein koi record nahi mila.')
      return
    }
    const outstanding = computeClientDetailOutstanding(lastHits)
    printClientLedgerDocument({
      title: `Client detail — ${q}`,
      subTitle: 'CLIENT DETAIL STATEMENT',
      clientLine: `Search: ${q} | Period: ${range.fromIso} → ${range.toIso} | appl · wepl · gen`,
      ledger,
      showSrcCol: true,
      outstandingBalance: outstanding,
    })
    opts.onRefresh?.()
  })

  queueMicrotask(() => {
    overlay.classList.add('is-open')
    searchIn.focus()
    runSearch()
  })
}

function makeSearchScreen(opts: { onBack: () => void; onEdit: (e: Entry) => void }) {
  const wrap = makeEl('section', { className: 'sub-screen search-screen' })
  const head = makeEl('div', { className: 'sub-head' })
  const back = makeEl('button', { className: 'mini back', attrs: { type: 'button' } }) as HTMLButtonElement
  back.textContent = '← Main Screen (ESC)'
  back.addEventListener('click', () => opts.onBack())
  const title = makeEl('div', { className: 'sub-title', text: 'Search Applications' })
  head.append(back, title)

  const split = makeEl('div', { className: 'search-split' })
  const main = makeEl('div', { className: 'search-main' })
  const hint = makeEl('p', {
    className: 'search-hint',
    text: 'Search by: Name / NIC / Tracking ID / Mobile / Police Station',
  })
  const bar = makeEl('div', { className: 'search-bar-row' })
  const searchIn = makeEl('input', {
    className: 'in search-in',
    attrs: { type: 'search', placeholder: 'Type and press Search…', 'aria-label': 'Search applications' },
  }) as HTMLInputElement
  const go = makeEl('button', { className: 'btn primary search-go', attrs: { type: 'button' } }) as HTMLButtonElement
  go.innerHTML = `${ICON_SEARCH}<span>Search</span>`
  const goPolice = makeEl('button', { className: 'btn ghost search-go search-go-police', attrs: { type: 'button' } }) as HTMLButtonElement
  goPolice.innerHTML = `${ICON_SEARCH}<span>Police Station</span>`
  bar.append(searchIn, go, goPolice)

  const status = makeEl('div', { className: 'search-status' })
  const tableWrap = makeEl('div', { className: 'table search-table' })
  tableWrap.innerHTML = `
    <table>
      <thead>
        <tr><th>ID</th><th>Date</th><th>Name</th><th>CNIC</th><th>Tracking ID</th><th>Mobile</th></tr>
      </thead>
      <tbody class="search-tbody"></tbody>
    </table>`
  const tbody = tableWrap.querySelector<HTMLTableSectionElement>('.search-tbody')

  const detail = makeEl('aside', { className: 'search-detail' })
  detail.innerHTML = `
    <div class="search-detail-hd">Detail</div>
    <div class="search-detail-body"></div>
    <div class="search-detail-actions"></div>`
  const detailBody = detail.querySelector<HTMLDivElement>('.search-detail-body')!
  const detailActs = detail.querySelector<HTMLDivElement>('.search-detail-actions')!

  let selectedId: string | null = null
  let lastList: Entry[] = []

  const escCell = (s: string) => s.replaceAll('<', '&lt;')

  const renderDetail = (e: Entry | null) => {
    if (!e) {
      detailBody.innerHTML = `<p class="search-detail-empty">Select a row to see details.</p>`
      detailActs.innerHTML = ''
      return
    }
    const st = entryStatusLabel(e)
    detailBody.innerHTML = `
      <div class="search-dl"><span class="search-dk">Name</span><span class="search-dv">${escCell(e.name || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">Father</span><span class="search-dv">${escCell(e.fatherName || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">CNIC</span><span class="search-dv">${escCell(e.cnic || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">Tracking ID</span><span class="search-dv">${escCell(e.trackingId || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">Mobile</span><span class="search-dv">${escCell(e.mobileNumber || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">Category</span><span class="search-dv">${escCell(e.category || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">Police Station</span><span class="search-dv">${escCell(e.policeStation || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">Status</span><span class="search-dv"><span class="pill ${st.toLowerCase()}">${st}</span></span></div>
      <div class="search-dl"><span class="search-dk">Sale Price</span><span class="search-dv">${e.salePrice !== null ? formatRs(e.salePrice) : '—'}</span></div>
      <div class="search-dl"><span class="search-dk">Dues</span><span class="search-dv">${formatRs(e.totalDues)}</span></div>
      <div class="search-dl"><span class="search-dk">Date</span><span class="search-dv">${formatDateDisplay(e.entryDate)}</span></div>`
    detailActs.innerHTML = `
      <button type="button" class="btn primary sm sdet-edit btn-ico-lbl">${ICON_EDIT_IMG}<span>Edit</span></button>
      <button type="button" class="btn ghost sm sdet-bill">Print bill</button>
      <button type="button" class="btn ghost sm sdet-detail">Print detail</button>
      <button type="button" class="btn danger sm sdet-bin">Move to bin</button>`
    detailActs.querySelector('.sdet-edit')?.addEventListener('click', () => opts.onEdit(e))
    detailActs.querySelector('.sdet-bill')?.addEventListener('click', () => printClientBill(e))
    detailActs.querySelector('.sdet-detail')?.addEventListener('click', () => printClientDetail(e))
    detailActs.querySelector('.sdet-bin')?.addEventListener('click', async () => {
      if (
        !(await confirmModal({
          title: 'Move to Recycle Bin',
          message:
            'Move this record to the Recycle Bin?\n\nIt will be removed from the main list until you restore it or delete it permanently from the bin.',
          confirmText: 'Move',
          cancelText: 'Cancel',
          variant: 'danger',
        }))
      )
        return
      moveEntryToRecycle(e.id)
      selectedId = null
      runSearch()
    })
  }

  const matchesPoliceStation = (e: Entry, q: string) => {
    const t = q.trim().toLowerCase()
    if (!t) return false
    return (e.policeStation || '').toLowerCase().includes(t)
  }

  const runSearch = () => {
    const q = searchIn.value
    const t = q.trim()
    lastList = t ? loadEntries().filter((x) => entryMatchesQuery(x, q)).slice().reverse() : []
    status.textContent = t
      ? `Found: ${lastList.length} record(s)`
      : 'Enter text and press Search.'
    status.classList.toggle('search-status-ok', Boolean(t && lastList.length))
    const esc = escCell
    if (tbody) {
      tbody.innerHTML =
        lastList
          .map((e, i) => {
            const sel = e.id === selectedId ? ' is-selected' : ''
            return `<tr class="search-row${sel}" data-entry-id="${e.id}" tabindex="0">
              <td>${i + 1}</td>
              <td>${esc(e.entryDate || '—')}</td>
              <td>${esc(e.name || '—')}</td>
              <td>${esc(e.cnic || '—')}</td>
              <td>${esc(e.trackingId || '—')}</td>
              <td>${esc(e.mobileNumber || '—')}</td>
            </tr>`
          })
          .join('') || (t ? `<tr><td colspan="6" class="empty">No matches.</td></tr>` : `<tr><td colspan="6" class="empty">No search yet.</td></tr>`)
    }
    let cur = selectedId ? loadEntries().find((x) => x.id === selectedId) : null
    if (selectedId && !cur) selectedId = null
    cur = selectedId ? loadEntries().find((x) => x.id === selectedId) : null
    renderDetail(cur ?? null)
  }

  const runPoliceSearch = () => {
    const q = searchIn.value
    const t = q.trim()
    lastList = t ? loadEntries().filter((x) => matchesPoliceStation(x, q)).slice().reverse() : []
    status.textContent = t
      ? `Found: ${lastList.length} record(s) — Police Station`
      : 'Enter police station name and press Police Station.'
    status.classList.toggle('search-status-ok', Boolean(t && lastList.length))
    const esc = escCell
    if (tbody) {
      tbody.innerHTML =
        lastList
          .map((e, i) => {
            const sel = e.id === selectedId ? ' is-selected' : ''
            return `<tr class="search-row${sel}" data-entry-id="${e.id}" tabindex="0">
              <td>${i + 1}</td>
              <td>${esc(e.entryDate || '—')}</td>
              <td>${esc(e.name || '—')}</td>
              <td>${esc(e.cnic || '—')}</td>
              <td>${esc(e.trackingId || '—')}</td>
              <td>${esc(e.mobileNumber || '—')}</td>
            </tr>`
          })
          .join('') ||
        (t ? `<tr><td colspan="6" class="empty">No matches.</td></tr>` : `<tr><td colspan="6" class="empty">No search yet.</td></tr>`)
    }
    let cur = selectedId ? loadEntries().find((x) => x.id === selectedId) : null
    if (selectedId && !cur) selectedId = null
    cur = selectedId ? loadEntries().find((x) => x.id === selectedId) : null
    renderDetail(cur ?? null)
  }

  tbody?.addEventListener('click', (ev) => {
    const tr = (ev.target as HTMLElement).closest<HTMLTableRowElement>('tr.search-row[data-entry-id]')
    if (!tr) return
    selectedId = tr.getAttribute('data-entry-id')
    tbody?.querySelectorAll('tr.search-row').forEach((r) => r.classList.remove('is-selected'))
    tr.classList.add('is-selected')
    const e = lastList.find((x) => x.id === selectedId) ?? loadEntries().find((x) => x.id === selectedId)
    renderDetail(e ?? null)
  })

  go.addEventListener('click', () => runSearch())
  goPolice.addEventListener('click', () => runPoliceSearch())
  searchIn.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') runSearch()
  })

  main.append(hint, bar, status, tableWrap)
  split.append(main, detail)
  wrap.append(head, split)
  renderDetail(null)
  return wrap
}

function makePoliceStationSearchScreen(opts: { onBack: () => void; onEdit: (e: Entry) => void }) {
  const wrap = makeEl('section', { className: 'sub-screen search-screen' })
  const head = makeEl('div', { className: 'sub-head' })
  const back = makeEl('button', { className: 'mini back', attrs: { type: 'button' } }) as HTMLButtonElement
  back.textContent = '← Main Screen (ESC)'
  back.addEventListener('click', () => opts.onBack())
  const title = makeEl('div', { className: 'sub-title', text: 'Search by Police Station' })
  head.append(back, title)

  const split = makeEl('div', { className: 'search-split' })
  const main = makeEl('div', { className: 'search-main' })
  const hint = makeEl('p', {
    className: 'search-hint',
    text: 'Type Police Station name and press Search (Completed records are excluded).',
  })
  const bar = makeEl('div', { className: 'search-bar-row' })
  const searchIn = makeEl('input', {
    className: 'in search-in',
    attrs: { type: 'search', placeholder: 'Police station…', 'aria-label': 'Search by police station' },
  }) as HTMLInputElement
  const go = makeEl('button', { className: 'btn primary search-go', attrs: { type: 'button' } }) as HTMLButtonElement
  go.innerHTML = `${ICON_SEARCH}<span>Search</span>`
  bar.append(searchIn, go)

  const status = makeEl('div', { className: 'search-status' })
  const tableWrap = makeEl('div', { className: 'table search-table' })
  tableWrap.innerHTML = `
    <table>
      <thead>
        <tr><th>#</th><th>Date</th><th>Name</th><th>Father</th><th>CNIC</th></tr>
      </thead>
      <tbody class="search-tbody"></tbody>
    </table>`
  const tbody = tableWrap.querySelector<HTMLTableSectionElement>('.search-tbody')

  const detail = makeEl('aside', { className: 'search-detail' })
  detail.innerHTML = `
    <div class="search-detail-hd">Detail</div>
    <div class="search-detail-body"></div>
    <div class="search-detail-actions"></div>`
  const detailBody = detail.querySelector<HTMLDivElement>('.search-detail-body')!
  const detailActs = detail.querySelector<HTMLDivElement>('.search-detail-actions')!

  let selectedId: string | null = null
  let lastList: Entry[] = []

  const escCell = (s: string) => s.replaceAll('<', '&lt;')

  const renderDetail = (e: Entry | null) => {
    if (!e) {
      detailBody.innerHTML = `<p class="search-detail-empty">Select a row to see details.</p>`
      detailActs.innerHTML = ''
      return
    }
    const st = entryStatusLabel(e)
    detailBody.innerHTML = `
      <div class="search-dl"><span class="search-dk">Name</span><span class="search-dv">${escCell(e.name || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">Father</span><span class="search-dv">${escCell(e.fatherName || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">CNIC</span><span class="search-dv">${escCell(e.cnic || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">Tracking ID</span><span class="search-dv">${escCell(e.trackingId || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">Mobile</span><span class="search-dv">${escCell(e.mobileNumber || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">Police Station</span><span class="search-dv">${escCell(e.policeStation || '—')}</span></div>
      <div class="search-dl"><span class="search-dk">Status</span><span class="search-dv"><span class="pill ${st.toLowerCase()}">${st}</span></span></div>
      <div class="search-dl"><span class="search-dk">Date</span><span class="search-dv">${formatDateDisplay(e.entryDate)}</span></div>`
    detailActs.innerHTML = `
      <button type="button" class="btn primary sm sdet-edit btn-ico-lbl">${ICON_EDIT_IMG}<span>Edit</span></button>
      <button type="button" class="btn ghost sm sdet-bill">Print bill</button>
      <button type="button" class="btn ghost sm sdet-detail">Print detail</button>`
    detailActs.querySelector('.sdet-edit')?.addEventListener('click', () => opts.onEdit(e))
    detailActs.querySelector('.sdet-bill')?.addEventListener('click', () => printClientBill(e))
    detailActs.querySelector('.sdet-detail')?.addEventListener('click', () => printClientDetail(e))
  }

  const matchesPolice = (e: Entry, q: string) => {
    if (e.manuallyCompleted) return false
    const t = q.trim().toLowerCase()
    if (!t) return false
    return (e.policeStation || '').toLowerCase().includes(t)
  }

  const runSearch = () => {
    const q = searchIn.value
    const t = q.trim()
    lastList = t ? loadEntries().filter((x) => matchesPolice(x, q)).slice().reverse() : []
    status.textContent = t ? `Found: ${lastList.length} record(s)` : 'Enter police station and press Search.'
    status.classList.toggle('search-status-ok', Boolean(t && lastList.length))
    const esc = escCell
    if (tbody) {
      tbody.innerHTML =
        lastList
          .map((e, i) => {
            const sel = e.id === selectedId ? ' is-selected' : ''
            return `<tr class="search-row${sel}" data-entry-id="${e.id}" tabindex="0">
              <td>${i + 1}</td>
              <td>${esc(e.entryDate || '—')}</td>
              <td>${esc(e.name || '—')}</td>
              <td>${esc(e.fatherName || '—')}</td>
              <td>${esc(e.cnic || '—')}</td>
            </tr>`
          })
          .join('') || (t ? `<tr><td colspan="5" class="empty">No matches.</td></tr>` : `<tr><td colspan="5" class="empty">No search yet.</td></tr>`)
    }
    let cur = selectedId ? loadEntries().find((x) => x.id === selectedId) : null
    if (selectedId && !cur) selectedId = null
    cur = selectedId ? loadEntries().find((x) => x.id === selectedId) : null
    renderDetail(cur ?? null)
  }

  tbody?.addEventListener('click', (ev) => {
    const tr = (ev.target as HTMLElement).closest<HTMLTableRowElement>('tr.search-row[data-entry-id]')
    if (!tr) return
    selectedId = tr.getAttribute('data-entry-id')
    tbody?.querySelectorAll('tr.search-row').forEach((r) => r.classList.remove('is-selected'))
    tr.classList.add('is-selected')
    const e = lastList.find((x) => x.id === selectedId) ?? loadEntries().find((x) => x.id === selectedId)
    renderDetail(e ?? null)
  })

  go.addEventListener('click', () => runSearch())
  searchIn.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') runSearch()
  })

  main.append(hint, bar, status, tableWrap)
  split.append(main, detail)
  wrap.append(head, split)
  renderDetail(null)
  return wrap
}

function makeRecycleScreen(opts: { onBack: () => void; onChanged: () => void }) {
  const wrap = makeEl('section', { className: 'sub-screen recycle-screen' })
  const head = makeEl('div', { className: 'sub-head recycle-head' })
  const back = makeEl('button', { className: 'mini back', attrs: { type: 'button' } }) as HTMLButtonElement
  back.textContent = '← Main Screen (ESC)'
  back.addEventListener('click', () => opts.onBack())
  const title = makeEl('div', { className: 'sub-title', text: 'Recycle Bin' })
  const fire = makeEl('button', { className: 'btn danger recycle-fire', attrs: { type: 'button' } }) as HTMLButtonElement
  fire.textContent = 'Fire (empty bin)'
  fire.addEventListener('click', () => {
    if (!loadRecycle().length) return
    if (!confirm('Fire will permanently delete ALL items in the recycle bin. This cannot be undone. Continue?')) return
    fireRecycleBin()
    opts.onChanged()
  })
  head.append(back, title, fire)

  const hint = makeEl('p', {
    className: 'recycle-hint',
    text: 'Deleted records stay here until you restore them or delete permanently.',
  })
  const tableWrap = makeEl('div', { className: 'table recycle-table' })
  tableWrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Deleted</th><th>Date</th><th>Name</th><th>CNIC</th><th>Mobile</th><th>Actions</th>
        </tr>
      </thead>
      <tbody class="recycle-tbody"></tbody>
    </table>`
  const tbody = tableWrap.querySelector<HTMLTableSectionElement>('.recycle-tbody')

  const render = () => {
    const rows = loadRecycle().slice().reverse()
    const esc = (s: string) => s.replaceAll('<', '&lt;')
    if (tbody) {
      tbody.innerHTML =
        rows
          .map((r) => {
            const id = r.entry.id
            const del = formatPaidDateTime(r.deletedAt)
            return `<tr data-recycle-id="${id}">
            <td>${esc(del)}</td>
            <td>${esc(r.entry.entryDate || '—')}</td>
            <td>${esc(r.entry.name || '—')}</td>
            <td>${esc(r.entry.cnic || '—')}</td>
            <td>${esc(r.entry.mobileNumber || '—')}</td>
            <td class="recycle-actions">
              <button type="button" class="btn primary sm" data-act="restore" data-id="${id}">Restore</button>
              ${deleteIconBtnHtml('btn ghost sm', `data-act="purge" data-id="${escAttr(id)}"`, 'Delete forever')}
            </td>
          </tr>`
          })
          .join('') || `<tr><td colspan="6" class="empty">Bin is empty.</td></tr>`
    }
  }

  tbody?.addEventListener('click', (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]')
    if (!btn) return
    const id = btn.getAttribute('data-id')
    const act = btn.getAttribute('data-act')
    if (!id || !act) return
    if (act === 'restore') {
      restoreFromRecycle(id)
      opts.onChanged()
      return
    }
    if (act === 'purge') {
      if (!confirm('Permanently delete this record from the bin?')) return
      purgeRecycleEntry(id)
      opts.onChanged()
    }
  })

  wrap.append(head, hint, tableWrap)
  render()
  return wrap
}

function makeSettingsScreen(opts: { onBack: () => void }) {
  const wrap = makeEl('section', { className: 'sub-screen settings-screen' })
  const head = makeEl('div', { className: 'sub-head' })
  const back = makeEl('button', { className: 'mini back', attrs: { type: 'button' } }) as HTMLButtonElement
  back.textContent = '← Main Screen (ESC)'
  back.addEventListener('click', () => opts.onBack())
  const title = makeEl('div', { className: 'sub-title', text: 'Settings' })
  head.append(back, title)

  const grid = makeEl('div', { className: 'settings-grid' })

  const cardApp = makeEl('div', { className: 'settings-card' })
  cardApp.innerHTML = `<div class="settings-card-title">Appearance</div>`
  const themeBtn = makeEl('button', { className: 'btn primary', attrs: { type: 'button' } }) as HTMLButtonElement
  const syncThemeBtn = () => {
    themeBtn.textContent = loadTheme() === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'
  }
  themeBtn.addEventListener('click', () => {
    saveTheme(loadTheme() === 'light' ? 'dark' : 'light')
    applyTheme()
    syncThemeBtn()
  })
  syncThemeBtn()
  cardApp.append(themeBtn)

  const cardPin = makeEl('div', { className: 'settings-card' })
  cardPin.innerHTML = `<div class="settings-card-title">Change PIN</div>`
  const oldP = makeEl('input', {
    className: 'in',
    attrs: { type: 'password', inputmode: 'numeric', maxlength: '6', placeholder: 'Old PIN' },
  }) as HTMLInputElement
  const newP = makeEl('input', {
    className: 'in',
    attrs: { type: 'password', inputmode: 'numeric', maxlength: '6', placeholder: 'New PIN (6 digits)' },
  }) as HTMLInputElement
  const newP2 = makeEl('input', {
    className: 'in',
    attrs: { type: 'password', inputmode: 'numeric', maxlength: '6', placeholder: 'Confirm new PIN' },
  }) as HTMLInputElement
  const pinUp = makeEl('button', { className: 'btn primary', attrs: { type: 'button' } }) as HTMLButtonElement
  pinUp.innerHTML = `${ICON_LOCK}<span>Update PIN</span>`
  const pinMsg = makeEl('div', { className: 'settings-msg' })
  pinUp.addEventListener('click', () => {
    pinMsg.textContent = ''
    const o = oldP.value.trim()
    const n = newP.value.trim()
    const c = newP2.value.trim()
    if (o !== loadEffectivePin()) {
      pinMsg.textContent = 'Old PIN is incorrect.'
      return
    }
    if (!/^\d{6}$/.test(n)) {
      pinMsg.textContent = 'New PIN must be exactly 6 digits.'
      return
    }
    if (n !== c) {
      pinMsg.textContent = 'New PIN and confirmation do not match.'
      return
    }
    savePin(n)
    pinMsg.textContent = 'PIN updated. Use it next time you log in.'
    oldP.value = ''
    newP.value = ''
    newP2.value = ''
  })
  cardPin.append(oldP, newP, newP2, pinUp, pinMsg)

  const cardDb = makeEl('div', { className: 'settings-card' })
  cardDb.innerHTML = `<div class="settings-card-title">Data backup</div>`
  const dbRow = makeEl('div', { className: 'settings-db-row' })
  const backupBtn = makeEl('button', { className: 'btn primary', attrs: { type: 'button' } }) as HTMLButtonElement
  backupBtn.textContent = 'Backup (.db)'
  const restoreBtn = makeEl('button', { className: 'btn ghost settings-restore', attrs: { type: 'button' } }) as HTMLButtonElement
  restoreBtn.textContent = 'Restore (.db)'
  const fileIn = makeEl('input', {
    className: 'settings-file',
    attrs: { type: 'file', accept: '.db,.json,application/octet-stream' },
  }) as HTMLInputElement
  const dbMsg = makeEl('div', { className: 'settings-msg' })
  const dbPath = makeEl('div', {
    className: 'settings-db-path',
    text: `Database: In-app storage on this device (localStorage). Backup exports one .db snapshot file with all data.`,
  })
  backupBtn.addEventListener('click', () => {
    dbMsg.textContent = 'Preparing backup…'
    void downloadBackupDbFile().then((m) => {
      if (m) dbMsg.textContent = m
      else dbMsg.textContent = ''
    })
  })
  restoreBtn.addEventListener('click', () => fileIn.click())
  fileIn.addEventListener('change', () => {
    const f = fileIn.files?.[0]
    fileIn.value = ''
    if (!f) return
    void f.text().then((text) => {
      const r = restoreFromBackupText(text)
      dbMsg.textContent = r.message
      if (r.ok) window.setTimeout(() => window.location.reload(), 900)
    })
  })
  dbRow.append(backupBtn, restoreBtn)
  cardDb.append(dbRow, dbMsg, dbPath, fileIn)

  grid.append(cardApp, cardPin, cardDb)
  wrap.append(head, grid)
  return wrap
}

function makeReportsScreen(opts: { onBack: () => void; onEdit: (e: Entry) => void }) {
  const wrap = makeEl('section', { className: 'sub-screen reports-screen' })
  const head = makeEl('div', { className: 'sub-head' })
  const back = makeEl('button', { className: 'mini back', attrs: { type: 'button' } }) as HTMLButtonElement
  back.textContent = '← Main Screen (ESC)'
  back.addEventListener('click', () => opts.onBack())
  const title = makeEl('div', { className: 'sub-title', text: 'Reports & Statements' })
  head.append(back, title)

  type ReportScreenMode = 'daily' | 'monthly' | 'custom' | 'clientDetail'
  let mode: ReportScreenMode = 'clientDetail'
  const filt = makeEl('div', { className: 'rep-filters' })
  const mkFilt = (id: ReportScreenMode, label: string, cls: string) => {
    const b = makeEl('button', { className: `rep-filt ${cls}`, attrs: { type: 'button', 'data-mode': id } }) as HTMLButtonElement
    b.textContent = label
    return b
  }
  const bDaily = mkFilt('daily', 'Daily', 'rf-blue')
  const bMonth = mkFilt('monthly', 'Monthly', 'rf-purple')
  const bCustom = mkFilt('custom', 'Custom', 'rf-green')
  const bClient = mkFilt('clientDetail', 'Client Detail Statement', 'rf-orange')
  filt.append(bDaily, bMonth, bCustom, bClient)

  const customRow = makeEl('div', { className: 'rep-custom is-hidden' })
  const fromD = makeEl('input', { className: 'in', attrs: { type: 'date' } }) as HTMLInputElement
  const toD = makeEl('input', { className: 'in', attrs: { type: 'date' } }) as HTMLInputElement
  customRow.append(makeEl('span', { className: 'rep-custom-lbl', text: 'From' }), fromD, makeEl('span', { className: 'rep-custom-lbl', text: 'To' }), toD)

  const clientDetailSearchIn = makeEl('input', {
    className: 'in',
    attrs: {
      type: 'search',
      placeholder: 'Name, reference, CNIC, tracking, weapon client, general dues…',
      spellcheck: 'false',
      'aria-label': 'Client detail statement search',
    },
  }) as HTMLInputElement
  const clientSearchRow = makeEl('div', { className: 'rep-client-search is-hidden' })
  clientSearchRow.append(
    makeEl('span', { className: 'rep-custom-lbl', text: 'Search' }),
    clientDetailSearchIn,
  )

  const tool = makeEl('div', { className: 'rep-toolbar' })
  const summary = makeEl('div', { className: 'rep-summary' })
  tool.append(summary)

  const printRow = makeEl('div', { className: 'rep-print-row' })
  const printB = makeEl('button', { className: 'btn danger rep-print', attrs: { type: 'button' } }) as HTMLButtonElement
  printB.textContent = 'Print'
  printRow.append(printB)

  const tableWrap = makeEl('div', { className: 'table rep-table' })
  tableWrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date</th><th>Name</th><th>CNIC</th><th>Tracking ID</th><th>Mobile</th><th>Category</th>
          <th>Status</th><th>Sale</th><th>Profit</th><th>Dues</th><th>Action</th>
        </tr>
      </thead>
      <tbody class="rep-tbody"></tbody>
    </table>`
  const tbody = tableWrap.querySelector<HTMLTableSectionElement>('.rep-tbody')
  const theadTr = tableWrap.querySelector<HTMLTableRowElement>('table thead tr')

  const syncFiltActive = () => {
    filt.querySelectorAll('button[data-mode]').forEach((x) => {
      const b = x as HTMLButtonElement
      b.classList.toggle('is-active', b.getAttribute('data-mode') === mode)
    })
    customRow.classList.toggle('is-hidden', mode !== 'custom')
    clientSearchRow.classList.add('is-hidden')
  }

  const repRender = () => {
    syncFiltActive()
    const esc = (s: string) => s.replaceAll('<', '&lt;')

    if (mode === 'clientDetail') {
      printRow.classList.add('is-hidden')
      summary.textContent =
        'Client Detail Statement — orange button click karein: search popup (14×7), teen sources (appl · wepl · gen), balance Pending Dues jaisa.'
      if (theadTr) theadTr.innerHTML = `<th>Info</th>`
      if (tbody) {
        tbody.innerHTML = `<tr><td class="empty">Client Detail Statement par click karein — naam search popup khulega.</td></tr>`
      }
      return
    }

    printRow.classList.remove('is-hidden')
    const base = loadEntries().slice().reverse()
    const filtered = filterReportEntries(base, mode, fromD.value, toD.value)
    const totalSale = filtered.reduce((s, e) => s + (e.salePrice ?? 0), 0)
    const totalProfit = filtered.reduce((s, e) => s + entryLineProfit(e), 0)
    const totalDues = filtered.reduce((s, e) => s + entryLineDues(e), 0)
    const modeLabel = mode === 'daily' ? 'Daily' : mode === 'monthly' ? 'Monthly' : 'Custom'
    summary.textContent = `${modeLabel} | Records: ${filtered.length} | Sale: ${formatRs(totalSale)} | Profit: ${formatRs(totalProfit)} | Dues: ${formatRs(totalDues)}`
    if (theadTr) {
      theadTr.innerHTML = `<th>Date</th><th>Name</th><th>CNIC</th><th>Tracking ID</th><th>Mobile</th><th>Category</th>
          <th>Status</th><th>Sale</th><th>Profit</th><th>Dues</th><th>Action</th>`
    }
    if (tbody) {
      tbody.innerHTML =
        filtered
          .map((e) => {
            const st = entryStatusLabel(e)
            return `<tr data-entry-id="${e.id}">
            <td>${esc(formatDateDisplay(e.entryDate))}</td>
            <td>${esc(e.name || '—')}</td>
            <td>${esc(e.cnic || '—')}</td>
            <td>${esc(e.trackingId || '—')}</td>
            <td>${esc(e.mobileNumber || '—')}</td>
            <td>${esc(e.category || '—')}</td>
            <td><span class="pill ${st.toLowerCase()}">${st}</span></td>
            <td>${e.salePrice !== null ? formatRs(e.salePrice) : '—'}</td>
            <td>${formatRs(entryLineProfit(e))}</td>
            <td class="${entryLineDues(e) > 0.001 ? 'rep-dues-hi' : ''}">${formatRs(entryLineDues(e))}</td>
            ${entryActionCellHtml(e, { showRecycle: true })}
          </tr>`
          })
          .join('') || `<tr><td colspan="11" class="empty">No records in this range.</td></tr>`
    }
  }

  filt.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLButtonElement>('button[data-mode]')
    if (!b) return
    const m = b.getAttribute('data-mode') as ReportScreenMode | null
    if (!m) return
    mode = m
    syncFiltActive()
    if (m === 'clientDetail') {
      openClientDetailStatementModal({ onRefresh: repRender })
      return
    }
    repRender()
  })
  fromD.addEventListener('change', () => repRender())
  toD.addEventListener('change', () => repRender())
  printB.addEventListener('click', () => {
    if (mode === 'clientDetail') openClientDetailStatementModal({ onRefresh: repRender })
    else printAccountStatement(mode, fromD.value, toD.value)
  })

  tableWrap.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement
    const ddBtn = t.closest('.action-dd-btn')
    if (ddBtn) {
      e.stopPropagation()
      const wrapDd = ddBtn.closest('.action-dd')
      const menu = wrapDd?.querySelector('.action-dd-menu') as HTMLElement | null
      if (!menu) return
      const opening = !menu.classList.contains('is-open')
      closeAllActionDropdownMenus()
      if (opening) {
        const tr = ddBtn.closest('tr[data-entry-id]')
        tr?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        requestAnimationFrame(() => {
          menu.classList.add('is-open')
          ddBtn.setAttribute('aria-expanded', 'true')
          positionActionDropdownFixed(ddBtn as HTMLElement, menu)
          requestAnimationFrame(() => positionActionDropdownFixed(ddBtn as HTMLElement, menu))
        })
      } else {
        resetActionDropdownMenu(menu)
        ddBtn.setAttribute('aria-expanded', 'false')
      }
      return
    }
    const actBtn = t.closest<HTMLButtonElement>('button[data-act]')
    if (!actBtn) return
    const tr = actBtn.closest('tr[data-entry-id]')
    const id = tr?.getAttribute('data-entry-id')
    if (!id) return
    const entry = loadEntries().find((x) => x.id === id)
    if (!entry) return
    const act = actBtn.getAttribute('data-act')
    if (act === 'view') openEntryViewDetailModal(entry, { onEdit: opts.onEdit, onChanged: repRender })
    else if (act === 'edit') opts.onEdit(entry)
    else if (act === 'complete') {
      const duesNow = entryLineDues(entry)
      let cmsg = 'Mark this entry as Completed?'
      if (duesNow > 0) {
        cmsg +=
          '\n\nThis record still has outstanding dues. It will stay in Pending Dues until the amount is fully collected.'
      }
      if (
        !(await confirmModal({
          title: 'Complete entry',
          message: cmsg,
          confirmText: 'Complete',
          cancelText: 'Cancel',
        }))
      )
        return
      patchEntryById(id, { manuallyCompleted: true })
      repRender()
    } else if (act === 'print-bill') printClientBill(entry)
    else if (act === 'print-detail') printClientDetail(entry)
    else if (act === 'recycle') {
      if (
        !(await confirmModal({
          title: 'Move to Recycle Bin',
          message:
            'Move this record to the Recycle Bin?\n\nIt will be removed from the main list until you restore it or delete it permanently from the bin.',
          confirmText: 'Move',
          cancelText: 'Cancel',
          variant: 'danger',
        }))
      )
        return
      moveEntryToRecycle(id)
      repRender()
    }
  })

  syncFiltActive()
  repRender()
  if (mode === 'clientDetail') {
    queueMicrotask(() => openClientDetailStatementModal({ onRefresh: repRender }))
  }
  wrap.append(head, filt, customRow, clientSearchRow, printRow, tool, tableWrap)
  return wrap
}

render()
