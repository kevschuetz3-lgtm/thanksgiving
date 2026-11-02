// Family Thanksgiving 2026 sign-up list: the backend for https://kevschuetz3-lgtm.github.io/thanksgiving/
// Runs as Kevin and is open to anyone with the page link. The list lives in the "Sign-ups" tab of the sheet this
// script is bound to, so Kevin can fix any name there by hand. The hidden "key" column holds a hash of the browser
// key that made each sign-up: only that phone or computer can change or remove it from the page.

const SHEET_ID = '1CPkEsbM8A_tA1b42_48Q5CDQANnKON9YExYFdCOVcR8';
const TAB = 'Sign-ups';
const HEADERS = ['Course', 'Dish', 'Bringing it', 'Signed up', 'id', 'key'];
const EXTRA_COURSE = 'Also coming';
const MAX_TEXT = 40;
const MAX_ROWS = 60;

// The starting menu. Turkey and stuffing were claimed before the page went public, so they have no key.
const MENU = [
  ['Starters', 'Charcuterie board', '', 'charcuterie'],
  ['Starters', 'Veggie tray & dip', '', 'veggies'],
  ['The bird', 'Turkey', 'Tom & Liz', 'turkey'],
  ['The bird', 'Gravy', '', 'gravy'],
  ['Sides', 'Stuffing', 'Ausi', 'stuffing'],
  ['Sides', 'Mashed potatoes', '', 'mashed'],
  ['Sides', 'Sweet potato casserole', '', 'sweet-potatoes'],
  ['Sides', 'Green bean casserole', '', 'green-beans'],
  ['Sides', 'Mac & cheese', '', 'mac'],
  ['Sides', 'Cranberry sauce', '', 'cranberry'],
  ['Sides', 'Fall salad', '', 'salad'],
  ['Sides', 'Dinner rolls & butter', '', 'rolls'],
  ['Dessert', 'Apple pie', '', 'apple-pie'],
  ['Dessert', 'Pumpkin pie', '', 'pumpkin-pie'],
  ['Dessert', 'Whipped cream & ice cream', '', 'toppings'],
  ['Drinks & extras', 'Cider & soft drinks', '', 'cider'],
  ['Drinks & extras', 'Ice & paper goods', '', 'ice-paper'],
];

// Read-only view of the list, handy for checking the backend from a browser.
function doGet() {
  return reply_(() => ({ ok: true, items: items_(rows_(sheet_()), '') }));
}

// Every call from the page: {action: list | claim | clear | add, token, id?, by?, dish?}.
function doPost(e) {
  return reply_(() => {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) return { ok: false, code: 'busy' };
    try {
      return handle_(sheet_(), req);
    } finally {
      lock.releaseLock();
    }
  });
}

// Run once from the editor to approve the script. It also lays out the sheet.
function setup() {
  console.log(rows_(sheet_()).length + ' dishes on the list');
}

function handle_(sh, req) {
  const token = String(req.token || '');
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return { ok: false, code: 'bad_request' };
  const key = hash_(token);
  const rows = withIds_(sh, rows_(sh));
  const row = rows.find((r) => r.id === String(req.id || ''));
  const by = clean_(req.by);
  const withList = (out) => Object.assign(out, { items: items_(rows_(sh), key) });

  switch (req.action) {
    case 'list':
      return { ok: true, items: items_(rows, key) };
    case 'claim':
      if (!by) return { ok: false, code: 'bad_request' };
      if (!row) return withList({ ok: false, code: 'gone' });
      if (row.by && row.key !== key) return withList({ ok: false, code: 'taken' });
      sh.getRange(row.row, 3, 1, 4).setValues([[by, stamp_(), row.id, key]]);
      return withList({ ok: true });
    case 'clear':
      if (!row || !row.by) return withList({ ok: true });
      if (row.key !== key) return withList({ ok: false, code: 'not_yours' });
      if (row.course === EXTRA_COURSE) sh.deleteRow(row.row);
      else sh.getRange(row.row, 3, 1, 4).setValues([['', '', row.id, '']]);
      return withList({ ok: true });
    case 'add': {
      const dish = clean_(req.dish);
      if (!dish || !by) return { ok: false, code: 'bad_request' };
      if (rows.length >= MAX_ROWS) return withList({ ok: false, code: 'full' });
      sh.appendRow([EXTRA_COURSE, dish, by, stamp_(), newId_(), key]);
      return withList({ ok: true });
    }
    default:
      return { ok: false, code: 'bad_request' };
  }
}

function sheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(TAB);
  if (!sh) {
    sh = ss.getSheets()[0];
    sh.setName(TAB);
  }
  if (sh.getLastRow() === 0) seed_(sh);
  return sh;
}

function seed_(sh) {
  // Plain text everywhere, so a name or a time is never read as a number, date or formula.
  sh.getRange(1, 1, MAX_ROWS + 1, HEADERS.length).setNumberFormat('@');
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sh.getRange(2, 1, MENU.length, HEADERS.length)
    .setValues(MENU.map(([course, dish, by, id]) => [course, dish, by, '', id, '']));
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 140).setColumnWidth(2, 220).setColumnWidth(3, 180).setColumnWidth(4, 130);
  sh.hideColumns(5, 2);
}

function rows_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEADERS.length).getDisplayValues()
    .map((r, i) => ({ row: i + 2, course: r[0].trim(), dish: r[1].trim(), by: r[2].trim(), id: r[4].trim(), key: r[5].trim() }))
    .filter((r) => r.dish);
}

// Dishes Kevin types into the sheet by hand get an id the first time the page asks for the list.
function withIds_(sh, rows) {
  rows.filter((r) => !r.id).forEach((r) => {
    r.id = newId_();
    sh.getRange(r.row, 5).setValue(r.id);
  });
  return rows;
}

function items_(rows, key) {
  return rows.map((r) => ({
    id: r.id,
    course: r.course || EXTRA_COURSE,
    dish: r.dish,
    by: r.by,
    mine: Boolean(key && r.by && r.key === key),
  }));
}

function clean_(v) {
  return String(v == null ? '' : v)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[=+\-@'\s]+/, '') // a leading = + - @ would turn the cell into a formula
    .slice(0, MAX_TEXT)
    .trim();
}

function hash_(token) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).slice(0, 22);
}

function newId_() {
  return 'x' + Utilities.getUuid().replace(/-/g, '').slice(0, 10);
}

function stamp_() {
  return Utilities.formatDate(new Date(), 'America/Denver', 'MMM d, h:mm a');
}

function reply_(fn) {
  let out;
  try {
    out = fn();
  } catch (err) {
    console.error((err && err.stack) || err);
    out = { ok: false, code: 'error' };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
