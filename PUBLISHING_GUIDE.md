# Chrome Web Store — Plutus Listing Copy

Use the text below for your store listing.

---

## Summary (short description — ~132 chars)

```
See real after-tax totals on Amazon.ca — HST, GST, PST & QST for all provinces & territories.
```

---

## Detailed description

```
See what you'll actually pay on Amazon.ca — before you check out.

Amazon shows pre-tax prices. Your total depends on where you live: from 5% GST in Alberta to 15% HST in Atlantic Canada. Plutus calculates the tax and shows after-tax totals right on product pages, search results, and your cart.

WHO IT'S FOR
Anyone who shops on Amazon.ca — no setup drama. Plutus tries to read your postal code from your Amazon delivery address, or you can enter it manually or use one-tap province detection.

WHAT YOU GET
• Tax breakdown on product pages (before tax, tax amount, total)
• Compact “with tax” line on search results
• Tax on cart subtotal
• Toggle to turn overlays on or off

SUPPORTED TAXES
• HST — Ontario, Nova Scotia, New Brunswick, Newfoundland and Labrador, Prince Edward Island
• GST + PST — British Columbia, Manitoba, Saskatchewan
• GST + QST — Quebec
• GST — Alberta, Yukon, Northwest Territories, Nunavut

PRIVACY
Tax math runs on your device. Your postal code and settings are stored only in Chrome's extension storage. Optional IP-based province detection uses your public IP once to guess your province when no postal code is available — no accounts, no ads, no selling your data.

LIMITATIONS
Uses standard provincial rates shown on Amazon listings; some items may be tax-exempt at checkout. Refresh the page after changing settings if overlays don't appear.

Works on amazon.ca only.
```

---

## Single-purpose statement (Privacy practices tab)

```
Displays estimated Canadian sales tax and after-tax totals alongside prices on Amazon.ca based on the user's province or postal code.
```

---

## Permission justifications (short)

| Permission / host | Justification |
|---|---|
| `storage` | Saves postal code, tax rate, and on/off preference locally |
| `activeTab` | Reads the current tab so the popup can request your postal code from Amazon.ca when you're on that site |
| `tabs` | Checks whether the active tab is Amazon.ca before auto-detection |
| `https://www.amazon.ca/*` | Injects tax info into Amazon.ca pages you visit |
| IP geolocation hosts | One-time requests to infer province when no postal code is saved |

---

## Privacy policy URL

```
https://github.com/armaan-ghosh/taxlens/blob/main/PRIVACY_POLICY.md
```

Or raw:

```
https://raw.githubusercontent.com/armaan-ghosh/taxlens/main/PRIVACY_POLICY.md
```

---

## Test instructions (500 char max)

```
No login required. Install and pin Plutus. Open amazon.ca on a product, search, or cart page. Confirm tax breakdown and after-tax totals appear beside prices. In popup, either save a valid Canadian postal code (e.g., M5S 2E4) or click Detect (IP province estimate). Verify Current Settings (rate/type/location) updates and totals refresh. Toggle Enable Tax Display off/on to confirm overlays hide/show.
```

---

# How to update an existing Chrome Web Store listing (TaxLens → Plutus)

## Before you start

1. Build a new zip from the project root (exclude `.git`, old `taxlens*.zip`, and dev-only assets if you want a smaller package):

```bash
cd /Users/armaan/amazon-tax-calculator-canada
zip -r plutus-v1.2.0.zip . \
  -x "*.git*" -x "taxlens*.zip" -x "taxlens*.png" -x "taxlens_logo.png" -x ".DS_Store"
```

2. Push updated code to GitHub so your privacy policy URL stays current.

---

## Step-by-step in Developer Dashboard

1. Open [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Click your existing extension item (TaxLens).
3. Go to **Package** → **Upload new package**.
4. Upload `plutus-v1.2.0.zip`.
5. Confirm `manifest.json` shows:
   - **Name:** `Plutus`
   - **Version:** `1.2.0` (must be higher than your last published version)
6. Go to **Store listing** and update:
   - **Name:** `Plutus`
   - **Short description** (use Summary above)
   - **Detailed description** (use Detailed description above)
   - **Icon:** upload `icons/icon128.png` (new Plutus logo)
   - **Screenshots:** retake if they still show “TaxLens” in the popup
7. Go to **Privacy** and update:
   - **Single purpose** (paste from above)
   - **Permission justifications** (same as before; replace “TaxLens” with “Plutus” if mentioned)
   - **Privacy policy URL** (GitHub link above)
   - **Data usage** checkboxes unchanged (Location + Website content)
8. Go to **Test instructions** and replace “TaxLens” with “Plutus” in the 500-char text.
9. Click **Submit for review**.

---

## Important notes

- **Same listing vs new item:** Updating the existing item keeps reviews/installs. Users get the new name/icon on update. You do **not** need a second store item unless you want a separate listing.
- **Name change:** Chrome may re-review when name/branding changes significantly.
- **Version bump:** Every upload must increase `version` in `manifest.json` (now `1.2.0`).
- **Local testing:** After upload, reload unpacked extension at `chrome://extensions` to verify Plutus branding before submitting.

---

For first-time publish workflow, see [Chrome Web Store developer documentation](https://developer.chrome.com/docs/webstore/publish/).
