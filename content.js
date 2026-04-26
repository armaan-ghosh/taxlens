/** Amazon.ca — inject before/after-tax breakdown using stored provincial rate */

const DEBOUNCE_MS = { page: 120, delivery: 320 };

function contextOk() {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'extractPostalCode') {
    sendResponse({ postalCode: extractPostalFromPage() });
  }
});

(async function bootstrap() {
  try {
    if (!contextOk()) return;

    const cfg = await chrome.storage.sync.get(['postalCode', 'taxRate', 'enabled', 'taxType']);

    if (!cfg.postalCode) {
      tryAutoDetectAndSave();
      return;
    }
    if (!cfg.enabled || cfg.taxRate == null) return;

    const rate = Number(cfg.taxRate);
    const kind = cfg.taxType || 'Tax';

    routeInject(rate, kind);
    observeDom(rate, kind);
  } catch {
    /* extension context invalidated */
  }
})();

let deliveryTimer;
let deliveryObserver;

try {
  if (contextOk()) {
    deliveryObserver = new MutationObserver(() => {
      clearTimeout(deliveryTimer);
      deliveryTimer = setTimeout(async () => {
        try {
          if (!contextOk()) {
            deliveryObserver?.disconnect();
            return;
          }
          const { postalCode, autoDetected } = await chrome.storage.sync.get(['postalCode', 'autoDetected']);
          if (!postalCode || autoDetected) tryAutoDetectAndSave();
        } catch {
          deliveryObserver?.disconnect();
        }
      }, DEBOUNCE_MS.delivery);
    });

    const slot = document.querySelector('#glow-ingress-line2');
    if (slot) deliveryObserver.observe(slot, { childList: true, subtree: true });
  }
} catch {
  /* observer setup failed */
}

function extractPostalFromPage() {
  const groups = [
    ['#glow-ingress-line2', '#glow-ingress-line1', '#nav-global-location-slot'],
    ['[name="postalCode"]', '[name="postal-code"]', '[id*="postal"]'],
    ['[data-testid="address-postal-code"]', '.address-postal-code']
  ];

  for (const selectors of groups) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const text = el.textContent || el.value || '';
      const code = Postal.scrapeFromText(text);
      if (code) return code;
    }
  }

  const header = document.querySelector('header');
  if (header) {
    const code = Postal.scrapeFromText(header.textContent);
    if (code) return code;
  }
  return null;
}

async function persistTaxSettings(payload, autoDetected) {
  if (!payload || payload.error) return;
  await chrome.storage.sync.set({
    postalCode: payload.postalCode,
    taxRate: payload.rate,
    taxType: payload.type,
    location: payload.location,
    enabled: true,
    autoDetected
  });
}

async function tryAutoDetectAndSave() {
  try {
    if (!contextOk()) return;

    await new Promise((r) => setTimeout(r, 500));

    const fromDom = extractPostalFromPage();
    if (fromDom && Postal.FULL.test(fromDom)) {
      const { postalCode: saved } = await chrome.storage.sync.get(['postalCode']);
      if (saved === fromDom) return;

      const res = await chrome.runtime.sendMessage({ action: 'getTaxRate', postalCode: fromDom });
      await persistTaxSettings(res, true);
      return;
    }

    await tryIpFallback();
  } catch {
    /* invalidated or network */
  }
}

async function tryIpFallback() {
  if (!contextOk()) return;
  try {
    const { postalCode } = await chrome.storage.sync.get(['postalCode']);
    if (postalCode) return;

    const res = await chrome.runtime.sendMessage({ action: 'detectLocationByIP' });
    await persistTaxSettings(res, true);
  } catch {
    /* optional path */
  }
}

function pageKind() {
  const path = window.location.pathname;
  const q = window.location.search;
  if (path.includes('/dp/') || path.includes('/gp/product/')) return 'product';
  if (path.includes('/s/') || q.includes('k=')) return 'search';
  if (path.includes('/cart') || path.includes('/gp/cart')) return 'cart';
  return null;
}

function routeInject(rate, kind) {
  switch (pageKind()) {
    case 'product':
      injectIntoSelectors(
        ['.a-price-whole', '#priceblock_ourprice', '#priceblock_dealprice', '.a-price .a-offscreen'],
        rate,
        kind,
        false
      );
      break;
    case 'search':
      injectIntoSelectors(['.a-price'], rate, kind, true);
      break;
    case 'cart':
      injectCartSubtotal(rate, kind);
      break;
    default:
      break;
  }
}

function injectIntoSelectors(selectors, rate, kind, compact) {
  for (const sel of selectors) {
    for (const el of document.querySelectorAll(sel)) {
      if (el.dataset.taxInjected) continue;
      const amount = parsePrice(el);
      if (amount <= 0) continue;
      insertTaxBlock(el, amount, rate, kind, compact);
      el.dataset.taxInjected = '1';
    }
  }
}

function injectCartSubtotal(rate, kind) {
  const sub = document.querySelector('#sc-subtotal-amount-activecart');
  if (!sub || sub.dataset.taxInjected) return;
  const amount = parsePrice(sub);
  if (amount <= 0) return;
  insertTaxBlock(sub.parentElement, amount, rate, kind, false);
  sub.dataset.taxInjected = '1';
}

function parsePrice(el) {
  let raw = el.textContent || el.innerText || '';
  const off = el.querySelector('.a-offscreen');
  if (!raw.trim() && off) raw = off.textContent || '';
  raw = raw.replace(/[^0-9.,]/g, '').replace(/,/g, '');
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function insertTaxBlock(anchorEl, price, ratePct, taxLabel, compact) {
  const taxAmt = price * (ratePct / 100);
  const total = price + taxAmt;
  const sym = 'C$';

  const wrap = document.createElement('div');
  wrap.className = compact ? 'amazon-tax-info-compact' : 'amazon-tax-info';

  if (compact) {
    wrap.innerHTML = `<span class="tax-total">${sym}${total.toFixed(2)} with tax</span>`;
  } else {
    wrap.innerHTML = `
      <div class="tax-row">
        <span class="tax-label">Price before tax:</span>
        <span class="tax-value">${sym}${price.toFixed(2)}</span>
      </div>
      <div class="tax-row">
        <span class="tax-label">${taxLabel} (${ratePct}%):</span>
        <span class="tax-value">${sym}${taxAmt.toFixed(2)}</span>
      </div>
      <div class="tax-row total">
        <span class="tax-label"><strong>Total with tax:</strong></span>
        <span class="tax-value"><strong>${sym}${total.toFixed(2)}</strong></span>
      </div>`;
  }

  const host =
    anchorEl.closest?.('.a-price-whole')?.parentElement || anchorEl.parentElement;
  if (host && !host.querySelector('.amazon-tax-info, .amazon-tax-info-compact')) {
    host.appendChild(wrap);
  }
}

function observeDom(rate, kind) {
  let t;
  const obs = new MutationObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => {
      routeInject(rate, kind);
    }, DEBOUNCE_MS.page);
  });
  obs.observe(document.body, { childList: true, subtree: true });
}
