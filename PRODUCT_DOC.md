# Plutus: Product Documentation

## 1. What It Is

A Chrome extension that calculates and displays Canadian sales tax (HST/GST/PST/QST) directly on Amazon.ca product pages, search results, and cart pages. Prices on Amazon.ca are shown before tax. This extension adds the after-tax total inline so anyone shopping on Amazon.ca can see what they'll pay.

---

## 2. The Problem

Amazon.ca displays pre-tax prices. The actual price a Canadian customer pays at checkout varies significantly by province:

| Province | Tax Type | Rate |
|---|---|---|
| Alberta | GST | 5% |
| Saskatchewan | GST+PST | 11% |
| British Columbia, Manitoba | GST+PST | 12% |
| Ontario | HST | 13% |
| Quebec | GST+QST | 14.975% |
| Nova Scotia, New Brunswick, Newfoundland, PEI | HST | 15% |
| Northwest Territories, Nunavut, Yukon | GST | 5% |

A $100 item costs $105 in Alberta but $115 in Nova Scotia. Without doing mental math on every product, shoppers can't compare true costs. This extension eliminates that friction.

---

## 3. How It Works (User Perspective)

### First-Time Setup

The extension attempts to configure itself automatically with zero user input:

1. **Install** the extension from `chrome://extensions` (developer mode, "Load unpacked").
2. **Visit Amazon.ca** or click the extension icon.
3. The extension auto-detects your province through a 3-tier cascade (detailed below).
4. Tax information appears inline on every price.

### Manual Override

Open the popup and either:
- Type a Canadian postal code (e.g., `M5S 2E4`) and click **Save Settings**.
- Click the **Detect** button to re-run IP-based location detection.

### Daily Use

- **Product pages**: A tax breakdown card appears below each price showing pre-tax price, tax amount, and total.
- **Search results**: A compact badge shows the after-tax total next to each result.
- **Cart page**: Tax is calculated on the cart subtotal.
- **Toggle on/off**: The popup has a switch to enable or disable all tax overlays.

---

## 4. How It Works (Technical)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
│                                                              │
│  ┌────────────┐    messages    ┌──────────────────────────┐  │
│  │  popup.js   │◄────────────►│    background.js          │  │
│  │  popup.html │               │    (service worker)       │  │
│  │  popup.css  │               │                           │  │
│  └────────────┘               │  - getTaxRateForPostalCode│  │
│                                │  - getTaxRateByCoords     │  │
│  ┌────────────┐    messages   │  - detectLocationByIP     │  │
│  │ content.js  │◄────────────►│                           │  │
│  │ content.css │               └──────────┬───────────────┘  │
│  └─────┬──────┘                           │                  │
│        │                                  │                  │
│        │ DOM injection              loads at startup         │
│        ▼                                  ▼                  │
│  ┌────────────┐               ┌──────────────────────────┐  │
│  │ Amazon.ca   │               │  canadaTaxRates.json     │  │
│  │ web pages   │               │  (provinces, prefixes,   │  │
│  └────────────┘               │   optional FSA labels)    │  │
│                                └──────────────────────────┘  │
│                                                              │
│               chrome.storage.sync                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ postalCode | taxRate | taxType | location | enabled   │   │
│  │ autoDetected                                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                    IP Geolocation
                    (fallback chain)
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          ipapi.co   ipinfo.io   ipwhois.app  ...
```

### File-by-File Breakdown

#### `manifest.json` — Extension Configuration

- **Manifest V3** (latest Chrome extension standard).
- **Permissions**: `storage` (persist settings), `activeTab` / `tabs` (query current tab for auto-detect).
- **Host permissions**: `amazon.ca` (content script injection) + 4 IP geolocation APIs (fallback chain).
- **Content script**: `content.js` + `content.css` injected on all `amazon.ca` pages at `document_idle`.
- **Service worker**: `background.js` runs as the background process.

#### `canadaTaxRates.json` — Tax Database

A single JSON file with three data sections:

1. **`provinces`** (13 entries): Province code, full name, tax type (HST/GST/GST+PST/GST+QST), total rate, population-center lat/lng coordinates, and a default FSA (Forward Sortation Area) code.

2. **`postalCodePrefix`** (16 entries): Maps the first letter of a Canadian postal code to its province. This is the core insight that makes the extension work — Canada Post assigns postal code prefixes by province:
   - `A` = Newfoundland, `B` = Nova Scotia, `C` = PEI, `E` = New Brunswick
   - `G/H/J` = Quebec, `K/L/M/N/P` = Ontario, `R` = Manitoba
   - `S` = Saskatchewan, `T` = Alberta, `V` = British Columbia
   - `X` = Northern territories, `Y` = Yukon

3. **`universities`** (internal JSON key — 50+ FSAs): Optional refinement rows that pair an FSA with a **city label** for clearer display (e.g., `Ontario – Waterloo`). Tax rates match the parent province; this table does not change tax math.

#### `background.js` — Tax Calculation Engine (Service Worker)

Handles three message types:

| Message | Input | What It Does |
|---|---|---|
| `getTaxRate` | Postal code string | Validates format, extracts 3-char FSA, checks optional FSA refinement rows, falls back to province lookup via prefix letter |
| `getTaxRateByCoords` | lat, lng | Finds nearest province by Euclidean distance to each province's population center coordinates |
| `detectLocationByIP` | (none) | Calls IP geolocation APIs to determine province from the user's public IP address |

**IP geolocation fallback chain**: Tries 4 services sequentially (ipapi.co, ipinfo.io, ipwhois.app, freeipapi.com), each with a 5-second timeout. Some return province codes directly (`"ON"`), others return province names (`"Ontario"`) which are resolved via `resolveProvinceCode()`. If a service returns coordinates but no usable province, it falls through to `getTaxRateByCoords`. The chain stops early only if the country is not Canada.

**Postal code to province resolution**: `getTaxRateForPostalCode` uses a two-step lookup:
1. If the 3-character FSA exists in the optional refinement table (`universities` key in JSON), return a **province-first** location label (`Province name – City`) with the same rate as that province.
2. Otherwise, take the first letter of the FSA and look it up in `postalCodePrefix` to get the province code, then read the tax rate from `provinces`.

#### `content.js` — Page Injection (Content Script)

Runs on every `amazon.ca` page. Responsibilities:

1. **Auto-detect postal code from the page**: Scrapes Amazon's delivery address area using prioritized CSS selectors (`#glow-ingress-line2`, form fields, header). Uses regex pattern `[A-Z]\d[A-Z]\s?\d[A-Z]\d` to extract Canadian postal codes.

2. **IP-based fallback**: If no postal code is found on the page and none is saved, calls `detectLocationByIP` through the background worker.

3. **Tax injection**: Based on the current page type:
   - **Product pages** (`/dp/`, `/gp/product/`): Injects a full tax breakdown card (pre-tax, tax amount, total) below price elements.
   - **Search results** (`/s/`, `?k=`): Injects compact "C$XX.XX with tax" badges.
   - **Cart** (`/cart`): Injects tax on the subtotal.

4. **Dynamic content handling**: A `MutationObserver` on `document.body` detects when Amazon dynamically loads new prices (infinite scroll, AJAX navigation) and re-runs injection with debouncing (100ms).

5. **Delivery address observer**: A separate `MutationObserver` watches `#glow-ingress-line2` (Amazon's delivery location display) for changes. When the user changes their delivery address, the extension re-extracts the postal code.

6. **Context invalidation safety**: All async operations check `isExtensionContextValid()` (tests `chrome.runtime.id`) before proceeding. Observers disconnect themselves if the extension context is invalidated (e.g., after extension reload).

#### `content.css` — Injected Styles

Two style variants:
- **Full card** (`.amazon-tax-info`): Uses Amazon's own font family, matching border/shadow aesthetics. The total row has a subtle orange gradient highlight matching Amazon's brand color.
- **Compact badge** (`.amazon-tax-info-compact`): Inline badge for search results with hover effects.

#### `popup.html` / `popup.css` / `popup.js` — Settings UI

A single-page popup with:
- **Header**: Canadian-themed branding with maple leaf icon.
- **Postal code input**: Real-time formatting (auto-inserts space after 3rd character), live validation with visual feedback (green checkmark / red X).
- **Save button**: Sends postal code to background worker, receives tax rate, stores in `chrome.storage.sync`.
- **Detect button**: Triggers `detectLocationByIP` through the background worker for one-click province detection.
- **Enable/disable toggle**: Persists to storage, content script checks this before injecting.
- **Settings display**: Shows current postal code, tax rate, tax type, and location.
- **Auto-detect on open**: If no postal code is saved, the popup automatically tries (1) extracting from the current Amazon tab, then (2) IP geolocation fallback.

---

## 5. Location Detection: The 3-Tier Cascade

The extension resolves the user's location with zero configuration through three methods, tried in order:

```
Tier 1: Amazon page scraping
  ├─ Found postal code? → Save + done
  └─ Not found? ↓

Tier 2: IP geolocation (background worker)
  ├─ 4-service fallback chain
  ├─ Province detected? → Save default FSA + done
  └─ All failed? ↓

Tier 3: Manual input
  └─ User enters postal code or clicks Detect button
```

### Why This Order?

- **Tier 1** is the most accurate — it reads the exact postal code Amazon already knows about the user.
- **Tier 2** is province-accurate, which is all that's needed for tax calculation. No permission prompts.
- **Tier 3** is the fallback for users on VPNs, outside Canada, or with ad blockers that interfere with IP geolocation.

---

## 6. Data Model

### Stored Settings (`chrome.storage.sync`)

| Key | Type | Description |
|---|---|---|
| `postalCode` | string | 3 or 6 character FSA/postal code (no space) |
| `taxRate` | number | Combined tax rate (e.g., `13` for Ontario HST) |
| `taxType` | string | Tax label (e.g., `"HST"`, `"GST+PST"`, `"GST+QST"`) |
| `location` | string | Human-readable location (e.g., `"Ontario"` or `"Ontario – Toronto"`) |
| `enabled` | boolean | Whether tax display is active |
| `autoDetected` | boolean | Whether the current settings came from auto-detection |

### Tax Rate Response (internal message format)

```json
{
  "rate": 13,
  "location": "Ontario",
  "type": "HST",
  "postalCode": "M5S",
  "province": "ON",
  "geoDetected": true
}
```

---

## 7. The Postal Code Mapping System

The core design insight: **you don't need an exact postal code to calculate tax — you need the province.** Canada's postal code system has a built-in province indicator:

```
M  5S  2E4
│   │   │
│   │   └── Local Delivery Unit (not needed for tax)
│   └────── Forward Sortation Area (not needed for tax)
└────────── Province prefix (THIS determines tax rate)
```

The first letter of any Canadian postal code maps to exactly one province (with the exception of `X` which covers NT/NU). This means:
- All 5 Ontario prefixes (`K`, `L`, `M`, `N`, `P`) → 13% HST
- All 3 Quebec prefixes (`G`, `H`, `J`) → 14.975% GST+QST
- `T` → 5% GST (Alberta)

The `postalCodePrefix` table in `canadaTaxRates.json` encodes this mapping. The optional refinement table (JSON key `universities`) only adds friendlier city-level labels for some FSAs; the tax rate is always the same as the parent province.

---

## 8. Security and Privacy

- **No data leaves the device** for tax calculation — the entire tax database is bundled in the extension.
- **IP geolocation** is only used when no postal code is configured, and only to determine the province (not stored or transmitted elsewhere).
- **No tracking, no analytics, no accounts.**
- **Minimal permissions**: `storage` and `activeTab` are the only Chrome permissions used. Host permissions are scoped to `amazon.ca` and the 4 geolocation APIs.
- **`chrome.storage.sync`** stores only 6 small key-value pairs (see Data Model above).

---

## 9. File Inventory

| File | Size | Purpose |
|---|---|---|
| `manifest.json` | Config | Extension metadata, permissions, content script registration |
| `background.js` | ~4 KB | Service worker: tax lookups, IP geolocation, message routing |
| `content.js` | ~8 KB | Content script: page scraping, tax injection, DOM observation |
| `content.css` | ~2 KB | Styles for injected tax cards (Amazon-native aesthetic) |
| `popup.html` | ~3 KB | Settings popup HTML structure |
| `popup.css` | ~12 KB | Settings popup styles (card layout, animations, toggle) |
| `popup.js` | ~8 KB | Settings popup logic (validation, save, detect, auto-fill) |
| `canadaTaxRates.json` | ~5 KB | Tax database (13 provinces, 16 prefixes, optional FSA city labels) |
| `icons/` | Dir | Extension icons (16px, 48px, 128px) |

---

## 10. Supported Tax Types

| Type | Provinces | Components |
|---|---|---|
| **HST** (Harmonized Sales Tax) | ON, NS, NB, NL, PE | Single combined federal + provincial rate |
| **GST** (Goods and Services Tax) | AB, NT, NU, YT | Federal tax only (5%), no provincial |
| **GST + PST** | BC, MB, SK | Federal GST (5%) + Provincial Sales Tax |
| **GST + QST** | QC | Federal GST (5%) + Quebec Sales Tax (9.975%) |

---

## 11. Limitations and Known Constraints

1. **Tax-exempt items**: Some product categories (basic groceries, prescriptions, children's clothing) are tax-exempt or zero-rated. The extension applies the standard rate to all displayed prices.
2. **Non-standard tax rules**: Some First Nations reserves have different tax rules. The extension uses standard provincial rates.
3. **Amazon.ca only**: Does not work on amazon.com, amazon.co.uk, or other Amazon domains.
4. **Price extraction**: Relies on Amazon's current DOM structure (`.a-price-whole`, `.a-offscreen`, etc.). Amazon UI changes may require selector updates.
5. **IP geolocation accuracy**: Province-level accuracy is ~95%+ for Canadian IPs. VPN users may get incorrect provinces.
6. **Rate limits**: The free IP geolocation APIs have daily/monthly limits (mitigated by the 4-service fallback chain and caching results in storage).

---

## 12. Future Considerations

- **Chrome Web Store publishing**: Requires developer account ($5 one-time fee), privacy policy, and store listing assets.
- **Tax-exempt category detection**: Could parse Amazon's product category data to skip tax on exempt items.
- **Amazon.com support**: US sales tax varies by state + county (much more complex — ~11,000 tax jurisdictions vs Canada's 13).
- **Price history integration**: Show tax-inclusive price trends over time.
- **Multi-item cart breakdown**: Show per-item tax in the cart, not just subtotal.
