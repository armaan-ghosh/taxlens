# Privacy Policy — TaxLens

**Last updated:** March 6, 2026

## Overview

TaxLens is a browser extension that displays Canadian sales tax alongside prices on Amazon.ca. This policy explains what data the extension accesses, how it is used, and what is stored.

## Data Collection

**This extension does not collect, transmit, or sell any personal data.**

### What the extension accesses

| Data | Why | Stored? | Sent externally? |
|---|---|---|---|
| Amazon.ca page content | To read displayed prices and your delivery postal code | No | No |
| Your postal code (if entered manually) | To determine your provincial tax rate | Yes, locally in Chrome sync storage | No |
| Your IP-derived location (province only) | One-time auto-detection of your province if no postal code is configured | Province name stored locally | Your IP is sent to a geolocation API (see below) |

### IP Geolocation

When the extension cannot determine your province from the Amazon.ca page or from a previously saved postal code, it makes a single request to one of the following free IP geolocation services to determine your Canadian province:

- ipapi.co
- ipinfo.io
- ipwhois.app
- freeipapi.com

These services receive your public IP address (as with any web request) and return your approximate geographic region. The extension only uses the province/territory name from the response. No IP address, coordinates, or other data is stored by the extension. This request is made at most once per setup and is not repeated after your province is determined.

You can avoid this entirely by manually entering your postal code in the extension popup.

## Data Storage

The extension stores the following in `chrome.storage.sync` (Chrome's built-in extension storage, synced across your signed-in Chrome browsers):

- Postal code (3 or 6 characters)
- Tax rate (a number, e.g., 13)
- Tax type (e.g., "HST")
- Location label (e.g., "Ontario")
- Enabled/disabled toggle state
- Whether settings were auto-detected

No other data is stored. No cookies are set. No local databases are created.

## Data Sharing

This extension does not share any data with third parties, analytics services, advertisers, or any external servers beyond the one-time IP geolocation request described above.

## Permissions Explained

| Permission | Why it's needed |
|---|---|
| `storage` | Save your postal code and tax settings locally |
| `activeTab` | Read the current Amazon.ca tab to extract your delivery postal code |
| `tabs` | Check if the current tab is an Amazon.ca page before attempting auto-detection |
| Host access to `amazon.ca` | Inject tax calculations into Amazon.ca product pages |
| Host access to geolocation APIs | One-time province detection via IP (only when postal code is not configured) |

## Changes to This Policy

If this policy changes, the updated version will be published alongside the extension. The "Last updated" date at the top will reflect the most recent revision.

## Contact

If you have questions about this privacy policy, please open an issue at https://github.com/armaanghosh/taxlens/issues.
