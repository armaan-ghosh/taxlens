(() => {
  const el = {
    postal: document.getElementById('postalCode'),
    save: document.getElementById('saveBtn'),
    detect: document.getElementById('detectBtn'),
    clear: document.getElementById('clearPostalBtn'),
    toggle: document.getElementById('enableToggle'),
    info: document.getElementById('infoSection'),
    message: document.getElementById('message'),
    postalRow: document.getElementById('postalRow'),
    postalVal: document.getElementById('currentPostal'),
    rateVal: document.getElementById('currentRate'),
    typeVal: document.getElementById('currentType'),
    locLabel: document.getElementById('locationLabel'),
    locVal: document.getElementById('currentLocation'),
    autoBadge: document.getElementById('autoDetectStatus'),
    validIcon: document.getElementById('validationIcon')
  };

  const btnLabel = {
    save: () => el.save.querySelector('.btn-text'),
    detect: () => el.detect.querySelector('.btn-text')
  };

  let messageTimer;

  document.addEventListener('DOMContentLoaded', () => {
    restoreSettings();
    updateSaveState();
    tryAutoDetect();
  });

  el.save.addEventListener('click', savePostal);
  el.detect.addEventListener('click', detectProvinceByIp);
  el.clear.addEventListener('click', clearPostal);
  el.postal.addEventListener('input', onPostalInput);
  el.postal.addEventListener('blur', onPostalBlur);
  el.toggle.addEventListener('change', onToggle);

  function showMessage(text, type = 'success') {
    clearTimeout(messageTimer);
    el.message.textContent = text;
    el.message.className = `message ${type}`;
    messageTimer = setTimeout(() => {
      el.message.className = 'message';
      el.message.textContent = '';
    }, 5000);
  }

  function clearMessage() {
    clearTimeout(messageTimer);
    el.message.textContent = '';
    el.message.className = 'message';
  }

  function onPostalInput() {
    let v = Postal.clean(el.postal.value);
    if (v.length > 3) v = `${v.slice(0, 3)} ${v.slice(3)}`;
    el.postal.value = v;

    const ok = Postal.validate(v);
    if (!v.length) {
      el.postal.classList.remove('valid', 'invalid');
      el.validIcon.textContent = '';
    } else if (ok) {
      el.postal.classList.add('valid');
      el.postal.classList.remove('invalid');
      el.validIcon.textContent = '✓';
      el.validIcon.style.color = '#2d5016';
    } else if (v.length >= 3) {
      el.postal.classList.add('invalid');
      el.postal.classList.remove('valid');
      el.validIcon.textContent = '✗';
      el.validIcon.style.color = '#dc2626';
    }

    el.clear.classList.toggle('visible', v.length > 0);
    updateSaveState();
  }

  function clearPostal() {
    el.postal.value = '';
    onPostalInput();
    el.postal.focus();
  }

  function onPostalBlur() {
    if (el.postal.value && !Postal.validate(el.postal.value)) {
      showMessage('Canadian format: A1A 1A1 or A1A', 'error');
    }
  }

  function updateSaveState() {
    const ok = Postal.validate(el.postal.value || '');
    el.save.disabled = !ok;
    btnLabel.save().textContent = ok ? 'Save Settings' : 'Enter Postal Code';
  }

  async function bg(action, payload = {}) {
    const res = await chrome.runtime.sendMessage({ action, ...payload });
    if (res?.error) throw new Error(res.error);
    return res;
  }

  function fillInfoPanel({ rate, type, location, postal, geoOnly }) {
    if (geoOnly) {
      el.postalRow.style.display = 'none';
      el.locLabel.textContent = 'Province';
    } else {
      el.postalRow.style.display = '';
      el.postalVal.textContent = postal || '—';
      el.locLabel.textContent = 'Location';
    }
    el.rateVal.textContent = `${rate}%`;
    el.typeVal.textContent = type;
    el.locVal.textContent = location || 'Canada';
    el.info.style.display = 'block';
  }

  async function persistTax(res, autoDetected) {
    await chrome.storage.sync.set({
      postalCode: res.postalCode,
      taxRate: res.rate,
      taxType: res.type,
      location: res.location,
      enabled: true,
      autoDetected,
      geoDetected: Boolean(res.geoDetected)
    });
  }

  async function detectProvinceByIp() {
    el.detect.disabled = true;
    btnLabel.detect().textContent = 'Detecting...';

    try {
      const res = await bg('detectLocationByIP');
      el.postal.value = '';
      onPostalInput();
      await persistTax(res, true);
      el.toggle.checked = true;
      fillInfoPanel({ rate: res.rate, type: res.type, location: res.location, geoOnly: true });
      el.autoBadge.innerHTML = `Province: <strong>${res.location}</strong> (estimated from IP)`;
      el.autoBadge.style.display = 'block';
      showMessage(`Province set to ${res.location}`, 'success');
    } catch (e) {
      showMessage(e.message || 'Detection failed', 'error');
    } finally {
      el.detect.disabled = false;
      btnLabel.detect().textContent = 'Detect';
    }
  }

  async function tryAutoDetect() {
    const { postalCode } = await chrome.storage.sync.get(['postalCode']);
    if (postalCode) return;

    let fromAmazon = false;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url?.includes('amazon.ca')) {
        fromAmazon = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { action: 'extractPostalCode' }, (resp) => {
            if (chrome.runtime.lastError || !resp?.postalCode) return resolve(false);
            const clean = Postal.validate(resp.postalCode);
            if (!clean) return resolve(false);
            el.postal.value = Postal.display(clean);
            el.autoBadge.innerHTML = `Auto-detected: <strong>${clean}</strong>`;
            el.autoBadge.style.display = 'block';
            onPostalInput();
            savePostal().then((saved) => resolve(Boolean(saved))).catch(() => resolve(false));
          });
        });
      }
    } catch {
      /* no content script */
    }

    if (!fromAmazon) await tryIpSilent();
  }

  async function tryIpSilent() {
    try {
      const res = await bg('detectLocationByIP');
      el.postal.value = '';
      onPostalInput();
      await persistTax(res, true);
      el.toggle.checked = true;
      fillInfoPanel({ rate: res.rate, type: res.type, location: res.location, geoOnly: true });
      el.autoBadge.innerHTML = `Province: <strong>${res.location}</strong> (estimated from IP)`;
      el.autoBadge.style.display = 'block';
    } catch {
      /* optional */
    }
  }

  async function restoreSettings() {
    clearMessage();
    const s = await chrome.storage.sync.get([
      'postalCode', 'taxRate', 'taxType', 'location', 'enabled', 'autoDetected', 'geoDetected'
    ]);

    if (s.postalCode && !s.geoDetected) {
      el.postal.value = Postal.display(Postal.clean(s.postalCode));
      onPostalInput();
    }

    if (typeof s.enabled === 'boolean') el.toggle.checked = s.enabled;

    if (s.autoDetected) {
      if (s.geoDetected && s.location) {
        el.autoBadge.innerHTML = `Province: <strong>${s.location}</strong> (estimated from IP)`;
        el.autoBadge.style.display = 'block';
      } else if (s.postalCode) {
        el.autoBadge.innerHTML = `Auto-detected: <strong>${s.postalCode}</strong>`;
        el.autoBadge.style.display = 'block';
      }
    }

    if (s.taxRate != null && s.taxType) {
      fillInfoPanel({
        rate: s.taxRate,
        type: s.taxType,
        location: s.location,
        postal: s.postalCode,
        geoOnly: Boolean(s.geoDetected)
      });
    } else {
      el.info.style.display = 'none';
    }
  }

  /** @returns {Promise<boolean>} saved successfully */
  async function savePostal() {
    clearMessage();
    const clean = Postal.validate(el.postal.value);
    if (!clean) {
      showMessage('Use format A1A 1A1 or A1A', 'error');
      el.postal.focus();
      return false;
    }

    const prev = btnLabel.save().textContent;
    btnLabel.save().textContent = 'Saving...';
    el.save.disabled = true;

    try {
      const res = await bg('getTaxRate', { postalCode: clean });
      await persistTax(res, false);
      el.toggle.checked = true;
      fillInfoPanel({ rate: res.rate, type: res.type, location: res.location, postal: clean, geoOnly: false });
      showMessage('Settings saved', 'success');
      btnLabel.save().textContent = '✓ Saved!';
      setTimeout(() => {
        btnLabel.save().textContent = prev;
        updateSaveState();
      }, 1600);
      return true;
    } catch (e) {
      showMessage(e.message || 'Save failed', 'error');
      btnLabel.save().textContent = prev;
      el.save.disabled = false;
      return false;
    }
  }

  async function onToggle() {
    await chrome.storage.sync.set({ enabled: el.toggle.checked });
    showMessage(el.toggle.checked ? 'Tax display on' : 'Tax display off', el.toggle.checked ? 'success' : 'info');
  }
})();
