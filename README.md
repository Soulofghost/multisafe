# MultiSafe | Institutional Multisignature Treasury & M-of-N Quorum Execution Engine

[![CI Pipeline](https://github.com/Soulofghost/multisafe/actions/workflows/ci.yml/badge.svg)](https://github.com/Soulofghost/multisafe/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solidity 0.8.20](https://img.shields.io/badge/Solidity-0.8.20-blueviolet.svg)](https://soliditylang.org/)
[![Node.js v22+](https://img.shields.io/badge/Node.js-v22%2B-brightgreen.svg)](https://nodejs.org/)
[![Ethers.js v6](https://img.shields.io/badge/Ethers.js-v6.13-blue.svg)](https://docs.ethers.org/)
[![SQLite WAL](https://img.shields.io/badge/SQLite-WAL%20Engine-orange.svg)](https://www.sqlite.org/)

---

## 1. Project Introduction

**MultiSafe** is an institutional multisignature treasury management platform and smart contract execution engine (`MultiSigTreasury.sol`) designed for Web3 startups, decentralized autonomous organizations (DAOs), and digital asset hedge funds. Operating on an M-of-N threshold consensus model, MultiSafe eliminates single-point-of-failure key risks by requiring cryptographic consensus from multiple authorized keycards before any on-chain transaction or asset disbursement can be executed.

---

## 2. Problem Statement

Decentralized organizations manage millions of dollars in capital, yet face severe custodial vulnerabilities:
- **Single-Key Exposure:** Compromise of a single founder or developer private key can result in catastrophic loss of treasury reserves.
- **Rogue Insider Threats:** Unilateral transfer capability creates opportunities for unauthorized capital draining.
- **Opaque Governance Workflows:** Off-chain coordination over Slack or Telegram creates confusion regarding who has signed, who is pending, and whether proposals have attained threshold consensus.

---

## 3. Proposed Solution

MultiSafe enforces cryptographic multi-party authorization:
- **Configurable M-of-N Thresholds:** Programmable quorum requirements (e.g. 3-of-5 signatures) enforced immutably at the bytecode level.
- **Zero-Trust On-Chain Execution:** Low-level contract execution occurs only when cryptographic confirmations meet or exceed the active quorum invariant.
- **Double-Spend & Replay Protection:** Transaction states are strictly mapped with execution flags and mutex locks preventing repeated calls.

---

## 4. Key Features

- **Granular Signatory Management:** Authorize hardware keycards, founding architects, and security officers with transparent address labeling.
- **Dynamic Quorum Progress Tracker:** Real-time visual consensus bar displaying signed vs pending co-signers.
- **Proposal Lifecycle Governance:** Propose, confirm, revoke confirmation, and execute arbitrary calls or native ETH transfers.
- **Reserve Capitalization Tracker:** Real-time visibility into treasury balances, reserve allocations, and historical disbursements.
- **Arbitrary EVM Calldata Dispatch:** Execute external smart contract calls (e.g. Uniswap liquidity provision, token staking, contract upgrades).

---

## 5. Architecture Diagram

```mermaid
flowchart TD
    SignatoryA["Signatory A (Core Architect)"]
    SignatoryB["Signatory B (Security Lead)"]
    SignatoryC["Signatory C (Treasury Governor)"]
    Contract["MultiSigTreasury.sol (Vault Contract)"]
    API["Express REST API (/api/v1)"]
    Ledger[("SQLite WAL Ledger (multisafe.db)")]

    SignatoryA -->|1. Submit Proposal (1/3 Confirmations)| Contract
    SignatoryB -->|2. Confirm Proposal (2/3 Confirmations)| Contract
    SignatoryC -->|3. Confirm Proposal (3/3 Quorum Reached!)| Contract
    SignatoryA -->|4. Execute On-Chain Call & Disburse Funds| Contract

    Contract -->|Emit Consensus Events| API
    API -->|Synchronize Status & Quorum Logs| Ledger
```

---

## 6. Technology Stack

- **Smart Contract Language:** Solidity 0.8.20
- **Contract Security:** ReentrancyGuard, Mutex Lock, Pull-over-Push
- **Backend Runtime:** Node.js v22+
- **Web Framework:** Express.js 4.19
- **Web3 Integration:** Ethers.js v6.13
- **Database Engine:** `node:sqlite` (SQLite 3 WAL)
- **Frontend Architecture:** Vanilla ES6 SPA, HTML5, Plus Jakarta Sans & JetBrains Mono typography
- **DevOps:** Docker, Docker Compose, GitHub Actions CI
- **Automated Testing:** Node native test runner (`node:test`, `node:assert/strict`)

---

## 7. Folder Structure

```
multisafe/
├── .github/
│   └── workflows/
│       └── ci.yml
├── contracts/
│   └── MultiSigTreasury.sol
├── backend/
│   ├── src/
│   │   ├── engine/
│   │   │   └── treasuryManager.js
│   │   ├── routes/
│   │   │   └── treasuryRoutes.js
│   │   ├── db.js
│   │   └── server.js
│   ├── tests/
│   │   └── multisafe.test.js
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── LICENSE
└── README.md
```

---

## 8. Installation Instructions

### Prerequisites
- Node.js 22.x or later
- npm or yarn

### Setup Steps
```bash
git clone https://github.com/Soulofghost/multisafe.git
cd multisafe/backend
npm install
npm start
```

Access the treasury interface at `http://localhost:8011`.

---

## 9. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8011` | HTTP server port |
| `MULTISAFE_DB` | `./backend/data/multisafe.db` | SQLite database file location |
| `NODE_ENV` | `development` | Runtime environment flag |

---

## 10. Database Setup

Database schema, institutional treasury reserves, and pre-authorized keycard signatories are seeded automatically on first launch via `initDb()`:
```javascript
import { initDb } from './src/db.js';
initDb();
```

---

## 11. API Documentation

### Primary Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health status check |
| `GET` | `/api/v1/treasury` | Treasury reserves, quorum rules & authorized owners |
| `POST` | `/api/v1/treasury/deposit` | Fund treasury reserve balance |
| `GET` | `/api/v1/proposals` | List all active and executed dispatch proposals |
| `POST` | `/api/v1/proposals` | Submit a new multi-sig dispatch proposal |
| `POST` | `/api/v1/proposals/:id/confirm` | Cryptographically confirm proposal with active keycard |
| `POST` | `/api/v1/proposals/:id/revoke` | Revoke a previously submitted signature |
| `POST` | `/api/v1/proposals/:id/execute` | Dispatch funds on-chain upon quorum fulfillment |

---

## 12. Application Interface Overview

MultiSafe features a high-security dark institutional vault layout:
- **Active Keycard Switcher:** Switch between authorized signatory profiles (Core Architect, Security Lead, Treasury Governor, etc.) to simulate realistic multi-signer consensus.
- **Executive Metric Banner:** Real-time visibility into treasury reserves (ETH) and quorum ratios.
- **Proposals Governance Board:** Filterable view of proposals categorized by status (Pending, Ready to Execute, Executed).
- **Quorum Track Dots:** Visual signature dots highlighting which co-signers have signed.

---

## 13. Testing Instructions

Execute the automated test suite using the Node.js test runner:

```bash
cd backend
npm test
```

Expected output:
```
▶ MultiSafe Institutional Treasury Engine Tests
  ✔ Database seeds initial treasury configuration with 3-of-5 quorum
  ✔ submitProposal rejects non-owner callers and initializes quorum tracking
  ✔ confirmProposal prevents duplicate signatures and updates consensus
  ✔ executeProposal enforces quorum check and prevents double-execution
  ✔ revokeConfirmation decrements confirmation count
✔ MultiSafe Institutional Treasury Engine Tests (42ms)
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

---

## 14. Security Considerations

- **Strict Signatory Authorization:** All proposal submissions, confirmations, and executions verify caller addresses against the authorized owner registry.
- **Quorum Enforcement:** Proposals cannot disburse capital without satisfying the invariant `num_confirmations >= required_quorum`.
- **Atomic State Mutations:** Balances and execution flags update synchronously within SQLite transactions.

---

## 15. Deployment Instructions

### Docker Deployment
```bash
docker compose up -d --build
```
Access the application at `http://localhost:8011`.

---

## 16. Known Limitations

- Embedded local simulation engine provides full multi-signer consensus testing; connecting to live Ethereum Mainnet or Layer 2 rollups requires configuring EIP-712 typed data signing and an RPC endpoint.

---

## 17. Future Roadmap

- [ ] EIP-712 typed structured data off-chain signature aggregation.
- [ ] Timelock delay module for high-value transactions exceeding 50 ETH.
- [ ] Spending limit allowances for routine operational micro-expenses.
- [ ] Safe Apps SDK compatibility.

---

## 18. License

SPDX-License-Identifier: MIT
Copyright (c) 2026 Alvin MS (@Soulofghost). All rights reserved.
