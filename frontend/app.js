// MultiSafe Institutional Treasury Client
const API_BASE = '/api/v1';

let appState = {
  treasury: null,
  proposals: [],
  currentSignatory: null,
  activeFilter: 'all'
};

document.addEventListener('DOMContentLoaded', () => {
  setupUI();
  loadTreasuryData();
});

function setupUI() {
  const signatorySelect = document.getElementById('signatorySelect');
  signatorySelect.addEventListener('change', (e) => {
    appState.currentSignatory = e.target.value;
    updateSignatoryChips();
    renderProposals();
  });

  // Filter Pills
  const pills = document.querySelectorAll('.pill-btn');
  pills.forEach(btn => {
    btn.addEventListener('click', () => {
      pills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.activeFilter = btn.dataset.filter;
      renderProposals();
    });
  });

  // Modals
  const propModal = document.getElementById('proposeModal');
  document.getElementById('btnOpenProposeModal').addEventListener('click', () => propModal.classList.remove('hidden'));
  document.getElementById('btnClosePropose').addEventListener('click', () => propModal.classList.add('hidden'));
  document.getElementById('btnCancelPropose').addEventListener('click', () => propModal.classList.add('hidden'));
  document.getElementById('proposeForm').addEventListener('submit', handleProposeSubmit);

  const depModal = document.getElementById('depositModal');
  document.getElementById('btnOpenDepositModal').addEventListener('click', () => depModal.classList.remove('hidden'));
  document.getElementById('btnCloseDeposit').addEventListener('click', () => depModal.classList.add('hidden'));
  document.getElementById('btnCancelDeposit').addEventListener('click', () => depModal.classList.add('hidden'));
  document.getElementById('depositForm').addEventListener('submit', handleDepositSubmit);
}

async function loadTreasuryData() {
  try {
    const [tRes, pRes] = await Promise.all([
      fetch(`${API_BASE}/treasury`).then(r => r.json()),
      fetch(`${API_BASE}/proposals`).then(r => r.json())
    ]);

    appState.treasury = tRes;
    appState.proposals = pRes;

    if (!appState.currentSignatory && tRes.owners.length > 0) {
      appState.currentSignatory = tRes.owners[0].address;
    }

    populateSignatorySelect();
    updateDashboardStats();
    updateSignatoryChips();
    renderProposals();
  } catch (err) {
    console.error('Failed to load treasury data:', err);
  }
}

function updateDashboardStats() {
  const t = appState.treasury;
  if (!t) return;

  document.getElementById('vaultBalanceVal').textContent = `${t.balance_eth.toLocaleString()} ETH`;
  document.getElementById('vaultAddressLabel').textContent = t.address;
  document.getElementById('vaultQuorumVal').textContent = `${t.required_quorum} of ${t.totalOwners}`;
  document.getElementById('activeProposalsVal').textContent = t.activeProposals;
  document.getElementById('executedProposalsVal').textContent = t.executedProposals;
}

function populateSignatorySelect() {
  const select = document.getElementById('signatorySelect');
  select.innerHTML = appState.treasury.owners.map(o => `
    <option value="${o.address}" ${o.address === appState.currentSignatory ? 'selected' : ''}>
      ${escapeHtml(o.label)} (${formatAddress(o.address)})
    </option>
  `).join('');
}

function updateSignatoryChips() {
  const container = document.getElementById('signatoryChips');
  container.innerHTML = appState.treasury.owners.map(o => {
    const isCurrent = o.address.toLowerCase() === appState.currentSignatory.toLowerCase();
    return `
      <div class="chip ${isCurrent ? 'active-user' : ''}">
        <span class="dot"></span>
        <span>${escapeHtml(o.label)}</span>
      </div>
    `;
  }).join('');
}

function renderProposals() {
  const grid = document.getElementById('proposalsGrid');
  const quorum = appState.treasury ? appState.treasury.required_quorum : 3;
  const currentOwner = (appState.currentSignatory || '').toLowerCase();

  const filtered = appState.proposals.filter(p => {
    if (appState.activeFilter === 'pending') return !p.executed && !p.isQuorumReached;
    if (appState.activeFilter === 'ready') return !p.executed && p.isQuorumReached;
    if (appState.activeFilter === 'executed') return p.executed;
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color:#64748b;padding:24px;text-align:center;">No proposals found for selected filter.</p>';
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const hasConfirmed = p.confirmations.includes(currentOwner);
    let cardClass = 'prop-card';
    if (p.executed) cardClass += ' executed';
    else if (p.isQuorumReached) cardClass += ' ready-to-exec';

    // Dots
    let dotsHtml = '';
    for (let i = 0; i < appState.treasury.totalOwners; i++) {
      const isConfirmed = i < p.num_confirmations;
      dotsHtml += `<div class="q-dot ${isConfirmed ? 'confirmed' : ''}"></div>`;
    }

    return `
      <div class="${cardClass}">
        <div class="prop-top">
          <div>
            <div class="prop-title">
              <span class="prop-id-tag">#${p.id}</span>
              ${escapeHtml(p.description)}
            </div>
            <div class="prop-meta-row">
              Target: <code>${p.to_address}</code> &middot; Proposer: <code>${formatAddress(p.proposer_address)}</code>
            </div>
          </div>
          <div class="prop-val-box">
            <div class="prop-val">${p.value_eth} ETH</div>
            <span style="font-size:0.75rem;color:#64748b;">${p.executed ? 'Executed' : 'Proposed'}</span>
          </div>
        </div>

        <div class="quorum-track">
          <div class="quorum-dots">
            ${dotsHtml}
          </div>
          <span class="q-label ${p.isQuorumReached ? 'ready' : ''}">
            ${p.executed ? 'TRANSACTION DISPATCHED' : (p.isQuorumReached ? `QUORUM FULFILLED (${p.num_confirmations}/${quorum})` : `AWAITING CONSENSUS (${p.num_confirmations}/${quorum})`)}
          </span>
        </div>

        <div class="prop-footer">
          <div class="signers-list">
            <span>Confirmed By:</span>
            ${p.confirmations.map(c => `<code>${formatAddress(c)}</code>`).join(' ')}
          </div>
          <div class="actions-group">
            ${!p.executed ? `
              ${!hasConfirmed ? `
                <button class="btn btn-primary btn-sm" onclick="confirmProposal(${p.id})">Sign Proposal</button>
              ` : `
                <button class="btn btn-outline btn-sm" onclick="revokeProposal(${p.id})">Revoke Signature</button>
              `}
              ${p.isQuorumReached ? `
                <button class="btn btn-success btn-sm" onclick="executeProposal(${p.id})">Execute On-Chain</button>
              ` : ''}
            ` : `<span style="font-family:var(--font-mono);font-size:0.78rem;color:#10b981;">Executed: ${new Date(p.executed_at).toLocaleString()}</span>`}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.confirmProposal = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/proposals/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_address: appState.currentSignatory })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signing failed');
    loadTreasuryData();
  } catch (err) {
    alert(err.message);
  }
};

window.revokeProposal = async function(id) {
  try {
    const res = await fetch(`${API_BASE}/proposals/${id}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_address: appState.currentSignatory })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Revocation failed');
    loadTreasuryData();
  } catch (err) {
    alert(err.message);
  }
};

window.executeProposal = async function(id) {
  if (confirm(`Authorize low-level low-latency execution of proposal #${id}? Funds will be disbursed from the multi-sig vault.`)) {
    try {
      const res = await fetch(`${API_BASE}/proposals/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caller_address: appState.currentSignatory })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed');
      loadTreasuryData();
    } catch (err) {
      alert(err.message);
    }
  }
};

async function handleProposeSubmit(e) {
  e.preventDefault();
  const description = document.getElementById('propDescription').value.trim();
  const toAddress = document.getElementById('propTo').value.trim();
  const valueEth = parseFloat(document.getElementById('propValue').value);
  const dataHex = document.getElementById('propData').value.trim();

  try {
    const res = await fetch(`${API_BASE}/proposals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        to_address: toAddress,
        value_eth: valueEth,
        data_hex: dataHex,
        proposer_address: appState.currentSignatory
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit proposal');

    document.getElementById('proposeForm').reset();
    document.getElementById('proposeModal').classList.add('hidden');
    loadTreasuryData();
  } catch (err) {
    alert(err.message);
  }
}

async function handleDepositSubmit(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('depAmount').value);

  try {
    const res = await fetch(`${API_BASE}/treasury/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_eth: amount })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Deposit failed');

    document.getElementById('depositForm').reset();
    document.getElementById('depositModal').classList.add('hidden');
    loadTreasuryData();
  } catch (err) {
    alert(err.message);
  }
}

function formatAddress(addr) {
  if (!addr) return '0x0';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}
