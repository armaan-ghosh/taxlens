# Plutus

See the real price you'll pay on Amazon.ca. This Chrome extension calculates and displays Canadian sales tax (HST, GST, PST, QST) directly on product pages, search results, and your cart.

## Why

Amazon.ca shows pre-tax prices. A $100 item costs $105 in Alberta but $115 in Nova Scotia. Plutus does the math so you don't have to.

## Features

- **Auto-detects your province** from your Amazon delivery address or IP location — zero setup required
- **All 13 provinces and territories** with correct HST/GST/PST/QST rates
- **Works on every page** — product details, search results, cart
- **Privacy-first** — tax database is bundled locally, no data collected

## Install

### From Chrome Web Store (recommended)

> Coming soon — link will be added after approval.

## Release Package

- Upload `plutus.zip` for the latest build.
- For versioned releases, use `plutus-v1.2.0.zip`.

### From source (developer mode)

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the project folder
5. Visit [amazon.ca](https://www.amazon.ca) — tax info appears automatically

## How It Works

1. Plutus reads your postal code from Amazon's delivery address display
2. If none is found, it detects your province via IP geolocation (one-time, no tracking)
3. The first letter of any Canadian postal code maps to a province — that determines your tax bracket
4. Tax breakdowns are injected inline next to every price on the page

You can also manually enter your postal code or click the **Detect** button in the popup.

## Supported Tax Rates

| Province | Tax | Rate |
|---|---|---|
| Alberta, NT, NU, Yukon | GST | 5% |
| Saskatchewan | GST+PST | 11% |
| British Columbia, Manitoba | GST+PST | 12% |
| Ontario | HST | 13% |
| Quebec | GST+QST | 14.975% |
| Nova Scotia, New Brunswick, NL, PEI | HST | 15% |

## Privacy

This extension does not collect, transmit, or sell any personal data. See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for full details.

- Tax calculations happen entirely on your device
- Your postal code is stored only in Chrome's local extension storage
- IP geolocation is used once (if needed) to detect your province — no data is retained

## Development

```bash
git clone https://github.com/armaan-ghosh/taxlens.git
cd taxlens
# Load as unpacked extension in chrome://extensions
```

### Project Structure

```
manifest.json          Extension config (Manifest V3)
postal.js              Shared postal-code validation / parsing
background.js          Service worker — tax lookups, IP geolocation
content.js             Content script — price injection on Amazon.ca
content.css            Styles for injected tax info
popup.html/css/js      Extension popup UI
canadaTaxRates.json    Tax database (provinces, postal prefixes, optional FSA labels)
icons/                 Extension icons (16, 48, 128px)
```

### Adding a province rate change

Edit the `provinces` object in `canadaTaxRates.json`:

```json
"ON": { "name": "Ontario", "type": "HST", "total": 13, "lat": 43.65, "lng": -79.38, "fsa": "M5S" }
```

## License

MIT License. See [LICENSE](LICENSE) for details.
