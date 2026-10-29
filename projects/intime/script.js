'use strict';

// ── Time units and catalog ─────────────────────────────────────────────

// Fictional time conversion. Every balance, debt, and transaction uses seconds.
const DAY = 86400;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
const $ = selector => document.querySelector(selector);
const products = [
  { id: 'chrome', name: 'Chrome', cost: 3 * YEAR },
  { id: 'groceries', name: 'Grocery Delivery', cost: 3 * DAY },
  { id: 'rent', name: 'Monthly Rent', cost: 2 * MONTH },
  { id: 'medical', name: 'Medical Treatment', cost: YEAR },
  { id: 'travel', name: 'Travel', cost: 3 * YEAR }
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
  chrome: 'A little less life. A little more chrome.',
  rent: 'Congratulations on surviving another month indoors.',
  groceries: 'Trading life to sustain life. Efficient.',
  travel: 'Three years off your life to see a little more of the world.',
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
// ── Session account and time calculations ──────────────────────────────

function newAccount() {
  const now = Date.now();
  return { version: 1, balance: 42 * YEAR, updatedAt: now, loans: [], transactions: [
    { id: 'opening', name: 'Lifespan account activated', type: 'income', amount: 42 * YEAR, date: now, balance: 42 * YEAR }
  ] };
}

// Each reload starts fresh. Only the last greeting is remembered, never finances.
let state = newAccount();

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


function stage(action) {
  if (spinning) throw new Error('Wait for the wheel to stop before making another transaction.');
  if (pending) throw new Error('A transaction is waiting. Confirm or cancel it before starting another.');
  if (!Number.isFinite(action.amount) || action.amount === 0) throw new Error('Enter a valid, positive amount of time.');
  if (action.amount < 0 && -action.amount > balanceNow()) throw new Error(`Insufficient lifespan. No time was deducted.\n\n${responses.insufficient}`);
  pending = action;
  return action.description;
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
  state.transactions.unshift({ id: `${state.updatedAt}-${Math.random()}`, name: action.name, type: action.type, kind: action.kind || 'purchase', amount: action.amount, date: state.updatedAt, balance: state.balance });
  pending = null;
  updateClock();
  return `${action.name}.\n${action.amount > 0 ? '+' : '−'}${formatTime(Math.abs(action.amount))}\nRemaining: ${formatTime(balanceNow())}${action.response ? `\n\n${action.response}` : ''}`;
}


// ── Radial navigation and screen rendering ─────────────────────────────

const screens = {
  bank: ['01 / TEMPORAL CREDIT', 'Borrow tomorrow.', 'Borrow lifespan. See what your future will owe.'],
  transfers: ['02 / BIOLOGICAL RELAY', 'Life in transit.', 'Give someone a little more of the only thing that matters.'],
  market: ['03 / LIFESPAN EXCHANGE', 'The cost of living.', 'The everyday. The extraordinary. All priced in time.'],
  gamble: ['05 / CHANCE EXCHANGE', 'Time on the line.', 'One spin. Three possible futures.'],
  account: ['04 / IDENTITY REGISTRY', 'Proof of life.', 'Every second accounted for.'],
  history: ['00 / CHRONOLOGICAL RECORD', 'Nothing disappears.', 'A record of the life you have gained, shared, and spent.']
};
let currentScreen = 'home';
let historyFilter = 'all';
let noticeTimer;
let zeroNotified = false;
let resetRequested = false;
let spinning = false;
let wheelRotation = 0;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function notify(message) {
  clearTimeout(noticeTimer);
  $('#notice').textContent = message;
  $('#notice').hidden = false;
  noticeTimer = setTimeout(() => { $('#notice').hidden = true; }, 9000);
}

// Clock labels and financial figures use the monospace font throughout.
const clockUnits = ['Y', 'M', 'D', 'H', 'M', 'S'];
$('#countdown').innerHTML = clockUnits.map(unit =>
  `<span class="clock-part"><span class="clock-number"></span><span class="clock-unit" aria-hidden="true">${unit}</span></span>`
).join('<span class="clock-separator" aria-hidden="true"><span>:</span><small>:</small></span>');
const clockDigits = [...document.querySelectorAll('.clock-number')];

function updateClock() {
  const balance = balanceNow();
  const values = parts(balance);
  clockDigits.forEach((digit, index) => {
    digit.textContent = String(values[index]).padStart(2, '0');
  });
  const labels = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'];
  $('#countdown').setAttribute('aria-label', values.map((value, index) => `${value} ${labels[index]}`).join(', '));
  $('#screen-time').textContent = values.map(value => String(value).padStart(2, '0')).join(':');

  if (balance > 0) zeroNotified = false;
  else if (!zeroNotified && !spinning) {
    zeroNotified = true;
    setTimeout(() => { if (balanceNow() === 0) notify(responses.zero); }, 0);
  }
  if (currentScreen === 'bank') renderProjection();
  if (currentScreen === 'account') renderAccount();
}

function renderPairs(selector, rows) {
  $(selector).innerHTML = rows.map(([label, value]) =>
    `<div><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`
  ).join('');
}

function currentQuote() {
  return quoteFrom([`${$('#loan-amount').value}y`, $('#loan-term').value]);
}

function renderProjection() {
  const quote = currentQuote();
  const current = balanceNow();
  $('#dial-years').textContent = `+${$('#loan-amount').value}`;
  $('#loan-dial').style.strokeDasharray = `${quote.principal / (15 * YEAR) * 100} 100`;
  $('#loan-label').textContent = `${$('#loan-amount').value} years`;
  renderPairs('#projection-data', [
    ['Current lifespan', years(current)],
    ['Immediately after borrowing', years(current + quote.principal)],
    ['After full repayment', years(current + quote.principal - quote.total)],
    ['Total lifespan owed', years(quote.total)],
    ['Monthly repayment', formatTime(quote.total / quote.term)]
  ]);
  $('#debt-value').textContent = formatTime(debtNow());
  $('#repay-all').disabled = debtNow() === 0;
  $('#repay-form button[type=submit]').disabled = debtNow() === 0;
}

function renderAccount() {
  const monthly = 2 * MONTH + state.loans.reduce((sum, loan) => sum + Math.min(loan.monthly, loan.owed), 0);
  renderPairs('#account-data', [
    ['Remaining lifespan', years(balanceNow())],
    ['Outstanding debt', formatTime(debtNow())],
    ['Account status', accountStatus()],
    ['Monthly obligations', formatTime(monthly)],
    ['Account holder', 'Jamie Morgan'],
    ['Session', 'Refresh to reset']
  ]);
}

function renderHistory() {
  const entries = state.transactions.filter(transaction => historyFilter === 'all'
    || (historyFilter === 'gambling' ? transaction.kind === 'gamble' : historyFilter === 'income' ? transaction.amount > 0 : transaction.type === historyFilter));
  $('#history-list').innerHTML = entries.length ? entries.map(transaction => `
    <article class="history-row">
      <div class="history-name">${escapeHTML(transaction.name)}</div>
      <div class="history-amount">${transaction.amount > 0 ? '+' : '−'}${formatTime(Math.abs(transaction.amount))}</div>
      <div class="history-meta">${fictionalDate(transaction.date)} / ${transaction.type}</div>
      <div class="history-balance">Balance ${formatTime(transaction.balance)}</div>
    </article>`).join('') : '<p class="fine-print">No transactions in this category yet.</p>';
}

function navigate() {
  const requested = location.hash.slice(1);
  currentScreen = Object.hasOwn(screens, requested) ? requested : 'home';
  document.body.classList.toggle('workspace-mode', currentScreen !== 'home');
  document.body.dataset.screen = currentScreen;
  document.querySelectorAll('[data-screen]').forEach(link => {
    if (link.dataset.screen === currentScreen) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  $('#home').hidden = currentScreen !== 'home';
  $('#workspace').hidden = currentScreen === 'home';
  document.querySelectorAll('.panel').forEach(panel => {
    panel.hidden = panel.id !== `${currentScreen}-panel`;
  });
  if (currentScreen !== 'home') {
    const [index, title, description] = screens[currentScreen];
    $('#screen-index').textContent = index;
    $('#screen-title').textContent = title;
    $('#screen-title').focus({ preventScroll: true });
  }
  if (currentScreen === 'history') renderHistory();
  updateClock();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ── Review every transaction before committing it ──────────────────────

function review(action) {
  try {
    stage(action);
    resetRequested = false;
    $('#review-title').textContent = action.name === 'Time loan approved' ? 'Review your time loan' : action.name;
    $('#review-description').textContent = action.description;
    $('#review-dialog').returnValue = '';
    $('#review-dialog').showModal();
  } catch (error) {
    notify(error.message);
  }
}

$('#review-dialog').addEventListener('close', () => {
  const confirmed = $('#review-dialog').returnValue === 'confirm';
  if (resetRequested) {
    resetRequested = false;
    if (confirmed) {
      state = newAccount();
      pending = null;
      $('#wheel-disc').style.transition = 'none';
      $('#wheel-disc').style.transform = 'rotate(0deg)';
      wheelRotation = 0;
      $('#gamble-result').textContent = 'Your next second is undecided.';
      historyFilter = 'all';
      document.querySelectorAll('[data-filter]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.filter === 'all'));
      });
      updateClock();
      renderHistory();
      notify('New session started. 42 years. Your future is yours again.');
    }
    return;
  }
  if (!confirmed) { pending = null; return; }
  try {
    if (pending && pending.kind === 'gamble') { startWheelSpin(); return; }
    notify(confirmTransaction());
    renderHistory();
    if (currentScreen === 'bank') renderProjection();
  } catch (error) {
    pending = null;
    notify(error.message);
  }
});

$('#loan-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const quote = currentQuote();
    review({
      name: 'Time loan approved', kind: 'loan', type: 'loans', amount: quote.principal, quote,
      description: `${projection(quote)}\n\nBorrow today. Repay with tomorrow.\nRepayments are manual. Failure to repay may result in lifespan repossession.`
    });
  } catch (error) { notify(error.message); }
});

function reviewRepayment(amount) {
  if (debtNow() <= 0) throw new Error('No outstanding debt.');
  if (amount > debtNow()) throw new Error('Amount exceeds outstanding debt. Choose Repay full balance for the exact amount.');
  review({
    name: 'Loan repayment', response: responses.repayment, kind: 'repayment', type: 'loans', amount: -amount,
    description: `Repay ${formatTime(amount)}.\nBoth lifespan and debt decrease by this amount.`
  });
}

$('#repay-form').addEventListener('submit', event => {
  event.preventDefault();
  try { reviewRepayment(amountFrom(`${$('#repay-amount').value}d`)); }
  catch (error) { notify(error.message); }
});
$('#repay-all').addEventListener('click', () => {
  try { reviewRepayment(debtNow()); }
  catch (error) { notify(error.message); }
});

$('#transfer-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const recipient = $('#recipient').value;
    if (!Object.hasOwn(contacts, recipient)) throw new Error('Choose a valid contact.');
    const amount = amountFrom(`${$('#transfer-amount').value}${$('#transfer-unit').value}`);
    review({
      name: `Transfer to ${contacts[recipient]}`, response: responses.transfer, type: 'expenses', amount: -amount,
      description: `Send ${formatTime(amount)} to ${contacts[recipient]}.\nTransfer fee: 0 seconds.\nYour lifespan decreases immediately after confirmation.`
    });
  } catch (error) { notify(error.message); }
});

// One shared sector list drives the drawing, random selection, and payout.
const wheelSectors = [...Array.from({ length: 14 }, (_, index) => index % 2 === 0 ? 'WIN' : 'LOSE'), 'DOUBLE'];
const sectorAngle = 360 / wheelSectors.length;
const sectorColors = { WIN: '#8c542d', LOSE: '#1f1913', DOUBLE: '#d7ad52' };
$('#wheel-disc').style.background = `conic-gradient(from 0deg, ${wheelSectors.map((result, index) => `${sectorColors[result]} ${index * sectorAngle}deg ${(index + 1) * sectorAngle}deg`).join(', ')})`;
$('#wheel-disc').innerHTML = wheelSectors.map((result, index) => {
  const angle = (index * sectorAngle + sectorAngle / 2) * Math.PI / 180;
  return `<span class="wheel-label${result === 'DOUBLE' ? ' wheel-double' : ''}" style="left:${50 + Math.sin(angle) * 37}%;top:${50 - Math.cos(angle) * 37}%">${result === 'DOUBLE' ? '2×' : result}</span>`;
}).join('');

function startWheelSpin() {
  if (spinning || !pending || pending.kind !== 'gamble') return;
  const action = pending;
  const available = balanceNow();
  if (action.stake > available) { pending = null; throw new Error(`Insufficient lifespan. Wager cancelled.\n\n${responses.insufficient}`); }
  pending = null;
  spinning = true;
  $('#gamble-form button').disabled = true;
  $('#reset-session').disabled = true;
  $('#gamble-result').textContent = 'Spinning. Your stake is on the wheel…';
  // Reserve the stake. WIN returns 2× total; DOUBLE returns 3× total (+2× net).
  state.balance = available - action.stake;
  state.updatedAt = Date.now();
  updateClock();

  const sector = Math.floor(Math.random() * wheelSectors.length);
  const outcome = wheelSectors[sector];
  const multiplier = outcome === 'DOUBLE' ? 2 : outcome === 'WIN' ? 1 : -1;
  const won = multiplier > 0;
  const landingAngle = 360 - (sector * sectorAngle + sectorAngle / 2);
  wheelRotation = Math.floor(wheelRotation / 360) * 360 + 5 * 360 + landingAngle;
  const disc = $('#wheel-disc');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  disc.style.transition = reduced ? 'none' : 'transform 3.6s cubic-bezier(.12,.68,.12,1)';
  void disc.offsetWidth;
  disc.style.transform = `rotate(${wheelRotation}deg)`;

  setTimeout(() => {
    const amount = multiplier * action.stake;
    state.balance = balanceNow() + (multiplier + 1) * action.stake;
    state.updatedAt = Date.now();
    state.transactions.unshift({
      id: `${state.updatedAt}-${Math.random()}`, name: `Time wheel / ${outcome === 'DOUBLE' ? 'double win' : won ? 'won' : 'lost'}`,
      kind: 'gamble', type: won ? 'income' : 'expenses', amount,
      date: state.updatedAt, balance: state.balance
    });
    spinning = false;
    $('#gamble-form button').disabled = false;
    $('#reset-session').disabled = false;
    $('#gamble-result').textContent = `${outcome}. You ${won ? 'gained' : 'lost'} ${formatTime(Math.abs(amount))}.`;
    notify(`${outcome === 'DOUBLE' ? 'Double. Two tomorrows for the price of one.' : won ? 'The wheel gives you another tomorrow.' : 'The house keeps your seconds.'}\n${won ? '+' : '−'}${formatTime(Math.abs(amount))}`);
    updateClock();
    renderHistory();
  }, reduced ? 0 : 3650);
}

$('#gamble-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const stake = amountFrom(`${$('#wager-amount').value}${$('#wager-unit').value}`);
    review({
      name: 'Review wheel wager', kind: 'gamble', type: 'expenses', amount: -stake, stake,
      description: `Your stake: ${formatTime(stake)}.\n\nWIN — 7/15 (46.67%): gain ${formatTime(stake)} net.\nLOSE — 7/15 (46.67%): lose ${formatTime(stake)}.\nDOUBLE — 1/15 (6.67%): gain ${formatTime(stake * 2)} net.\n\n15 equal sectors. WIN returns 2× your stake total; DOUBLE returns 3× total, including the original stake. No fee.\n\nYour stake is deducted when the spin begins. The wheel settles once. Fictional time only.`
    });
  } catch (error) { notify(error.message); }
});

$('#products').innerHTML = products.map((product, index) => `
  <article class="product-row">
    <span class="product-index">${String(index + 1).padStart(2, '0')}</span>
    <h2>${product.name}</h2>
    <span class="product-cost">${formatTime(product.cost)}</span>
    <button type="button" class="outline-button" data-product="${product.id}">Buy ↗</button>
  </article>`).join('');
$('#products').addEventListener('click', event => {
  const button = event.target.closest('[data-product]');
  if (!button) return;
  const product = products.find(item => item.id === button.dataset.product);
  if (!product) return;
  review({
    name: product.name, type: 'expenses', amount: -product.cost, response: responses[product.id],
    description: `${product.name}\nCost: ${formatTime(product.cost)} of your life.`
  });
});

document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    historyFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => {
      item.setAttribute('aria-pressed', String(item === button));
    });
    renderHistory();
  });
});
$('#loan-amount').addEventListener('input', renderProjection);
$('#loan-term').addEventListener('change', renderProjection);
$('#reset-session').addEventListener('click', () => {
  if (spinning) return notify('Wait for the wheel to stop before starting a new session.');
  resetRequested = true;
  pending = null;
  $('#review-title').textContent = 'Begin again?';
  $('#review-description').textContent = 'Reset this session to 42 years, no debt, and a fresh transaction history.';
  $('#review-dialog').returnValue = '';
  $('#review-dialog').showModal();
});
window.addEventListener('hashchange', navigate);
$('#welcome-message').textContent = chooseWelcome();
navigate();
setInterval(updateClock, 1000);
