# Chrome Web Store — Listing Copy (Broad Audience)

Use the text below for your store listing so the product reads as **for every Canadian shopper**, not a niche audience.

---

## Summary (short description — ~132 chars)

```
See real after-tax totals on Amazon.ca — HST, GST, PST & QST for all provinces & territories.
```

*(Adjust length to fit the dashboard field.)*

---

## Detailed description

```
See what you'll actually pay on Amazon.ca — before you check out.

Amazon shows pre-tax prices. Your total depends on where you live: from 5% GST in Alberta to 15% HST in Atlantic Canada. This extension calculates the tax and shows after-tax totals right on product pages, search results, and your cart.

WHO IT'S FOR
Anyone who shops on Amazon.ca — no setup drama. The extension tries to read your postal code from your Amazon delivery address, or you can enter it manually or use one-tap province detection.

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

For full upload steps (zip, screenshots, privacy policy URL), see your workflow docs or [Chrome Web Store developer documentation](https://developer.chrome.com/docs/webstore/).
