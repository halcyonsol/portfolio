'use strict';

// ── Time units and catalog ─────────────────────────────────────────────

// Fictional time conversion. Every balance, debt, and transaction uses seconds.
const DAY = 86400;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
const STORAGE_KEY = 'lifeline-minimal-v2';
const $ = selector => document.querySelector(selector);
const products = [
  { id: 'coffee', name: 'Daily Coffee', cost: 2 * 3600 },
  { id: 'groceries', name: 'Grocery Delivery', cost: 3 * DAY },
  { id: 'rent', name: 'Monthly Rent', cost: 2 * MONTH },
  { id: 'medical', name: 'Medical Treatment', cost: YEAR },
  { id: 'vacation', name: 'Luxury Vacation', cost: 3 * YEAR }
];
// Keep the writing separate from the accounting so it is easy to edit.
const welcomeMessages = [
  'Make every second count.',
  'Every second has a price.',
  'Time is all you have.',
  'Invest in your tomorrow.',
  'A better future, one second at a time.',
  'Because your time has value.',
  'What is a lifetime worth?',
  'What would you trade for tomorrow?',
  'Can you put a price on tomorrow?',
  "Oh good. You're still here.",
  "Against all odds... You're back.",
  'Got a second?',
  'Your move time traveler.',
  "It's about time.",
  'Well, look who has time.'
];
const responses = {
  coffee: 'Two hours of your life for caffeine. Excellent choice.',
  rent: 'Congratulations on surviving another month indoors.',
  groceries: 'Trading life to sustain life. Efficient.',
  vacation: 'Three years off your life for seven days away. Worth it?',
  transfer: 'How thoughtful. You literally gave them your life.',
  insufficient: 'Time is ticking...',
  repayment: 'Thank you for your contribution to our continued existence.',
  zero: 'Your free trial of existence has ended.'
};

function chooseWelcome() {
  const key = 'lifeline-last-welcome';
  let previous;
  try { previous = localStorage.getItem(key); } catch (error) { /* Random selection still works without storage. */ }
  const choices = welcomeMessages.filter(message => message !== previous);
  const selected = choices[Math.floor(Math.random() * choices.length)];
  try { localStorage.setItem(key, selected); } catch (error) { /* Only repeat avoidance depends on storage. */ }
  return selected;
}
const contacts = { alex: 'Alex Morgan', sam: 'Sam Chen', jordan: 'Jordan Ellis' };
const units = {
  s: 1, sec: 1, second: 1, seconds: 1,
  m: 60, min: 60, minute: 60, minutes: 60,
  h: 3600, hr: 3600, hour: 3600, hours: 3600,
  d: DAY, day: DAY, days: DAY,
  mo: MONTH, month: MONTH, months: MONTH,
  y: YEAR, yr: YEAR, year: YEAR, years: YEAR
};
const rates = { 12: .10, 24: .15, 60: .25 };
let pending = null;
let historyIndex = 0;
let draft = '';
const commandHistory = [];
let loadNotice = '';
let storageAvailable = true;

// ── Account storage and time calculations ──────────────────────────────

function newAccount() {
  const now = Date.now();
  return { version: 1, balance: 42 * YEAR, updatedAt: now, loans: [], transactions: [
    { id: 'opening', name: 'Lifespan account activated', type: 'income', amount: 42 * YEAR, date: now, balance: 42 * YEAR }
  ] };
}

function validAccount(value) {
  return value && value.version === 1 && Number.isFinite(value.balance) && value.balance >= 0 && Number.isFinite(value.updatedAt)
    && Array.isArray(value.loans) && value.loans.every(loan => Number.isFinite(loan.owed) && loan.owed >= 0 && Number.isFinite(loan.monthly) && loan.monthly > 0)
    && Array.isArray(value.transactions) && value.transactions.every(t => typeof t.name === 'string' && ['income', 'expenses', 'loans'].includes(t.type) && Number.isFinite(t.amount) && Number.isFinite(t.date) && Number.isFinite(t.balance));
}
let state;
try {
  const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('lifeline-account-v1');
  state = stored ? JSON.parse(stored) : newAccount();
  if (!validAccount(state)) throw new Error('Invalid account');
} catch (error) {
  state = newAccount();
  storageAvailable = false;
  loadNotice = 'Saved data could not be loaded. Using a temporary account for this session.';
}

function save() {
  if (!storageAvailable) return false;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch (error) { storageAvailable = false; return false; }
}
// Elapsed wall-clock time keeps the clock accurate after closing the page.

function balanceNow() { return Math.max(0, state.balance - Math.max(0, Date.now() - state.updatedAt) / 1000); }

function debtNow() { return state.loans.reduce((sum, loan) => sum + loan.owed, 0); }

function parts(seconds) {
  let remaining = Math.max(0, Math.floor(seconds));
  return [YEAR, MONTH, DAY, 3600, 60, 1].map(unit => {
    const value = Math.floor(remaining / unit);
    remaining %= unit;
    return value;
  });
}

function formatTime(seconds) {
  const labels = ['y', 'mo', 'd', 'h', 'm', 's'];
  return parts(seconds).map((value, index) => value ? `${value}${labels[index]}` : '').filter(Boolean).join(' ') || '0s';
}

function years(seconds) { return `${(seconds / YEAR).toFixed(2).replace(/\.00$/, '')} years`; }

function accountStatus() {
  const balance = balanceNow(), debt = debtNow();
  if (balance < YEAR || debt >= balance) return 'Critical';
  if (balance < 5 * YEAR || debt > balance * .4) return 'At Risk';
  return 'Stable';
}

function fictionalDate(timestamp) {
  const date = new Date(timestamp);
  date.setFullYear(date.getFullYear() + 63);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Clock display ──────────────────────────────────────────────────────

// Build the clock once. Updating its text never creates a second interval.
const clockUnits = ['Y', 'M', 'D', 'H', 'M', 'S'];
$('#countdown').innerHTML = clockUnits.map(unit => `<span class="clock-part"><span class="clock-number"></span><span class="clock-unit" aria-hidden="true">${unit}</span></span>`).join('<span class="clock-separator" aria-hidden="true"><span>:</span><small>:</small></span>');
const clockDigits = [...document.querySelectorAll('.clock-number')];
let introFinished = false;
let zeroNotified = false;

function updateClock() {
  if (!introFinished) return;
  const balance = balanceNow();
  const values = parts(balance);
  clockDigits.forEach((digit, index) => { digit.textContent = String(values[index]).padStart(2, '0'); });
  const labels = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'];
  $('#countdown').setAttribute('aria-label', values.map((value, index) => `${value} ${labels[index]}`).join(', '));
  // Announce depletion once, including expiry while the page was closed.
  if (balance > 0) zeroNotified = false;
  else if (!zeroNotified) {
    zeroNotified = true;
    setTimeout(() => {
      if (balanceNow() === 0) printEntry('system', responses.zero);
    }, 0);
  }
}

// ── Console output ─────────────────────────────────────────────────────

// All output uses textContent: typed commands and saved data never become HTML.
let finishOutput = () => {};

function printEntry(command, message, error = false) {
  finishOutput();
  const entry = document.createElement('section');
  entry.className = 'entry';
  const echo = document.createElement('p');
  echo.className = 'echo';
  echo.textContent = `> ${command}`;
  const output = document.createElement('pre');
  output.className = `output${error ? ' error' : ''}${command.trim().toLowerCase() === 'help' ? ' help-output' : ''}`;
  entry.append(echo, output);
  $('#transcript').append(entry);
  // Give assistive technology the complete response once, not every keystroke.
  entry.setAttribute('aria-busy', 'true');
  let timer;
  let done = false;
  let position = 0;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    output.textContent = message;
    entry.setAttribute('aria-busy', 'false');
  };
  finishOutput = finish;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
  else {
    const isHelp = command.trim().toLowerCase() === 'help';
    // Show the command reference quickly; keep other responses character-by-character.
    const chunk = isHelp ? 8 : 1;
    const tick = () => {
      if (done) return;
      position += chunk;
      const area = $('#output-area');
      const following = area.scrollHeight - area.scrollTop - area.clientHeight < 60;
      output.textContent = message.slice(0, position);
      if (following) area.scrollTop = area.scrollHeight;
      if (position >= message.length) finish();
      else timer = setTimeout(tick, isHelp ? 8 : (message[position - 1] === '\n' ? 65 : 14));
    };
    tick();
  }
  // Keep the entered command in view without scrolling on every typed character.
  $('#output-area').scrollTop = $('#output-area').scrollHeight;
}

// ── Transaction validation and confirmation ────────────────────────────

function amountFrom(token) {
  const match = /^(\d+(?:\.\d+)?)([a-z]+)$/.exec(token || '');
  if (!match || !units[match[2]]) throw new Error('Use a positive amount with a unit: 2h, 3d, 2mo, or 1y.');
  const amount = Math.round(Number(match[1]) * units[match[2]]);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Amount must be at least one second and within a valid range.');
  return amount;
}

function quoteFrom(args) {
  if (args.length > 2) throw new Error('Usage: borrow <amount> [12|24|60]. Example: borrow 5y 24');
  const principal = args[0] ? amountFrom(args[0]) : 5 * YEAR;
  const term = args[1] ? Number(args[1]) : 24;
  if (principal < YEAR || principal > 15 * YEAR || !Object.hasOwn(rates, term)) throw new Error('Borrow between 1y and 15y. Repayment term: 12, 24, or 60 months.');
  const rate = rates[term];
  return { principal, term, rate, total: Math.round(principal * (1 + rate)) };
}

function projection(quote) {
  const current = balanceNow();
  return `Current lifespan       ${years(current)}\nImmediate balance      ${years(current + quote.principal)}\nAfter full repayment   ${years(current + quote.principal - quote.total)}\nTotal lifespan owed    ${years(quote.total)}\nFixed interest         ${quote.rate * 100}%\nRepayment term         ${quote.term} months\nMonthly repayment      ${formatTime(quote.total / quote.term)}\n\nExcludes natural passage of time and existing debt.`;
}

function requireCount(args, count, usage) {
  if (args.length !== count) throw new Error(`Usage: ${usage}`);
}

function stage(action) {
  if (pending) throw new Error('A transaction is waiting. Type confirm or cancel before starting another.');
  if (action.amount < 0 && -action.amount > balanceNow()) throw new Error(`Insufficient lifespan. No time was deducted.\n\n${responses.insufficient}`);
  pending = action;
  return `${action.description}\n\nType confirm to proceed, or cancel.`;
}
// Confirm rechecks the live balance and debt before mutating any account data.

function confirmTransaction() {
  if (!pending) throw new Error('No transaction to confirm.');
  const action = pending;
  const available = balanceNow();
  if (action.amount < 0 && -action.amount > available) { pending = null; throw new Error(`Insufficient lifespan. Transaction cancelled.\n\n${responses.insufficient}`); }
  if (action.kind === 'repayment' && -action.amount > debtNow()) { pending = null; throw new Error('Debt has changed. Review the repayment again.'); }
  if (action.kind === 'loan') state.loans.push({ owed: action.quote.total, monthly: action.quote.total / action.quote.term });
  if (action.kind === 'repayment') {
    let remaining = -action.amount;
    for (const loan of state.loans) {
      const paid = Math.min(loan.owed, remaining);
      loan.owed -= paid;
      remaining -= paid;
    }
    state.loans = state.loans.filter(loan => loan.owed > 0);
  }
  state.balance = Math.max(0, available + action.amount);
  state.updatedAt = Date.now();
  state.transactions.unshift({ id: `${state.updatedAt}-${Math.random()}`, name: action.name, type: action.type, amount: action.amount, date: state.updatedAt, balance: state.balance });
  pending = null;
  const saved = save();
  updateClock();
  return `${action.name}.\n${action.amount > 0 ? '+' : '−'}${formatTime(Math.abs(action.amount))}\nRemaining: ${formatTime(balanceNow())}${saved ? '' : '\nWarning: browser storage unavailable. This change is not saved.'}${action.response ? `\n\n${action.response}` : ''}`;
}

// ── Help and command handling ──────────────────────────────────────────

const helpRows = [
  ['help', 'Show every command'],
  ['account', 'Balance, debt, obligations, status'],
  ['time', 'Exact remaining lifespan and units'],
  ['market', 'List items and prices'],
  ['buy <item>', 'Review a purchase'],
  ['contacts', 'List transfer recipients'],
  ['send <name> <amount>', 'Review a transfer (no fee)'],
  ['borrow <amount> [term]', 'Review a time loan'],
  ['projection [amount term]', 'Simulate a loan; default 5y / 24'],
  ['repay <amount|all>', 'Review a debt repayment'],
  ['confirm', 'Complete the pending transaction'],
  ['cancel', 'Cancel the pending transaction'],
  ['history [filter]', 'Show all, income, expenses, or loans'],
  ['clear', 'Clear this screen, keep account data'],
  ['about', 'Prototype information'],
  ['snapshot', 'Open the saved white design']
];

const helpNotes = `
Examples:
  buy coffee
  send alex 3d
  borrow 5y 24
  repay 30d
  history loans

Units: s seconds, m minutes, h hours, d days,
       mo months, y years. Decimals allowed: 0.5y.
Loan terms: 12 / 24 / 60 months at 10 / 15 / 25%.

↑ / ↓ recalls commands. Tab completes command names.
Escape finishes typing. Transactions require confirm.`;
// Derive spacing from the longest command rather than hand-padding each row.

function formatHelp() {
  const area = $('#output-area');
  const size = parseFloat(window.getComputedStyle(area).fontSize);
  const columns = Math.max(24, Math.floor(area.clientWidth / (size * .62)) - 2);
  const leftWidth = Math.max(...helpRows.map(([name]) => name.length)) + 3;
  const stacked = columns < leftWidth + 20;
  const indent = ' '.repeat(stacked ? 2 : leftWidth);
  const descriptionWidth = Math.max(18, columns - indent.length);
  function wrap(text, width) {
    const lines = [''];
    for (const word of text.split(' ')) {
      const last = lines.length - 1;
      if (lines[last] && lines[last].length + word.length + 1 > width) lines.push(word);
      else lines[last] += (lines[last] ? ' ' : '') + word;
    }
    return lines;
  }
  const rows = helpRows.map(([name, description]) => {
    const lines = wrap(description, descriptionWidth);
    return stacked ? name + '\n' + lines.map(line => indent + line).join('\n')
      : name.padEnd(leftWidth) + lines.join('\n' + indent);
  }).join(stacked ? '\n\n' : '\n');
  const notes = helpNotes.split('\n').map(line => wrap(line, columns).join('\n')).join('\n');
  return 'TIMELINE — commands\n\n' + rows + '\n' + notes;
}

const commandNames = ['help', 'account', 'time', 'market', 'buy', 'contacts', 'send', 'borrow', 'projection', 'repay', 'confirm', 'cancel', 'history', 'clear', 'about', 'snapshot'];

function runCommand(raw) {
  const [command, ...args] = raw.toLowerCase().trim().split(/\s+/);
  switch (command) {

    case 'help': requireCount(args, 0, 'help'); return formatHelp();

    case 'account': {
      requireCount(args, 0, 'account');
      const monthly = 2 * MONTH + state.loans.reduce((sum, loan) => sum + Math.min(loan.monthly, loan.owed), 0);
      return `Jamie Morgan / account 0042\n\nLifespan   ${formatTime(balanceNow())}\nDebt       ${formatTime(debtNow())}\nMonthly    ${formatTime(monthly)}\nStatus     ${accountStatus()}\n\nMonthly includes 2 months of rent. Payments are manual.${pending ? `\nPending: ${pending.name}. Type confirm or cancel.` : ''}${storageAvailable ? '' : '\nBrowser storage unavailable; session only.'}`;
    }

    case 'time': requireCount(args, 0, 'time'); return `${formatTime(balanceNow())}\n\n1 year = 365 days. 1 month = 30 days.\nYour clock continues while this page is closed.`;

    case 'market': requireCount(args, 0, 'market'); return products.map(p => `${p.id.padEnd(12)} ${formatTime(p.cost).padEnd(8)} ${p.name}`).join('\n') + '\n\nExample: buy coffee';

    case 'buy': {
      requireCount(args, 1, 'buy <item>. Type market for items.');
      const product = products.find(p => p.id === args[0]);
      if (!product) throw new Error('Unknown item. Type market for available items.');
      return stage({ name: product.name, type: 'expenses', amount: -product.cost, response: responses[product.id], description: `${product.name}\nCost: ${formatTime(product.cost)} of your life.` });
    }

    case 'contacts': requireCount(args, 0, 'contacts'); return Object.entries(contacts).map(([id, name]) => `${id.padEnd(10)} ${name}`).join('\n') + '\n\nExample: send alex 3d';

    case 'send': {
      requireCount(args, 2, 'send <name> <amount>. Example: send alex 3d');
      if (!Object.hasOwn(contacts, args[0])) throw new Error('Unknown recipient. Type contacts for names.');
      const amount = amountFrom(args[1]);
      return stage({ name: `Transfer to ${contacts[args[0]]}`, response: responses.transfer, type: 'expenses', amount: -amount, description: `Send ${formatTime(amount)} to ${contacts[args[0]]}.\nTransfer fee: 0s.` });
    }

    case 'borrow': {
      if (!args.length) throw new Error('Usage: borrow <amount> [term]. Example: borrow 5y 24');
      const quote = quoteFrom(args);
      return stage({ name: 'Time loan approved', kind: 'loan', type: 'loans', amount: quote.principal, quote, description: `${projection(quote)}\n\nBorrow today. Repay with tomorrow.\nRepayments are manual. Failure to repay may result in lifespan repossession.` });
    }

    case 'projection': return projection(quoteFrom(args));

    case 'repay': {
      requireCount(args, 1, 'repay <amount|all>. Example: repay 30d');
      if (debtNow() <= 0) throw new Error('No outstanding debt.');
      const amount = args[0] === 'all' ? debtNow() : amountFrom(args[0]);
      if (amount > debtNow()) throw new Error('Amount exceeds outstanding debt. Use repay all for the exact balance.');
      return stage({ name: 'Loan repayment', response: responses.repayment, kind: 'repayment', type: 'loans', amount: -amount, description: `Repay ${formatTime(amount)}.\nBoth lifespan and debt decrease by this amount.` });
    }

    case 'confirm': requireCount(args, 0, 'confirm'); return confirmTransaction();

    case 'cancel': requireCount(args, 0, 'cancel'); if (!pending) return 'No pending transaction.'; pending = null; return 'Transaction cancelled. No account changes.';

    case 'history': {
      if (args.length > 1 || (args[0] && !['all', 'income', 'expenses', 'loans'].includes(args[0]))) throw new Error('Usage: history [all|income|expenses|loans]');
      const filter = args[0] || 'all';
      const entries = state.transactions.filter(t => filter === 'all' || (filter === 'income' ? t.amount > 0 : t.type === filter));
      return entries.length ? entries.map(t => `${fictionalDate(t.date)} / ${t.type}\n${t.name}  ${t.amount > 0 ? '+' : '−'}${formatTime(Math.abs(t.amount))}\nBalance after: ${formatTime(t.balance)}`).join('\n\n') : 'No matching transactions.';
    }

    case 'clear': requireCount(args, 0, 'clear'); finishOutput(); $('#transcript').replaceChildren(); $('#introduction').hidden = true; return null;

    case 'about': requireCount(args, 0, 'about'); return 'TIMELINE. Time is currency.\n\nA speculative design prototype. No real transactions.\nAccount data is saved in this browser.\nYour remaining lifespan is not federally insured.\n\nClock units: y years, mo months, d days, h hours,\nm minutes, s seconds. The clock shows your remaining lifespan.';

    case 'snapshot': {
      requireCount(args, 0, 'snapshot');
      const opened = window.open('snapshots/white-minimal-v1/index.html', '_blank');
      if (opened) { opened.opener = null; return 'Opened the saved white design in a new tab.'; }
      return 'The browser blocked the new tab. Allow pop-ups and try snapshot again.';
    }

    default: throw new Error(`Unknown command: ${command}. Type help for all commands.`);
  }
}
// ── Keyboard input and cross-tab updates ───────────────────────────────

$('#command-form').addEventListener('submit', event => {
  event.preventDefault();
  finishIntro();
  const input = $('#command-input');
  const raw = input.value.trim();
  if (!raw) return;
  finishOutput();
  commandHistory.push(raw);
  historyIndex = commandHistory.length;
  draft = '';
  input.value = '';
  try {
    let result = runCommand(raw);
    if (loadNotice && result !== null) { result = `${loadNotice}\n\n${result}`; loadNotice = ''; }
    if (result !== null) printEntry(raw, result);
  } catch (error) { printEntry(raw, error.message, true); }
});
$('#command-input').addEventListener('keydown', event => {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    if (historyIndex === commandHistory.length) draft = event.target.value;
    historyIndex = Math.max(0, Math.min(commandHistory.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
    event.target.value = historyIndex === commandHistory.length ? draft : commandHistory[historyIndex];
    event.target.setSelectionRange(event.target.value.length, event.target.value.length);
  }
  if (event.key === 'Tab' && event.target.value && !event.target.value.includes(' ')) {
    const matches = commandNames.filter(name => name.startsWith(event.target.value.toLowerCase()));
    if (matches.length === 1) { event.preventDefault(); event.target.value = `${matches[0]} `; }
  }
  if (event.key === 'Escape') { finishIntro(); finishOutput(); }
});
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    const updated = JSON.parse(event.newValue);
    if (validAccount(updated)) { state = updated; pending = null; updateClock(); printEntry('sync', 'Account updated in another tab. Any pending transaction was cancelled.'); }
  } catch (error) { /* Ignore malformed data from other tabs. */ }
});

// ── Startup animation ──────────────────────────────────────────────────

// Reveal the clock first, then type the welcome. Commands never wait for it.
const introduction = chooseWelcome();
$('#introduction').setAttribute('aria-label', introduction);
let introTimer;
let welcomeTimer;
let welcomeStarted = false;
let welcomeFinished = false;

function finishWelcome() {
  clearTimeout(welcomeTimer);
  welcomeFinished = true;
  $('#intro-text').textContent = '';
  $('#introduction').hidden = true;
}

function startWelcome() {
  if (welcomeStarted || welcomeFinished) return;
  welcomeStarted = true;
  const output = $('#intro-text');
  function type(text, delay, next) {
    let position = 0;
    function tick() {
      if (welcomeFinished) return;
      output.textContent += text[position++];
      if (position < text.length) welcomeTimer = setTimeout(tick, delay);
      else next();
    }
    tick();
  }
  // Hold the completed message, then blink it three times before clearing it.
  function blinkMessage(remaining) {
    if (welcomeFinished) return;
    output.textContent = '';
    welcomeTimer = setTimeout(() => {
      output.textContent = introduction;
      welcomeTimer = setTimeout(() => {
        if (remaining > 1) blinkMessage(remaining - 1);
        else finishWelcome();
      }, 650);
    }, 550);
  }
  function pauseMessage() {
    welcomeTimer = setTimeout(() => blinkMessage(3), 1800);
  }
  // Three deliberate flashes, slower than one flash per second.
  function flash(remaining) {
    if (welcomeFinished) return;
    output.textContent = 'Welcome . . .';
    welcomeTimer = setTimeout(() => {
      output.textContent = '';
      welcomeTimer = setTimeout(() => {
        if (remaining > 1) flash(remaining - 1);
        else type(introduction, 40, pauseMessage);
      }, 550);
    }, 650);
  }
  flash(3);
}

function finishIntro(immediate = true) {
  clearTimeout(introTimer);
  introFinished = true;
  updateClock();
  if (immediate) finishWelcome();
  else startWelcome();
}

function startIntro() {
  const digits = parts(balanceNow()).map(value => String(value).padStart(2, '0'));
  let step = 0;
  function tick() {
    if (introFinished) return;
    const index = Math.floor(step / 2);
    clockDigits[index].textContent = digits[index].slice(0, step % 2 + 1);
    step += 1;
    if (step === 12) finishIntro(false);
    else introTimer = setTimeout(tick, 150);
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    introFinished = true;
    updateClock();
    welcomeStarted = true;
    $('#intro-text').textContent = introduction;
    welcomeTimer = setTimeout(finishWelcome, 4000);
  } else tick();
}
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
motion.addEventListener('change', event => { if (event.matches) { finishIntro(); finishOutput(); } });
if (storageAvailable) save();
startIntro();
setInterval(updateClock, 1000);
// Avoid automatically raising the software keyboard on touch devices.
if (window.matchMedia('(pointer: fine)').matches) $('#command-input').focus({ preventScroll: true });

// ── Responsive viewport ────────────────────────────────────────────────

// Follow the visible viewport when a phone's software keyboard opens.

function sizeTerminal() {
  const viewport = window.visualViewport;
  document.documentElement.style.setProperty('--viewport-height', `${viewport ? viewport.height : window.innerHeight}px`);
  document.documentElement.style.setProperty('--viewport-top', `${viewport ? viewport.offsetTop : 0}px`);
}
sizeTerminal();
window.addEventListener('resize', sizeTerminal);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', sizeTerminal);
  window.visualViewport.addEventListener('scroll', sizeTerminal);
}
