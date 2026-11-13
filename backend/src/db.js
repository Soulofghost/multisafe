import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '../data');
mkdirSync(DATA_DIR, { recursive: true });

const dbPath = process.env.MULTISAFE_DB || join(DATA_DIR, 'multisafe.db');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS treasury (
      address TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      network TEXT NOT NULL,
      balance_eth REAL NOT NULL DEFAULT 0.0,
      required_quorum INTEGER NOT NULL DEFAULT 3,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS owners (
      address TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_address TEXT NOT NULL,
      value_eth REAL NOT NULL DEFAULT 0.0,
      data_hex TEXT DEFAULT '0x',
      description TEXT NOT NULL,
      proposer_address TEXT NOT NULL,
      executed INTEGER NOT NULL DEFAULT 0,
      num_confirmations INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      executed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS confirmations (
      proposal_id INTEGER NOT NULL,
      owner_address TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (proposal_id, owner_address),
      FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
      FOREIGN KEY (owner_address) REFERENCES owners(address) ON DELETE CASCADE
    );
  `);

  const count = db.prepare('SELECT count(*) as count FROM treasury').get().count;
  if (count === 0) {
    seedDemoTreasury();
  }
}

function seedDemoTreasury() {
  const treasuryAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

  db.prepare(`
    INSERT INTO treasury (address, name, network, balance_eth, required_quorum)
    VALUES (?, ?, ?, ?, ?)
  `).run(treasuryAddress, 'Apex MultiSafe Institutional Reserve Vault', 'Ethereum Mainnet', 185.5, 3);

  const insertOwner = db.prepare('INSERT INTO owners (address, label) VALUES (?, ?)');
  const o1 = '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b';
  const o2 = '0x8b0d9e2f3a4c5b6a7c8d9e0f1a2b3c4d5e6f7a8b';
  const o3 = '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d';
  const o4 = '0x9c1e0f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e';
  const o5 = '0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97';

  insertOwner.run(o1, 'Alvin MS (Core Architect)');
  insertOwner.run(o2, 'Elena Rostova (Security Lead)');
  insertOwner.run(o3, 'Marcus Chen (Treasury Governor)');
  insertOwner.run(o4, 'Sarah Jenkins (Infrastructure Officer)');
  insertOwner.run(o5, 'Institutional Cold Keycard Vault');

  const insertProp = db.prepare(`
    INSERT INTO proposals (to_address, value_eth, data_hex, description, proposer_address, executed, num_confirmations)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Proposal 1: Audit retainer (2 confirmations)
  insertProp.run('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 15.0, '0x', 'Q4 Smart Contract Formal Verification & Audit Retainer', o1, 0, 2);
  const confirmStmt = db.prepare('INSERT INTO confirmations (proposal_id, owner_address) VALUES (?, ?)');
  confirmStmt.run(1, o1);
  confirmStmt.run(1, o2);

  // Proposal 2: Liquidity Buffer (3 confirmations - Quorum reached!)
  insertProp.run('0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45', 25.0, '0x38ed1739', 'Protocol Liquidity Reserve Provision to Uniswap V3 Pool', o2, 0, 3);
  confirmStmt.run(2, o1);
  confirmStmt.run(2, o2);
  confirmStmt.run(2, o3);

  // Proposal 3: Developer Grants Sub-DAO (1 confirmation)
  insertProp.run('0x28C6c06298d514Db089934071355E5743bf21d60', 8.5, '0x', 'Developer Ecosystem Seed Grant for Autonomous Agent Tooling', o3, 0, 1);
  confirmStmt.run(3, o3);
}
