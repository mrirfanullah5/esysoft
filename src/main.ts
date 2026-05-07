import './style.css'

type Route = 'login' | 'home'

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
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${pathD}"/></svg>`
}

function sleepMs(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

type ConfirmVariant = 'default' | 'danger'

async function confirmModal(opts: {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
}): Promise<boolean> {
  // ensure only one confirm at a time
  document.querySelector('.confirm-overlay')?.remove()

  const overlay = makeEl('div', { className: 'confirm-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } })
  const card = makeEl('div', { className: 'confirm-card' })
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
      if (e.key === 'Enter') void finish(true)
    }

    window.addEventListener('keydown', onKey)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) void finish(false)
    })
    okBtn?.addEventListener('click', () => void finish(true))
    cancelBtn?.addEventListener('click', () => void finish(false))

    // focus
    queueMicrotask(() => okBtn?.focus())
  })
}

const ICON_LOCK = svgIcon(
  'M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z',
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
const ICON_TRASH = svgIcon(
  'M9 3h6l1 2h4a1 1 0 1 1 0 2h-1l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7H4a1 1 0 1 1 0-2h4l1-2Zm-2 4 1 14h8l1-14H7Zm3 3a1 1 0 0 1 1 1v7a1 1 0 1 1-2 0v-7a1 1 0 0 1 1-1Zm5 1v7a1 1 0 1 1-2 0v-7a1 1 0 1 1 2 0Z',
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
const ICON_GEAR = svgIcon(
  'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm9 3.5a7.9 7.9 0 0 1-.12 1.36l2.02 1.57-2 3.46-2.44-.98a8.2 8.2 0 0 1-2.35 1.36l-.37 2.6H9.26l-.37-2.6a8.2 8.2 0 0 1-2.35-1.36l-2.44.98-2-3.46 2.02-1.57A7.9 7.9 0 0 1 3 12c0-.46.04-.92.12-1.36L1.1 9.07l2-3.46 2.44.98A8.2 8.2 0 0 1 7.89 5.23l.37-2.6h3.48l.37 2.6a8.2 8.2 0 0 1 2.35 1.36l2.44-.98 2 3.46-2.02 1.57c.08.44.12.9.12 1.36Z',
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
      <div>Azan Online Experts</div>
      <div>Shop No. 10, District Court, Saidu Sharif, Swat</div>
      <div>Hayat Ullah: +923469083693</div>
      <div>Irfan Ullah: +923349351073</div>
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

function formatHeaderTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

type NavId =
  | 'new-entry'
  | 'weapon'
  | 'expense'
  | 'dues'
  | 'search'
  | 'recycle'
  | 'report'
  | 'settings'

function buildSidebar(active: NavId | null, opts?: { onActiveNav?: (nav: NavId | null) => void }) {
  const sidebar = makeEl('aside', { className: 'nav' })
  sidebar.innerHTML = `
    <div class="nav-title">MENU</div>
    <button class="nav-btn nav-blue" data-nav="new-entry" type="button">${ICON_PLUS}<span>New Entry</span></button>
    <button class="nav-btn nav-green" data-nav="weapon" type="button">${ICON_TAG}<span>Wepon Number Alot</span></button>
    <button class="nav-btn nav-amber" data-nav="expense" type="button">${ICON_RECEIPT}<span>Expence</span></button>
    <button class="nav-btn nav-orange" data-nav="dues" type="button">${ICON_COIN}<span>Dues</span></button>
    <button class="nav-btn nav-cyan" data-nav="search" type="button">${ICON_DOC}<span>Serch</span></button>
    <button class="nav-btn nav-red" data-nav="recycle" type="button">${ICON_TRASH}<span>Recyle Bin</span></button>
    <button class="nav-btn nav-purple" data-nav="report" type="button">${ICON_CHART}<span>Reports</span></button>
    <div class="nav-sep"></div>
    <div class="nav-title">SYSTEM</div>
    <button class="nav-btn nav-gray" data-nav="settings" type="button">${ICON_GEAR}<span>Settings</span></button>
    <div class="nav-sep"></div>
    <button class="nav-btn nav-red" data-nav="logout" type="button">${ICON_LOCK}<span>Log out</span></button>
  `

  const setActiveClasses = (next: NavId | null) => {
    sidebar.querySelectorAll<HTMLButtonElement>('button[data-nav]').forEach((btn) => {
      const bid = btn.getAttribute('data-nav') as NavId | 'logout' | null
      if (!bid || bid === 'logout') return
      btn.classList.toggle('is-active', next === bid)
      btn.classList.toggle('is-dim', next !== null && next !== bid)
    })
    opts?.onActiveNav?.(next)
  }
  setActiveClasses(active)

  return { el: sidebar, setActive: setActiveClasses }
}

function makeDeskTopbar() {
  const topbar = makeEl('header', { className: 'topbar topbar-dark' })
  topbar.innerHTML = `
    <div class="top-left">
      <div class="brand-mini">ESYSoft</div>
    </div>
    <div class="top-center">
      <div class="brand-center">AZAN Online Experts</div>
      <div class="sub-center">Application Tracking System</div>
    </div>
    <div class="top-right">
      <div class="dt"><span class="dt-date"></span><span class="dt-sep">•</span><span class="dt-time"></span></div>
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
  return topbar
}

function makeHome(opts: { onLogout: () => void }) {
  const app = makeEl('section', { className: 'desk dark' })

  const topbar = makeDeskTopbar()

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
      <div class="welcome-stars">✦ AZAN Online Experts ✦</div>
      <div class="welcome-title">WELCOME TO Application Tracking System</div>
      <div class="welcome-divider"></div>
      <div class="welcome-by">SOFTWARE BY <span class="welcome-esy">EsySoft</span></div>
      <div class="welcome-card">
        <div class="welcome-card-h">Contact Us</div>
        <div class="welcome-card-n">Irfan Ullah</div>
        <div class="welcome-card-p">+92 334 9351073</div>
      </div>
      <p class="welcome-esc-hint">Press ESC to go back.</p>
    </div>
    <footer class="welcome-foot">
      <span class="welcome-ver">EsySoft v3.0</span>
      <span class="welcome-keys">ESC×2 — Home | ESC — Back</span>
    </footer>
  `
  const dashView = makeEl('div', { className: 'dash-view' })
  const entryView = makeEl('div', { className: 'entry-view is-hidden' })

  type Filter = 'all' | 'completed' | 'showAll'
  let filter: Filter = 'all'
  let dashSearchQuery = ''

  const stats = makeEl('div', { className: 'stats' })
  const refreshStats = () => {
    const entries = loadEntries()
    const active = entries.filter((e) => !e.manuallyCompleted).length
    const urgent = entries.filter((e) => !e.manuallyCompleted && e.urgency === 'urgent').length
    const normal = entries.filter((e) => !e.manuallyCompleted && e.urgency === 'normal').length
    const other = entries.filter((e) => !e.manuallyCompleted && e.urgency === 'other').length
    const warning = entries.filter((e) => entryCountsForDashboardWarning(e)).length
    const complete = entries.filter((e) => e.manuallyCompleted).length
    stats.innerHTML = `
    <div class="stat"><div class="stat-h">Active</div><div class="stat-n">${active}</div></div>
    <div class="stat"><div class="stat-h">Urgent</div><div class="stat-n">${urgent}</div></div>
    <div class="stat"><div class="stat-h">Normal</div><div class="stat-n">${normal}</div></div>
    <div class="stat"><div class="stat-h">Other</div><div class="stat-n">${other}</div></div>
    <div class="stat stat-warn"><div class="stat-h">Warning</div><div class="stat-n">${warning}</div><div class="stat-warn-caption">Urgent / Other · up to 7 days left (same as startup reminder)</div></div>
    <div class="stat"><div class="stat-h">Complete</div><div class="stat-n">${complete}</div></div>
  `
  }
  refreshStats()

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
          <th>ID</th><th>Date</th><th>Name</th><th>CNIC</th><th>Tracking ID</th><th>Entry</th><th>Category</th><th>Status</th><th>Action</th>
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
    const all = loadEntries().slice().reverse()
    const filtered = filter === 'completed' ? all.filter((e) => e.manuallyCompleted) : all
    const take = filter === 'showAll' ? filtered : filtered.slice(0, 200)
    const searchActive = dashSearchQuery.trim().length > 0
    const searched = searchActive ? take.filter((e) => entryMatchesQuery(e, dashSearchQuery)) : take
    const buckets = dashboardCnicBuckets(take, searched, searchActive)
    const html = buckets
      .map((bucket, idx) => {
        const rep = bucket[0]
        const n = bucket.length
        const status = entryStatusLabel(rep)
        const trackingCell =
          n === 1
            ? (rep.trackingId || '-').replaceAll('<', '&lt;')
            : `${(rep.trackingId || '').trim() || '—'} (+${n - 1})`.replaceAll('<', '&lt;')
        return `
          <tr data-entry-id="${rep.id}">
            <td>${idx + 1}</td>
            <td>${(rep.entryDate || '-').replaceAll('<', '&lt;')}</td>
            <td>${(rep.name || '-').replaceAll('<', '&lt;')}</td>
            <td>${(rep.cnic || '-').replaceAll('<', '&lt;')}</td>
            <td>${trackingCell}</td>
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
      openEntryViewDetailModal(entry, { onEdit: showEntryEdit, onChanged: renderRows })
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
  dashMain.append(stats, toolbar, tableScroll)
  dashView.append(dashMain)
  main.append(welcomeView, dashView, entryView)
  content.append(sidebar.el, main)
  app.append(topbar, content)

  const showWelcome = () => {
    sidebar.setActive(null)
    welcomeView.classList.remove('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.add('is-hidden')
    entryView.replaceChildren()
  }

  const showDashboard = () => {
    sidebar.setActive(null)
    welcomeView.classList.add('is-hidden')
    dashView.classList.remove('is-hidden')
    entryView.classList.add('is-hidden')
    entryView.replaceChildren()
    renderRows()
    queueMicrotask(syncDashTableScrollHeight)
  }

  const showEntry = () => {
    sidebar.setActive('new-entry')
    welcomeView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeNewEntry({ onBack: showDashboard }))
  }

  const showWeaponAllot = () => {
    sidebar.setActive('weapon')
    welcomeView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeWeaponAllotScreen({ onBack: showDashboard }))
  }

  const showExpense = () => {
    sidebar.setActive('expense')
    welcomeView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeExpenseScreen({ onBack: showDashboard }))
  }

  const showDues = () => {
    sidebar.setActive('dues')
    welcomeView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeDuesScreen({ onBack: showDashboard }))
  }

  const showSearch = () => {
    sidebar.setActive('search')
    welcomeView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    const renderSearch = () => {
      entryView.replaceChildren(
        makeSearchScreen({
          onBack: showDashboard,
          onEdit: (entry) => {
            entryView.replaceChildren(makeNewEntry({ onBack: renderSearch, initial: entry }))
          },
        }),
      )
    }
    renderSearch()
  }

  const showRecycle = () => {
    sidebar.setActive('recycle')
    welcomeView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    const renderRecycle = () => {
      entryView.replaceChildren(makeRecycleScreen({ onBack: showDashboard, onChanged: renderRecycle }))
    }
    renderRecycle()
  }

  const showReports = () => {
    sidebar.setActive('report')
    welcomeView.classList.add('is-hidden')
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    const renderReports = () => {
      entryView.replaceChildren(
        makeReportsScreen({
          onBack: showDashboard,
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
    dashView.classList.add('is-hidden')
    entryView.classList.remove('is-hidden')
    entryView.replaceChildren(makeSettingsScreen({ onBack: showDashboard }))
  }

  sidebar.el.querySelectorAll<HTMLButtonElement>('button[data-nav]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-nav')
      if (!id) return
      if (id === 'logout') {
        opts.onLogout()
        return
      }
      const nav = id as NavId
      if (nav === 'new-entry') {
        showEntry()
        return
      }
      if (nav === 'weapon') {
        showWeaponAllot()
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

  /** ESC = Back (subview → dashboard, welcome → dashboard). ESC×2 on dashboard = Home (welcome). */
  let escDuoCount = 0
  let escDuoTimer: ReturnType<typeof setTimeout> | null = null
  const onHomeEsc = (e: KeyboardEvent) => {
    if (!app.isConnected) {
      window.removeEventListener('keydown', onHomeEsc)
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
      showDashboard()
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
      showDashboard()
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

  showDashboard()
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

/** Same CNIC (normalized) → one group; blank CNIC rows never merge. */
function cnicGroupingKey(entry: Entry): string {
  const raw = entry.cnic.trim()
  if (!raw) return `∅:${entry.id}`
  const digits = raw.replace(/\D/g, '')
  if (digits.length >= 11) return digits
  return raw.replace(/\s/g, '').toLowerCase()
}

/** Bucket main-list rows so one NIC = one dashboard line; if search is on, only groups whose CNIC matched at least one hit (whole group rows still listed from `takeFiltered`). */
function dashboardCnicBuckets(takeFiltered: Entry[], searched: Entry[], searchActive: boolean): Entry[][] {
  const matchedKeys = searchActive ? new Set(searched.map((e) => cnicGroupingKey(e))) : null
  const keys = [...new Set(takeFiltered.map((e) => cnicGroupingKey(e)))].filter((k) =>
    matchedKeys ? matchedKeys.has(k) : true,
  )
  const maxDateGroup = (k: string) =>
    takeFiltered
      .filter((e) => cnicGroupingKey(e) === k)
      .reduce<string>((m, x) => {
        const d = x.entryDate || ''
        return d > m ? d : m
      }, '')
  keys.sort((ka, kb) => maxDateGroup(kb).localeCompare(maxDateGroup(ka)))
  return keys.map((k) =>
    takeFiltered
      .filter((e) => cnicGroupingKey(e) === k)
      .slice()
      .sort((a, b) => (b.entryDate || '').localeCompare(a.entryDate || '')),
  )
}

function entryLineProfit(e: Entry) {
  const s = e.salePrice ?? 0
  const c = e.costPrice ?? 0
  return Math.round((s - c) * 100) / 100
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
                  <button type="button" class="action-dd-item" role="menuitem" data-act="edit">Edit</button>
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

/** Shop block on printed bills / detail sheets (matches app branding). */
const PRINT_INVOICE_SHOP = {
  name: 'AZAN ONLINE EXPERTS',
  addressLine: 'Shop No. 10, District Court, Saidu Sharif, Swat',
  phone: '+92 334 9351073',
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
.inv-addr{font-size:.78rem;opacity:.92;margin-top:8px;line-height:1.45;}
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
.invoice--a6 .inv-addr{font-size:.65rem;margin-top:4px;line-height:1.35;}
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
  <div class="inv-addr">${escHtml(PRINT_INVOICE_SHOP.addressLine)}</div>
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

function openEntryViewDetailModal(entry: Entry, opts: { onEdit?: (e: Entry) => void; onChanged?: () => void } = {}) {
  if (document.querySelector('.dues-modal-overlay')) return
  const groupKey = cnicGroupingKey(entry)
  const loadGroup = () =>
    loadEntries()
      .filter((e) => cnicGroupingKey(e) === groupKey)
      .slice()
      .sort((a, b) => (b.entryDate || '').localeCompare(a.entryDate || ''))

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
          <div class="dues-modal-hd-cnic">CNIC: ${esc(first.cnic.trim() || '—')}</div>
        </div>
        <div class="dues-modal-hd-sub">
          <span class="dues-modal-hd-kicker">${ICON_DOC}<span>Client detail (${group.length} entr${group.length === 1 ? 'y' : 'ies'} — same CNIC)</span></span>
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
                    <button type="button" class="action-dd-item" role="menuitem" data-act="edit" data-entry-id="${escAttr(e.id)}">Edit</button>
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
          <div class="brandsub">${escHtml(PRINT_INVOICE_SHOP.addressLine)} · ${escHtml(PRINT_INVOICE_SHOP.phone)}</div>
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
          <button type="button" class="mini weapon-detail-edit-row" data-weapon-detail-id="${escAttr(l.id)}">Edit</button>
          <button type="button" class="mini mini-danger weapon-detail-delete-row" data-weapon-detail-id="${escAttr(l.id)}">Delete</button>
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
          `<tr><td>${formatDateDisplay(r.entryDate)}</td><td>${esc(r.description)}</td><td>${formatRs(r.amount)}</td><td class="expense-actions"><button type="button" class="mini expense-edit-row" data-expense-id="${escAttr(r.id)}">Edit</button><button type="button" class="mini mini-danger expense-delete-row" data-expense-id="${escAttr(r.id)}">Delete</button></td></tr>`,
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

type DuesRow = {
  kind: 'app' | 'weapon'
  /** App: `appDuesGroupKey`; weapon: client map key (trimmed or "(No client)") */
  groupKey: string
  count: number
  nameRef: string
  cnic: string
  mobile: string
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

function printDuesReferenceDetail(entries: Entry[]) {
  if (!entries.length) return
  const sorted = entries
    .slice()
    .sort((a, b) => (a.entryDate || '').localeCompare(b.entryDate || '') || a.id.localeCompare(b.id))
  const first = sorted[0]
  const ref = first.reference.trim() || '—'
  const name = first.name.trim() || '—'
  const cnic = first.cnic.trim() || '—'
  const totalDues = sorted.reduce((s, e) => s + entryLineDues(e), 0)

  const rows = sorted
    .map((e, i) => {
      const sale = e.salePrice ?? 0
      const recvRaw = e.cashReceived
      const recv = recvRaw === null ? sale : recvRaw
      const dues = entryLineDues(e)
      return `<tr>
        <td>${i + 1}</td>
        <td>${escHtml(e.name.trim() || '—')}</td>
        <td>${escHtml(e.fatherName.trim() || '—')}</td>
        <td>${escHtml(e.mobileNumber.trim() || '—')}</td>
        <td style="text-align:right">${escHtml(formatRs(sale))}</td>
        <td style="text-align:right">${escHtml(formatRs(recv))}</td>
        <td style="text-align:right">${escHtml(formatRs(dues))}</td>
      </tr>`
    })
    .join('')

  const doc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<title>${escAttr(`Dues detail — ${ref}`)}</title>
<style>
  :root{--bg:#0b1224;--card:#0f172a;--line:rgba(148,163,184,.18);--mut:rgba(226,232,240,.78);--txt:#f8fafc;--acc:#fbbf24;--red:#dc2626;}
  *{box-sizing:border-box;}
  body{margin:0;padding:18px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0a1020;color:var(--txt);-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .sheet{max-width:960px;margin:0 auto;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:linear-gradient(165deg,#111a30 0%,#0b1224 45%,#0a1628 100%);box-shadow:0 22px 60px rgba(0,0,0,.45);}
  .hd{padding:16px 16px 12px;border-bottom:1px solid var(--line);background:rgba(15,23,42,.95);}
  .brand{font-weight:1000;letter-spacing:.08em;text-transform:uppercase;color:var(--acc);font-size:13px;}
  .addr{margin-top:6px;color:rgba(226,232,240,.78);font-weight:700;font-size:12px;line-height:1.35;}
  .title{margin-top:6px;font-size:18px;font-weight:1000;}
  .sub{margin-top:8px;color:rgba(248,250,252,.92);font-weight:900;font-size:12px;line-height:1.45;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  thead th{position:sticky;top:0;background:#0f172a;color:rgba(226,232,240,.78);text-transform:uppercase;letter-spacing:.06em;font-size:10px;font-weight:1000;padding:10px;border-bottom:1px solid var(--line);}
  tbody td{padding:10px;border-bottom:1px solid rgba(148,163,184,.12);color:rgba(248,250,252,.92);font-weight:700;}
  tbody tr:nth-child(even) td{background:rgba(255,255,255,.02);}
  .ft{padding:12px 16px;background:linear-gradient(90deg, rgba(185, 28, 28, 0.95), rgba(220, 38, 38, 0.88));font-weight:1000;}
  @media print{body{padding:0;background:#0a1020}.sheet{box-shadow:none;border-radius:0;max-width:none} thead th{position:static}}
</style>
</head><body>
  <div class="sheet">
    <div class="hd">
      <div class="brand">AZAN ONLINE EXPERTS</div>
      <div class="addr">Shop No. 10, District Court, Saidu Sharif, Swat</div>
      <div class="title">Dues Detail</div>
      <div class="sub">Ref: <b>${escHtml(ref)}</b>  |  Name: <b>${escHtml(name)}</b>  |  CNIC: <b>${escHtml(cnic)}</b></div>
    </div>
    <div style="padding:12px 12px 0">
      <table>
        <thead><tr>
          <th>#</th><th>Name</th><th>Father</th><th>Mobile</th><th style="text-align:right">Sale</th><th style="text-align:right">Cash received</th><th style="text-align:right">Dues</th>
        </tr></thead>
        <tbody>${rows || `<tr><td colspan="7">—</td></tr>`}</tbody>
      </table>
    </div>
    <div class="ft">TOTAL DUES: ${escHtml(formatRs(totalDues))}</div>
  </div>
</body></html>`

  printFullDocument(doc)
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

type DuesPaymentLog = {
  id: string
  kind: 'app' | 'weapon'
  groupKey: string
  amount: number
  paidAt: string
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
    app: 'EsySoft_AzanOnlineExperts',
    keys,
  }
}

async function downloadBackupDbFile(): Promise<string> {
  const payload = buildBackupObject()
  const text = JSON.stringify(payload, null, 2)
  const suggestedName = `esysoft_azan_${new Date().toISOString().slice(0, 10)}.db`

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

function appendDuesPaymentLog(kind: 'app' | 'weapon', groupKey: string, amount: number) {
  const all = loadDuesPaymentLogs()
  all.push({
    id: cryptoId(),
    kind,
    groupKey,
    amount,
    paidAt: new Date().toISOString(),
  })
  saveDuesPaymentLogs(all)
}

function formatPaidDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${formatHeaderDate(d)} ${formatHeaderTime(d)}`
}

function renderDuesPayHistBody(el: HTMLElement | null, kind: 'app' | 'weapon', groupKey: string) {
  if (!el) return
  const logs = loadDuesPaymentLogs()
    .filter((l) => l.kind === kind && l.groupKey === groupKey)
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
  if (!logs.length) {
    el.innerHTML = `<div class="dues-payhist-empty">Koi pichli adayigi record nahi. <b>Collect Now</b> se yahan log ho ga.</div>`
    return
  }
  const last = logs[0]
  const older = logs.slice(1, 9)
  const recent =
    older.length === 0
      ? ''
      : `<div class="dues-payhist-listwrap"><div class="dues-payhist-listhdr">Purane</div><ol class="dues-payhist-ol">${older
          .map(
            (x) =>
              `<li><span class="dues-payhist-amt">${formatRs(x.amount)}</span> <span class="dues-payhist-when">${formatPaidDateTime(x.paidAt)}</span></li>`,
          )
          .join('')}</ol></div>`
  el.innerHTML = `
    <div class="dues-payhist-highlight">
      <div class="dues-payhist-lastamt">${formatRs(last.amount)}</div>
      <div class="dues-payhist-lastwhen">${formatPaidDateTime(last.paidAt)}</div>
    </div>
    ${recent}
  `
}

function openDuesDetailModal(opts: {
  kind: 'app' | 'weapon'
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
      <div class="dues-modal-actions">
        <label class="dues-collect-lbl">Collect Amount (Rs.):</label>
        <input type="text" class="in dues-collect-in" inputmode="decimal" />
        <span class="dues-collect-max">Max: ${formatRs(total)}</span>
        <button type="button" class="btn primary dues-collect-btn">✓ Collect Now</button>
        <button type="button" class="btn primary tool-purple dues-print-btn">${ICON_RECEIPT}<span>Print detail</span></button>
        <button type="button" class="btn ghost dues-close-btn">✕ Close</button>
      </div>
      <div class="dues-modal-msg" role="status"></div>
    `

    const tbody = modal.querySelector<HTMLTableSectionElement>('.dues-modal-tbody')
    const collectIn = modal.querySelector<HTMLInputElement>('.dues-collect-in')
    const collectBtn = modal.querySelector<HTMLButtonElement>('.dues-collect-btn')
    const printBtn = modal.querySelector<HTMLButtonElement>('.dues-print-btn')
    const closeBtn = modal.querySelector<HTMLButtonElement>('.dues-close-btn')
    const totalEl = modal.querySelector<HTMLDivElement>('.dues-modal-total')
    const msg = modal.querySelector<HTMLDivElement>('.dues-modal-msg')
    const payHistBody = modal.querySelector<HTMLDivElement>('.dues-modal-payhist-body')

    const maxEl = modal.querySelector<HTMLSpanElement>('.dues-collect-max')
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
      if (msg) msg.textContent = ''
    }
    renderRows()

    collectIn?.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter') return
      ev.preventDefault()
      collectBtn?.click()
    })

    printBtn?.addEventListener('click', () => {
      // Print current group (reference grouping) without cost price
      entries = loadAppDuesGroup(opts.groupKey)
      printDuesReferenceDetail(entries)
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
      appendDuesPaymentLog('app', opts.groupKey, amt)
      if (msg) msg.textContent = 'Saved.'
      opts.onSaved()
      renderRows()
      const newTotal = loadAppDuesGroup(opts.groupKey).reduce((s, e) => s + entryLineDues(e), 0)
      if (newTotal <= 0) {
        window.setTimeout(tearDown, 400)
      }
    })

    closeBtn?.addEventListener('click', tearDown)
  } else {
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
      <div class="dues-modal-actions">
        <label class="dues-collect-lbl">Collect Amount (Rs.):</label>
        <input type="text" class="in dues-collect-in" inputmode="decimal" />
        <span class="dues-collect-max">Max: ${formatRs(total)}</span>
        <button type="button" class="btn primary dues-collect-btn">✓ Collect Now</button>
        <button type="button" class="btn ghost dues-close-btn">✕ Close</button>
      </div>
      <div class="dues-modal-msg" role="status"></div>
    `

    const tbody = modal.querySelector<HTMLTableSectionElement>('.dues-modal-tbody')
    const collectIn = modal.querySelector<HTMLInputElement>('.dues-collect-in')
    const collectBtn = modal.querySelector<HTMLButtonElement>('.dues-collect-btn')
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
      if (msg) msg.textContent = ''
    }
    renderRows()

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
      appendDuesPaymentLog('weapon', opts.groupKey, amt)
      if (msg) msg.textContent = 'Saved.'
      opts.onSaved()
      renderRows()
      const newTotal = loadWeaponDuesGroup(opts.groupKey).reduce((s, l) => s + lineDues(l), 0)
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
      mobile: first.mobileNumber.trim() || '—',
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
    rows.push({
      kind: 'weapon',
      groupKey: client,
      count: list.length,
      nameRef: client,
      cnic: '—',
      mobile: '—',
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
  head.innerHTML = `<div class="startup-reminder-title">Daily reminder</div><div class="startup-reminder-sub">Pending dues (application vs weapon) · Urgent / Other · up to 7 days left</div>`

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
            const kindClass = isApp ? 'is-app' : 'is-weapon'
            const badge = isApp
              ? `${ICON_DOC}<span>Application (tracking)</span>`
              : `${ICON_TAG}<span>Weapon no. allotment</span>`
            const meta = isApp
              ? `CNIC ${escHtml(r.cnic)} · ${r.count} entr${r.count === 1 ? 'y' : 'ies'}`
              : `${r.count} entr${r.count === 1 ? 'y' : 'ies'} · weapon allotment (client / weapon no.)`
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
    text: 'Search by Name / CNIC / Reference — grouped by Reference | Double-click a row to open detail & collect',
  })

  const table = makeEl('div', { className: 'table dues-table' })
  table.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Name/Reference</th>
          <th>CNIC</th>
          <th>Mobile</th>
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
            r.mobile.toLowerCase().includes(q),
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
        const ico = r.kind === 'app' ? ICON_DUES_APP : ICON_DUES_WEAPON
        const lbl = r.kind === 'app' ? 'App' : 'Weapon'
        const gk = encodeURIComponent(r.groupKey)
        return `<tr class="dues-row" tabindex="0" data-kind="${r.kind}" data-group-key="${gk}">
          <td class="dues-type-cell"><span class="dues-type-ico">${ico}</span><span class="dues-type-lbl">${lbl}(${r.count})</span></td>
          <td>${escCell(r.nameRef)}</td>
          <td>${escCell(r.cnic)}</td>
          <td>${escCell(r.mobile)}</td>
          <td>${r.count}</td>
          <td>${formatRs(r.totalDues)}</td>
        </tr>`
      })
      .join('')
    if (tbody) tbody.innerHTML = html || `<tr><td colspan="6" class="empty">No pending dues.</td></tr>`

    tbody?.querySelectorAll<HTMLTableRowElement>('tr.dues-row').forEach((tr) => {
      tr.addEventListener('dblclick', () => {
        const kind = tr.getAttribute('data-kind') as 'app' | 'weapon' | null
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

function makeNewEntry(opts: { onBack: () => void; initial?: Entry | null }) {
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
  }
  syncUrgencyFields()
  updateTotals()

  form.addEventListener('submit', (e) => {
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
      cnic: cnic.value.trim(),
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
    all.push(newEntry)
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
  mode: 'daily' | 'monthly' | 'custom' | 'full',
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

function reportModeTitle(mode: 'daily' | 'monthly' | 'custom' | 'full'): string {
  if (mode === 'full') return 'FULL STATEMENT'
  if (mode === 'daily') return 'DAILY'
  if (mode === 'monthly') return 'MONTHLY'
  return 'CUSTOM RANGE'
}

function printAzanStatement(mode: 'daily' | 'monthly' | 'custom' | 'full', fromIso: string, toIso: string) {
  const rows = buildStatementRows(mode, fromIso, toIso)
  const totalSale = rows.reduce((s, r) => s + (r.kind !== 'expense' && r.sale != null ? r.sale : 0), 0)
  const totalCost = rows.reduce((s, r) => s + (r.kind !== 'expense' && r.cost != null ? r.cost : 0), 0)
  const totalProfit = rows.reduce((s, r) => s + (r.profit != null ? r.profit : 0), 0)
  const totalDues = rows.reduce((s, r) => s + (r.dues || 0), 0)
  const totalExp = rows.reduce((s, r) => s + (r.expenseAmt != null ? r.expenseAmt : 0), 0)
  const netProfit = totalProfit - totalExp

  const esc = escHtml
  const now = new Date()
  const typeBadge = (k: StmtRow['kind']) => {
    if (k === 'app') return `<span class="bdg bdg-app">App</span>`
    if (k === 'weapon') return `<span class="bdg bdg-weapon">Weapon</span>`
    return `<span class="bdg bdg-exp">Expense</span>`
  }

  let idx = 0
  const trs = rows
    .map((r) => {
      idx += 1
      const rowClass = r.kind === 'expense' ? 'row-exp' : ''
      const duesCell =
        r.dues > 0.001
          ? `<td class="td-dues">${formatRs(r.dues)}</td>`
          : `<td>${r.kind === 'expense' ? '—' : formatRs(r.dues)}</td>`
      const pShow = r.profit == null ? '—' : formatRs(r.profit)
      const profCell =
        r.profit != null && Math.abs(r.profit) > 0.001
          ? `<td class="td-profit">${pShow}</td>`
          : `<td>${pShow}</td>`
      return `<tr class="${rowClass}">
        <td>${idx}</td>
        <td>${esc(formatDateDisplay(r.date))}</td>
        <td>${typeBadge(r.kind)}</td>
        <td>${esc(r.name)}</td>
        <td>${esc(r.catOrRef)}</td>
        <td>${r.cost != null ? formatRs(r.cost) : '—'}</td>
        <td>${r.sale != null ? formatRs(r.sale) : '—'}</td>
        ${duesCell}
        ${profCell}
        <td>${r.expenseAmt != null ? formatRs(r.expenseAmt) : '—'}</td>
      </tr>`
    })
    .join('')

  const rangeLabel = (() => {
    const f = (fromIso || '').trim()
    const t = (toIso || '').trim()
    if (mode === 'custom' && (f || t)) return `${f || '—'} → ${t || '—'}`
    if (mode === 'daily' && f) return f
    if (mode === 'monthly' && f) return f.slice(0, 7)
    return '—'
  })()

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Statement — ${esc(PRINT_INVOICE_SHOP.name)}</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  :root{
    --head:#0b3b66;
    --line:#d7e2ef;
    --mut:#334155;
    --panel:#ffffff;
  }
  *{box-sizing:border-box;}
  body{font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;margin:0;padding:0;background:#f1f5f9;font-size:10.5px;}
  .sheet{max-width:190mm;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden;}
  .top{display:flex;justify-content:space-between;align-items:stretch;gap:12px;padding:14px 16px;background:var(--head);color:#fff;}
  .brand{display:flex;align-items:center;gap:10px;min-width:0;}
  .logo{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.12);display:grid;place-items:center;flex:0 0 auto;}
  .brandtxt{min-width:0;}
  .brandname{font-weight:1000;letter-spacing:.06em;font-size:13px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .brandsub{opacity:.92;font-weight:800;font-size:10px;margin-top:3px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .stmt{text-align:right;}
  .stmt .t{font-size:12px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em;line-height:1.1;}
  .stmt .p{opacity:.92;font-weight:900;font-size:10px;margin-top:4px;}
  .info{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,#ffffff 0%,#fbfdff 100%);}
  .card{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--panel);}
  .kv{display:grid;grid-template-columns:120px 1fr;gap:6px 10px;font-size:10.5px;}
  .k{color:var(--mut);font-weight:900;}
  .v{font-weight:1000;}
  table{width:100%;border-collapse:collapse;font-size:10.5px;}
  thead th{background:var(--head);color:#fff;font-weight:1000;text-transform:uppercase;letter-spacing:.05em;font-size:9.5px;padding:9px 8px;border-bottom:1px solid #083257;}
  tbody td{padding:8px 8px;border-bottom:1px solid var(--line);vertical-align:top;}
  tbody tr:nth-child(even) td{background:#fbfdff;}
  tbody tr.row-exp td{background:#ffedd5;}
  td.num{text-align:right;white-space:nowrap;}
  .bdg{display:inline-block;padding:2px 6px;border-radius:999px;font-weight:950;font-size:9px;color:#fff;}
  .bdg-app{background:#2563eb;}
  .bdg-weapon{background:#16a34a;}
  .bdg-exp{background:#ea580c;}
  .td-dues{color:#dc2626;font-weight:1000;}
  .td-profit{color:#15803d;font-weight:1000;}
  .wrap{padding:10px 16px 0;}
  .summary{margin:12px 16px 14px;border:1px solid var(--line);border-radius:10px;overflow:hidden;}
  .summary-h{background:var(--head);color:#fff;font-weight:1000;text-transform:uppercase;letter-spacing:.06em;font-size:10px;padding:8px 10px;}
  .summary-b{background:#fff;}
  .sum-row{display:flex;justify-content:space-between;gap:12px;padding:8px 10px;border-top:1px solid var(--line);font-weight:1000;font-size:10.5px;}
  .sum-row:first-child{border-top:none;}
  .sum-row .lab{color:var(--mut);font-weight:900;}
  .sum-row .val{min-width:120px;text-align:right;}
  .sum-row.sum-dues .lab,.sum-row.sum-dues .val{color:#dc2626;}
  .sum-row.sum-exp .lab,.sum-row.sum-exp .val{color:#ea580c;}
  .sum-row.sum-net .lab,.sum-row.sum-net .val{color:#15803d;font-size:12px;}
  .foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding:12px 16px 16px;border-top:1px solid var(--line);background:#fff;}
  .note{font-size:10px;color:var(--mut);font-weight:700;line-height:1.35;max-width:65%;}
  .sig{min-width:140px;text-align:center;}
  .sig .line{height:1px;background:var(--mut);opacity:.6;margin:22px 0 6px;}
  .sig .lbl{font-size:10px;color:var(--mut);font-weight:800;}
  @media print { body { background:#fff; } .sheet{border:none;border-radius:0;} }
</style></head><body>
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
        <div class="brandname">${esc(PRINT_INVOICE_SHOP.name)}</div>
        <div class="brandsub">${esc(PRINT_INVOICE_SHOP.addressLine)} · ${esc(PRINT_INVOICE_SHOP.phone)}</div>
      </div>
    </div>
    <div class="stmt">
      <div class="t">Statement</div>
      <div class="p">— ${esc(reportModeTitle(mode))} · ${esc(rangeLabel)} —</div>
    </div>
  </div>

  <div class="info">
    <div class="card">
      <div class="kv">
        <div class="k">Printed</div><div class="v">${esc(`${formatHeaderDate(now)} ${formatHeaderTime(now)}`)}</div>
        <div class="k">Records</div><div class="v">${esc(String(rows.length))}</div>
        <div class="k">Scope</div><div class="v">All (Apps + Weapon + Expenses)</div>
      </div>
    </div>
    <div class="card">
      <div class="kv">
        <div class="k">Currency</div><div class="v">PKR</div>
        <div class="k">Software</div><div class="v">ESYSOFT</div>
        <div class="k">Mode</div><div class="v">${esc(reportModeTitle(mode))}</div>
      </div>
    </div>
  </div>

  <div class="wrap">
    <table>
      <thead>
        <tr>
          <th style="width:34px">#</th>
          <th style="width:74px">Date</th>
          <th style="width:64px">Type</th>
          <th>Name</th>
          <th style="width:130px">Category / Weapon No.</th>
          <th style="text-align:right;width:76px">Cost</th>
          <th style="text-align:right;width:76px">Sale</th>
          <th style="text-align:right;width:70px">Dues</th>
          <th style="text-align:right;width:76px">Profit</th>
          <th style="text-align:right;width:76px">Expense</th>
        </tr>
      </thead>
      <tbody>${trs || '<tr><td colspan="10">—</td></tr>'}</tbody>
    </table>
  </div>

  <div class="summary">
    <div class="summary-h">Summary</div>
    <div class="summary-b">
      <div class="sum-row"><span class="lab">Total Sale</span><span class="val">${formatRs(totalSale)}</span></div>
      <div class="sum-row"><span class="lab">Total Cost</span><span class="val">${formatRs(totalCost)}</span></div>
      <div class="sum-row"><span class="lab">Total Profit</span><span class="val">${formatRs(totalProfit)}</span></div>
      <div class="sum-row sum-dues"><span class="lab">Total Dues</span><span class="val">${formatRs(totalDues)}</span></div>
      <div class="sum-row sum-exp"><span class="lab">Total Expenses</span><span class="val">${formatRs(totalExp)}</span></div>
      <div class="sum-row sum-net"><span class="lab">Net Profit</span><span class="val">${formatRs(netProfit)}</span></div>
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

  printFullDocument(html)
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
    text: 'Search by: Name / NIC / Tracking ID / Mobile',
  })
  const bar = makeEl('div', { className: 'search-bar-row' })
  const searchIn = makeEl('input', {
    className: 'in search-in',
    attrs: { type: 'search', placeholder: 'Type and press Search…', 'aria-label': 'Search applications' },
  }) as HTMLInputElement
  const go = makeEl('button', { className: 'btn primary search-go', attrs: { type: 'button' } }) as HTMLButtonElement
  go.innerHTML = `${ICON_SEARCH}<span>Search</span>`
  bar.append(searchIn, go)

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
      <button type="button" class="btn primary sm sdet-edit">${ICON_DOC}<span>Edit</span></button>
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
              <button type="button" class="btn ghost sm" data-act="purge" data-id="${id}">Delete forever</button>
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

  let mode: 'daily' | 'monthly' | 'custom' | 'full' = 'full'
  const filt = makeEl('div', { className: 'rep-filters' })
  const mkFilt = (id: typeof mode, label: string, cls: string) => {
    const b = makeEl('button', { className: `rep-filt ${cls}`, attrs: { type: 'button', 'data-mode': id } }) as HTMLButtonElement
    b.textContent = label
    return b
  }
  const bDaily = mkFilt('daily', 'Daily', 'rf-blue')
  const bMonth = mkFilt('monthly', 'Monthly', 'rf-purple')
  const bCustom = mkFilt('custom', 'Custom', 'rf-green')
  const bFull = mkFilt('full', 'Full Statement', 'rf-orange')
  filt.append(bDaily, bMonth, bCustom, bFull)

  const customRow = makeEl('div', { className: 'rep-custom is-hidden' })
  const fromD = makeEl('input', { className: 'in', attrs: { type: 'date' } }) as HTMLInputElement
  const toD = makeEl('input', { className: 'in', attrs: { type: 'date' } }) as HTMLInputElement
  customRow.append(makeEl('span', { className: 'rep-custom-lbl', text: 'From' }), fromD, makeEl('span', { className: 'rep-custom-lbl', text: 'To' }), toD)

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

  const syncFiltActive = () => {
    filt.querySelectorAll('button[data-mode]').forEach((x) => {
      const b = x as HTMLButtonElement
      b.classList.toggle('is-active', b.getAttribute('data-mode') === mode)
    })
    customRow.classList.toggle('is-hidden', mode !== 'custom')
  }

  const repRender = () => {
    const base = loadEntries().slice().reverse()
    const filtered = filterReportEntries(base, mode, fromD.value, toD.value)
    const totalSale = filtered.reduce((s, e) => s + (e.salePrice ?? 0), 0)
    const totalProfit = filtered.reduce((s, e) => s + entryLineProfit(e), 0)
    const totalDues = filtered.reduce((s, e) => s + entryLineDues(e), 0)
    const modeLabel =
      mode === 'full'
        ? 'Full Statement'
        : mode === 'daily'
          ? 'Daily'
          : mode === 'monthly'
            ? 'Monthly'
            : 'Custom'
    summary.textContent = `${modeLabel} | Records: ${filtered.length} | Sale: ${formatRs(totalSale)} | Profit: ${formatRs(totalProfit)} | Dues: ${formatRs(totalDues)}`
    const esc = (s: string) => s.replaceAll('<', '&lt;')
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
    const m = b.getAttribute('data-mode') as typeof mode | null
    if (!m) return
    mode = m
    syncFiltActive()
    repRender()
  })
  fromD.addEventListener('change', () => repRender())
  toD.addEventListener('change', () => repRender())

  printB.addEventListener('click', () => {
    printAzanStatement(mode, fromD.value, toD.value)
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
  wrap.append(head, filt, customRow, printRow, tool, tableWrap)
  return wrap
}

render()
