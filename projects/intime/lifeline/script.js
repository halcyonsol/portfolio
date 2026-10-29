'use strict';
// All accounting uses seconds. Fictional years have 365 days; months have 30.
const DAY = 86400;
const YEAR = 365 * DAY;
const MONTH = 30 * DAY;
const STORAGE_KEY = 'lifeline-account-v1';
const $ = selector => document.querySelector(selector);
const initialBalance = 42 * YEAR;
const products = [
  { name: 'Daily Coffee', category: 'SMALL RITUALS', description: 'A slower morning. A familiar warmth. Your usual, whenever you need it.', cost: 7200, price: '2 hours', icon: '♧' },
  { name: 'Grocery Delivery', category: 'EVERYDAY ESSENTIALS', description: 'A full fridge, delivered. All the ingredients for another ordinary day.', cost: 3 * DAY, price: '3 days', icon: '♧' },
  { name: 'Monthly Rent', category: 'A PLACE TO CALL HOME', description: 'Thirty days under your own roof. Peace of mind comes at a price.', cost: 2 * MONTH, price: '2 months', icon: '⌂' },
  { name: 'Medical Treatment', category: 'PERSONAL WELLBEING', description: 'Care for the body that carries your balance. Standard treatment package.', cost: YEAR, price: '1 year', icon: '✚' },
  { name: 'Luxury Vacation', category: 'TIME WELL SPENT', description: 'Seven unforgettable nights. Some memories stay with you for a lifetime.', cost: 3 * YEAR, price: '3 years', icon: '☼' }
];
function newAccount() {
  const now = Date.now();
  return { version: 1, balance: initialBalance, updatedAt: now, loans: [], transactions: [
    { id: 'opening', name: 'Lifespan account activated', type: 'income', amount: initialBalance, date: now, balance: initialBalance }
  ] };
}
function validAccount(value) {
  return value && value.version === 1 && Number.isFinite(value.balance) && value.balance >= 0 && Number.isFinite(value.updatedAt) && Array.isArray(value.loans) && value.loans.every(loan => Number.isFinite(loan.owed) && loan.owed >= 0 && Number.isFinite(loan.monthly) && loan.monthly > 0) && Array.isArray(value.transactions) && value.transactions.every(t => typeof t.name === 'string' && ['income', 'expenses', 'loans'].includes(t.type) && Number.isFinite(t.amount) && Number.isFinite(t.date) && Number.isFinite(t.balance));
}
let storageAvailable = true;
let state;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  state = saved ? JSON.parse(saved) : newAccount();
  if (!validAccount(state)) throw new Error('Invalid saved account');
} catch (error) {
  state = newAccount();
  storageAvailable = false;
}
let filter = 'all';
let pendingAction = null;
let toastTimer;
// The timestamp, not the interval count, determines elapsed life, including time offline.
function balanceNow() {
  return Math.max(0, state.balance - Math.max(0, Date.now() - state.updatedAt) / 1000);
}
function debtNow() { return state.loans.reduce((total, loan) => total + loan.owed, 0); }
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (error) { storageAvailable = false; notify('Browser storage is unavailable. Changes will last only for this session.', true); }
}
function parts(seconds) {
  let remaining = Math.max(0, Math.floor(seconds));
  return [YEAR, MONTH, DAY, 3600, 60, 1].map(unit => {
    const amount = Math.floor(remaining / unit);
    remaining %= unit;
    return amount;
  });
}
function shortTime(seconds) {
  const values = parts(seconds);
  const labels = ['yr', 'mo', 'd', 'hr', 'min', 'sec'];
  const result = values.map((value, i) => value ? `${value} ${labels[i]}` : '').filter(Boolean).slice(0, 2).join(' ');
  return result || '0 sec';
}
function years(seconds) { return `${(seconds / YEAR).toFixed(2).replace(/\.00$/, '')} years`; }
function fictionalDate(timestamp, full = false) {
  const date = new Date(timestamp);
  date.setFullYear(date.getFullYear() + 63);
  return date.toLocaleDateString('en-US', { month: full ? 'long' : 'short', day: 'numeric', year: 'numeric' });
}
function escapeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
}
function notify(message, error = false) {
  const toast = $('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 6000);
}
function review(title, description, action) {
  $('#confirm-title').textContent = title;
  $('#confirm-description').textContent = description;
  pendingAction = action;
  $('#confirm-dialog').showModal();
}
$('#confirm-dialog').addEventListener('close', () => {
  const action = pendingAction;
  pendingAction = null;
  if ($('#confirm-dialog').returnValue === 'confirm' && action) action();
});
// Validate again at confirmation because the available balance keeps ticking down.
function transact(name, type, amount, changeDebt = () => {}) {
  const available = balanceNow();
  if (!Number.isFinite(amount) || amount === 0) { notify('Enter a valid amount of time.', true); return false; }
  if (amount < 0 && -amount > available) { notify('Insufficient lifespan. This transaction would exceed your available time.', true); return false; }
  changeDebt();
  state.balance = Math.max(0, available + amount);
  state.updatedAt = Date.now();
  state.transactions.unshift({ id: `${state.updatedAt}-${Math.random()}`, name, type, amount, date: state.updatedAt, balance: state.balance });
  save();
  renderAll();
  $('#countdown').classList.remove('changed');
  void $('#countdown').offsetWidth;
  $('#countdown').classList.add('changed');
  notify(`${name}. ${shortTime(Math.abs(amount))} ${amount > 0 ? 'added to' : 'deducted from'} your lifespan.${storageAvailable ? '' : ' Not saved: browser storage unavailable.'}`);
  return true;
}
function accountHealth(balance, debt) {
  if (balance < YEAR || debt >= balance) return ['Critical', 'Your remaining time needs attention.'];
  if (balance < 5 * YEAR || debt > balance * .4) return ['At Risk', 'Review your future commitments.'];
  return ['Stable', 'Your account is in good standing.'];
}
function updateClock() {
  const balance = balanceNow();
  const labels = ['YEARS', 'MONTHS', 'DAYS', 'HOURS', 'MINUTES', 'SECONDS'];
  const values = parts(balance);
  $('#countdown').innerHTML = values.map((value, index) => `<div class="time-unit"><strong>${String(value).padStart(2, '0')}</strong><small>${labels[index]}</small></div>`).join('');
  $('#countdown').setAttribute('aria-label', values.map((value, index) => `${value} ${labels[index].toLowerCase()}`).join(', '));
  const debt = debtNow();
  const [status, note] = accountHealth(balance, debt);
  $('#account-status').textContent = status;
  $('#account-status').classList.toggle('warning', status !== 'Stable');
  $('#status-note').textContent = note;
  updateProjection();
}
function loanQuote() {
  const principal = Number($('#loan-years').value) * YEAR;
  const term = Number($('#loan-term').value);
  const rate = {12: .10, 24: .15, 60: .25}[term];
  return { principal, term, rate, total: Math.round(principal * (1 + rate)) };
}
function updateProjection() {
  const quote = loanQuote();
  const current = balanceNow();
  const immediate = current + quote.principal;
  // This is deliberately not clamped: a negative projection reveals an unaffordable future.
  const after = immediate - quote.total;
  $('#loan-output').textContent = `${$('#loan-years').value} years`;
  $('#loan-rate').textContent = `${Math.round(quote.rate * 100)}%`;
  $('#loan-monthly').textContent = shortTime(quote.total / quote.term);
  $('#projection-current').textContent = years(current);
  $('#projection-immediate').textContent = years(immediate);
  $('#projection-after').textContent = years(after);
  $('#projection-owed').textContent = years(quote.total);

}
function historyMarkup(entries) {
  if (!entries.length) return '<div class="empty">No transactions in this category yet.</div>';
  return `<div class="table-scroll"><table><thead><tr><th>TRANSACTION</th><th class="transaction-type">TYPE</th><th class="transaction-date">DATE</th><th>AMOUNT</th><th>BALANCE AFTER</th></tr></thead><tbody>${entries.map(t => `<tr><td><div class="transaction-name"><span class="transaction-icon">${t.amount > 0 ? '↙' : '↗'}</span>${escapeText(t.name)}</div></td><td class="transaction-type">${{income:'Income',expenses:'Expense',loans:'Loan'}[t.type]}</td><td class="transaction-date">${fictionalDate(t.date)}</td><td class="${t.amount > 0 ? 'positive' : 'negative'}">${t.amount > 0 ? '+' : '−'}${shortTime(Math.abs(t.amount))}</td><td class="balance-cell">${shortTime(t.balance)}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderAll() {
  updateClock();
  const debt = debtNow();
  $('#debt-summary').innerHTML = `${(debt / YEAR).toFixed(2)} <small>years</small>`;
  const monthly = 2 * MONTH + state.loans.reduce((total, loan) => total + Math.min(loan.monthly, loan.owed), 0);
  $('#monthly-summary').innerHTML = `${(monthly / DAY).toFixed(1)} <small>days</small>`;
  $('#repay-debt').textContent = shortTime(debt);
  $('#repay-form button').disabled = debt <= 0;
  $('#recent-history').innerHTML = historyMarkup(state.transactions.slice(0, 4));
  $('#all-history').innerHTML = historyMarkup(state.transactions.filter(t => filter === 'all' || (filter === 'income' ? t.amount > 0 : t.type === filter)));
}
function navigate() {
  const requested = location.hash.slice(1) || 'dashboard';
  const page = ['dashboard', 'bank', 'market', 'transfers', 'history'].includes(requested) ? requested : 'dashboard';
  document.querySelectorAll('.page').forEach(section => { section.hidden = section.id !== page; });
  document.querySelectorAll('nav a').forEach(link => {
    const active = link.dataset.page === page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  window.scrollTo({top: 0, behavior: 'instant'});
}
$('#loan-years').addEventListener('input', updateProjection);
$('#loan-term').addEventListener('change', updateProjection);
$('#loan-form').addEventListener('submit', event => {
  event.preventDefault();
  const q = loanQuote();
  if (!Number.isFinite(q.total) || q.principal < YEAR || q.principal > 15 * YEAR) return notify('Choose a valid loan amount and term.', true);
  review(`Borrow ${years(q.principal)}?`, `Your lifespan increases immediately by ${years(q.principal)}. You will owe ${years(q.total)}, including ${q.rate * 100}% fixed interest, over ${q.term} months. Payments are made manually in this prototype.`, () => transact('Time loan approved', 'loans', q.principal, () => state.loans.push({owed: q.total, monthly: q.total / q.term})));
});
$('#repay-form').addEventListener('submit', event => {
  event.preventDefault();
  const amount = Math.round(Number($('#repay-amount').value) * DAY);
  if (!Number.isFinite(amount) || amount <= 0) return notify('Enter a positive repayment amount.', true);
  if (amount > debtNow()) return notify('The repayment exceeds your outstanding debt.', true);
  review('Repay your time loan?', `${shortTime(amount)} will be deducted from your lifespan and outstanding debt.`, () => {
    if (amount > debtNow()) return notify('Your debt has changed. Review the repayment again.', true);
    transact('Loan repayment', 'loans', -amount, () => {
      let remaining = amount;
      for (const loan of state.loans) {
        const payment = Math.min(loan.owed, remaining);
        loan.owed -= payment;
        remaining -= payment;
      }
      state.loans = state.loans.filter(loan => loan.owed > 0);
    });
  });
});
$('#products').innerHTML = '<div class="market-header"><span>SERVICE</span><span>LIFESPAN COST</span><span>ACTION</span></div>' + products.map((product, index) => `<article class="product"><div class="product-name"><span class="product-index">${String(index + 1).padStart(2, '0')}</span><h2>${product.name}</h2></div><div class="product-price">${product.price}</div><button class="button secondary" data-product="${index}">Purchase →</button></article>`).join('');
$('#products').addEventListener('click', event => {
  const button = event.target.closest('[data-product]');
  if (!button) return;
  const product = products[Number(button.dataset.product)];
  review(`Purchase ${product.name.toLowerCase()}?`, `This purchase costs ${product.price} of your remaining life. This time will be deducted immediately.`, () => transact(product.name, 'expenses', -product.cost));
});
$('#transfer-form').addEventListener('submit', event => {
  event.preventDefault();
  const amount = Math.round(Number($('#transfer-amount').value) * Number($('#transfer-unit').value));
  const recipient = $('#recipient').value;
  if (!Number.isFinite(amount) || amount <= 0) return notify('Enter a positive amount to transfer.', true);
  review(`Send time to ${recipient}?`, `${shortTime(amount)} will be deducted from your lifespan. There is no transfer fee.`, () => {
    if (transact(`Transfer to ${recipient}`, 'expenses', -amount)) $('#transfer-form').reset();
  });
});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item => {
    item.classList.toggle('active', item === button);
    item.setAttribute('aria-pressed', String(item === button));
  });
  renderAll();
}));
window.addEventListener('hashchange', navigate);
// Keep a second open tab synchronized with saved account changes.
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    const updated = JSON.parse(event.newValue);
    if (validAccount(updated)) { state = updated; renderAll(); }
  } catch (error) { /* Ignore malformed external storage updates. */ }
});
renderAll();
navigate();
if (storageAvailable) save();
else notify('Saved account data could not be loaded. This is a fresh session; browser storage may be unavailable.', true);
// Exactly one timer for all five interface states; navigation never starts a timer.
setInterval(updateClock, 1000);
