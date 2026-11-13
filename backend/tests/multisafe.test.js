import test, { describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { db, initDb } from '../src/db.js';
import { treasuryManager } from '../src/engine/treasuryManager.js';

describe('MultiSafe Institutional Treasury Engine Tests', () => {
  before(() => {
    initDb();
  });

  const o1 = '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b';
  const o2 = '0x8b0d9e2f3a4c5b6a7c8d9e0f1a2b3c4d5e6f7a8b';
  const o3 = '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d';
  const nonOwner = '0x9999999999999999999999999999999999999999';

  test('Database seeds initial treasury configuration with 3-of-5 quorum', () => {
    const t = treasuryManager.getTreasuryInfo();
    assert.ok(t);
    assert.equal(t.required_quorum, 3);
    assert.equal(t.totalOwners, 5);
    assert.ok(t.balance_eth > 0);
  });

  test('submitProposal rejects non-owner callers and initializes quorum tracking', () => {
    assert.throws(() => {
      treasuryManager.submitProposal({
        toAddress: '0x0000000000000000000000000000000000000001',
        valueEth: 5.0,
        description: 'Unauthorized Proposal',
        proposerAddress: nonOwner
      });
    }, /not an authorized treasury signatory/);

    const prop = treasuryManager.submitProposal({
      toAddress: '0x0000000000000000000000000000000000000001',
      valueEth: 10.0,
      description: 'Core Protocol Infrastructure Upgrade',
      proposerAddress: o1
    });

    assert.ok(prop.id > 0);
    assert.equal(prop.executed, false);
    assert.equal(prop.num_confirmations, 1);
    assert.equal(prop.isQuorumReached, false);
    assert.ok(prop.confirmations.includes(o1.toLowerCase()));
  });

  test('confirmProposal prevents duplicate signatures and updates consensus', () => {
    // Propose fresh transaction
    const prop = treasuryManager.submitProposal({
      toAddress: '0x0000000000000000000000000000000000000002',
      valueEth: 4.0,
      description: 'DAO Tooling Grant',
      proposerAddress: o1
    });

    // Proposer trying to confirm twice
    assert.throws(() => {
      treasuryManager.confirmProposal(prop.id, o1);
    }, /already confirmed/);

    // Second owner confirms
    const c2 = treasuryManager.confirmProposal(prop.id, o2);
    assert.equal(c2.num_confirmations, 2);
    assert.equal(c2.isQuorumReached, false);

    // Third owner confirms -> Quorum reached!
    const c3 = treasuryManager.confirmProposal(prop.id, o3);
    assert.equal(c3.num_confirmations, 3);
    assert.equal(c3.isQuorumReached, true);
  });

  test('executeProposal enforces quorum check and prevents double-execution', () => {
    // Propose transaction with 1 confirmation
    const prop = treasuryManager.submitProposal({
      toAddress: '0x0000000000000000000000000000000000000003',
      valueEth: 2.0,
      description: 'Unconfirmed Proposal',
      proposerAddress: o1
    });

    // Attempt early execution (1 of 3 confirmations)
    assert.throws(() => {
      treasuryManager.executeProposal(prop.id, o1);
    }, /Insufficient quorum/);

    // Reach 3-of-3 confirmations
    treasuryManager.confirmProposal(prop.id, o2);
    treasuryManager.confirmProposal(prop.id, o3);

    const initialBalance = treasuryManager.getTreasuryInfo().balance_eth;

    // Execute successfully
    const executed = treasuryManager.executeProposal(prop.id, o1);
    assert.equal(executed.executed, true);

    // Balance deducted
    const newBalance = treasuryManager.getTreasuryInfo().balance_eth;
    assert.equal(newBalance, initialBalance - 2.0);

    // Replay execution attempt must fail
    assert.throws(() => {
      treasuryManager.executeProposal(prop.id, o2);
    }, /already executed/);
  });

  test('revokeConfirmation decrements confirmation count', () => {
    const prop = treasuryManager.submitProposal({
      toAddress: '0x0000000000000000000000000000000000000004',
      valueEth: 1.0,
      description: 'Revocation Test',
      proposerAddress: o1
    });

    treasuryManager.confirmProposal(prop.id, o2);
    assert.equal(treasuryManager.getProposal(prop.id).num_confirmations, 2);

    // o2 revokes their vote
    const revoked = treasuryManager.revokeConfirmation(prop.id, o2);
    assert.equal(revoked.num_confirmations, 1);
    assert.equal(revoked.confirmations.includes(o2.toLowerCase()), false);
  });
});
