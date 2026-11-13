import { db } from '../db.js';

export class TreasuryManager {
  getTreasuryInfo() {
    const t = db.prepare('SELECT * FROM treasury LIMIT 1').get();
    const owners = db.prepare('SELECT * FROM owners ORDER BY added_at ASC').all();
    const activeProposals = db.prepare('SELECT count(*) as count FROM proposals WHERE executed = 0').get().count;
    const executedProposals = db.prepare('SELECT count(*) as count FROM proposals WHERE executed = 1').get().count;

    return {
      ...t,
      totalOwners: owners.length,
      owners,
      activeProposals,
      executedProposals
    };
  }

  isOwner(address) {
    if (!address) return false;
    const match = db.prepare('SELECT address FROM owners WHERE LOWER(address) = ?').get(address.toLowerCase());
    return Boolean(match);
  }

  depositFunds(amountEth) {
    const num = Number(amountEth);
    if (isNaN(num) || num <= 0) throw new Error('Deposit amount must be positive.');

    db.prepare('UPDATE treasury SET balance_eth = balance_eth + ?').run(num);
    return this.getTreasuryInfo();
  }

  listProposals() {
    const proposals = db.prepare('SELECT * FROM proposals ORDER BY id DESC').all();
    const t = db.prepare('SELECT required_quorum FROM treasury LIMIT 1').get();
    const quorum = t ? t.required_quorum : 3;

    return proposals.map(p => {
      const confirms = db.prepare('SELECT owner_address, timestamp FROM confirmations WHERE proposal_id = ?').all(p.id);
      return {
        ...p,
        executed: Boolean(p.executed),
        requiredQuorum: quorum,
        isQuorumReached: p.num_confirmations >= quorum,
        confirmations: confirms.map(c => c.owner_address.toLowerCase())
      };
    });
  }

  submitProposal({ toAddress, valueEth, dataHex = '0x', description, proposerAddress }) {
    if (!toAddress || !description || !proposerAddress) {
      throw new Error('toAddress, description, and proposerAddress are required.');
    }
    if (!this.isOwner(proposerAddress)) {
      throw new Error(`Caller "${proposerAddress}" is not an authorized treasury signatory.`);
    }

    const value = Number(valueEth || 0);
    if (value < 0) throw new Error('Proposal value cannot be negative.');

    const insertStmt = db.prepare(`
      INSERT INTO proposals (to_address, value_eth, data_hex, description, proposer_address, executed, num_confirmations)
      VALUES (?, ?, ?, ?, ?, 0, 1)
    `);

    const result = insertStmt.run(
      toAddress.toLowerCase(),
      value,
      dataHex || '0x',
      description.trim(),
      proposerAddress.toLowerCase()
    );

    const proposalId = Number(result.lastInsertRowid);

    // Proposer auto-confirms
    db.prepare('INSERT INTO confirmations (proposal_id, owner_address) VALUES (?, ?)').run(
      proposalId,
      proposerAddress.toLowerCase()
    );

    return this.getProposal(proposalId);
  }

  getProposal(proposalId) {
    const p = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposalId);
    if (!p) return null;

    const t = db.prepare('SELECT required_quorum FROM treasury LIMIT 1').get();
    const quorum = t ? t.required_quorum : 3;
    const confirms = db.prepare('SELECT owner_address, timestamp FROM confirmations WHERE proposal_id = ?').all(p.id);

    return {
      ...p,
      executed: Boolean(p.executed),
      requiredQuorum: quorum,
      isQuorumReached: p.num_confirmations >= quorum,
      confirmations: confirms.map(c => c.owner_address.toLowerCase())
    };
  }

  confirmProposal(proposalId, ownerAddress) {
    if (!this.isOwner(ownerAddress)) {
      throw new Error(`Address "${ownerAddress}" is not an authorized signatory.`);
    }

    const p = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposalId);
    if (!p) throw new Error('Proposal not found.');
    if (p.executed) throw new Error('Cannot confirm already executed proposal.');

    const existing = db.prepare('SELECT owner_address FROM confirmations WHERE proposal_id = ? AND LOWER(owner_address) = ?').get(proposalId, ownerAddress.toLowerCase());
    if (existing) {
      throw new Error('Signatory has already confirmed this proposal.');
    }

    db.prepare('INSERT INTO confirmations (proposal_id, owner_address) VALUES (?, ?)').run(proposalId, ownerAddress.toLowerCase());
    db.prepare('UPDATE proposals SET num_confirmations = num_confirmations + 1 WHERE id = ?').run(proposalId);

    return this.getProposal(proposalId);
  }

  revokeConfirmation(proposalId, ownerAddress) {
    if (!this.isOwner(ownerAddress)) {
      throw new Error(`Address "${ownerAddress}" is not an authorized signatory.`);
    }

    const p = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposalId);
    if (!p) throw new Error('Proposal not found.');
    if (p.executed) throw new Error('Cannot revoke confirmation on already executed proposal.');

    const existing = db.prepare('SELECT owner_address FROM confirmations WHERE proposal_id = ? AND LOWER(owner_address) = ?').get(proposalId, ownerAddress.toLowerCase());
    if (!existing) {
      throw new Error('Signatory has not confirmed this proposal.');
    }

    db.prepare('DELETE FROM confirmations WHERE proposal_id = ? AND LOWER(owner_address) = ?').run(proposalId, ownerAddress.toLowerCase());
    db.prepare('UPDATE proposals SET num_confirmations = num_confirmations - 1 WHERE id = ?').run(proposalId);

    return this.getProposal(proposalId);
  }

  executeProposal(proposalId, callerAddress) {
    if (!this.isOwner(callerAddress)) {
      throw new Error(`Caller "${callerAddress}" is not an authorized signatory.`);
    }

    const p = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposalId);
    if (!p) throw new Error('Proposal not found.');
    if (p.executed) throw new Error('Proposal already executed.');

    const t = db.prepare('SELECT balance_eth, required_quorum FROM treasury LIMIT 1').get();
    if (p.num_confirmations < t.required_quorum) {
      throw new Error(`Insufficient quorum: proposal has ${p.num_confirmations}/${t.required_quorum} required signatures.`);
    }
    if (t.balance_eth < p.value_eth) {
      throw new Error(`Insufficient treasury reserves: balance is ${t.balance_eth} ETH, requested ${p.value_eth} ETH.`);
    }

    // Execute transaction
    db.prepare('UPDATE treasury SET balance_eth = balance_eth - ?').run(p.value_eth);
    db.prepare("UPDATE proposals SET executed = 1, executed_at = CURRENT_TIMESTAMP WHERE id = ?").run(proposalId);

    return this.getProposal(proposalId);
  }
}

export const treasuryManager = new TreasuryManager();
