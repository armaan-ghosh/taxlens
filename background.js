importScripts('postal.js');

class OutsideCanadaError extends Error {
  constructor() {
    super('Location detected outside Canada');
    this.name = 'OutsideCanadaError';
  }
}

let taxDatabase = null;

fetch(chrome.runtime.getURL('canadaTaxRates.json'))
  .then((r) => r.json())
  .then((data) => { taxDatabase = data; })
  .catch((e) => console.error('Failed to load tax database:', e));

const IP_FETCH_TIMEOUT_MS = 5000;
const IP_SERVICES = [
  {
    url: 'https://ipapi.co/json/',
    parse: (d) => ({
      country: d.country_code,
      province: d.region_code,
      lat: d.latitude,
      lng: d.longitude
    })
  },
  {
    url: 'https://ipinfo.io/json',
    parse: (d) => {
      const [lat, lng] = (d.loc || '').split(',').map(Number);
      return {
        country: d.country,
        province: resolveProvinceFromLabel(d.region),
        lat,
        lng
      };
    }
  },
  {
    url: 'https://ipwhois.app/json/',
    parse: (d) => ({
      country: d.country_code,
      province: resolveProvinceFromLabel(d.region),
      lat: d.latitude,
      lng: d.longitude
    })
  },
  {
    url: 'https://freeipapi.com/api/json',
    parse: (d) => ({
      country: d.countryCode,
      province: resolveProvinceFromLabel(d.regionName),
      lat: d.latitude,
      lng: d.longitude
    })
  }
];

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const route = MessageRoutes[request.action];
  if (!route) return;

  Promise.resolve(route(request))
    .then(sendResponse)
    .catch((err) => sendResponse({ error: err.message }));

  return true;
});

const MessageRoutes = {
  async getTaxRate(req) {
    return getTaxRateForPostalCode(req.postalCode);
  },
  async getTaxRateByCoords(req) {
    return nearestProvinceTax(req.lat, req.lng);
  },
  async detectLocationByIP() {
    return detectLocationByIP();
  }
};

async function getTaxRateForPostalCode(postalRaw) {
  const postal = Postal.validate(postalRaw);
  if (!postal) throw new Error('Invalid Canadian postal code format');
  if (!taxDatabase) throw new Error('Tax database not loaded');

  const fsa = postal.slice(0, 3);
  const refined = taxDatabase.universities?.[fsa];
  if (refined) {
    const meta = taxDatabase.provinces[refined.province];
    return {
      rate: refined.rate,
      location: `${meta.name} – ${refined.city}`,
      type: meta.type,
      postalCode: fsa
    };
  }

  const prefixRow = taxDatabase.postalCodePrefix[fsa[0]];
  if (!prefixRow) throw new Error('Invalid postal code prefix');

  const code = prefixRow === 'NT/NU/YT' ? 'YT' : prefixRow;
  const prov = taxDatabase.provinces[code];
  return {
    rate: prov.total,
    location: prov.name,
    type: prov.type,
    postalCode: fsa
  };
}

function resolveProvinceFromLabel(label) {
  if (!label || !taxDatabase) return null;
  if (taxDatabase.provinces[label]) return label;
  const lower = label.toLowerCase();
  for (const [code, p] of Object.entries(taxDatabase.provinces)) {
    if (p.name.toLowerCase() === lower) return code;
  }
  return null;
}

async function detectLocationByIP() {
  if (!taxDatabase) throw new Error('Tax database not loaded');

  for (const svc of IP_SERVICES) {
    try {
      const res = await fetch(svc.url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(IP_FETCH_TIMEOUT_MS)
      });
      if (!res.ok) continue;

      const geo = svc.parse(await res.json());
      if (geo.country !== 'CA') throw new OutsideCanadaError();

      const direct = geo.province && taxDatabase.provinces[geo.province];
      if (direct) {
        return provinceTaxResult(geo.province, direct, { geoDetected: true });
      }

      if (Number.isFinite(geo.lat) && Number.isFinite(geo.lng)) {
        return nearestProvinceTax(geo.lat, geo.lng);
      }
    } catch (err) {
      if (err instanceof OutsideCanadaError) throw err;
    }
  }

  throw new Error('All IP geolocation services unavailable');
}

function provinceTaxResult(code, prov, extra = {}) {
  return {
    rate: prov.total,
    location: prov.name,
    type: prov.type,
    postalCode: prov.fsa,
    province: code,
    ...extra
  };
}

function nearestProvinceTax(lat, lng) {
  if (!taxDatabase) throw new Error('Tax database not loaded');

  let bestCode = null;
  let bestSq = Infinity;

  for (const [code, p] of Object.entries(taxDatabase.provinces)) {
    if (p.lat == null || p.lng == null) continue;
    const dx = lat - p.lat;
    const dy = lng - p.lng;
    const sq = dx * dx + dy * dy;
    if (sq < bestSq) {
      bestSq = sq;
      bestCode = code;
    }
  }

  if (!bestCode) throw new Error('Could not determine province from coordinates');

  return provinceTaxResult(bestCode, taxDatabase.provinces[bestCode], { geoDetected: true });
}
