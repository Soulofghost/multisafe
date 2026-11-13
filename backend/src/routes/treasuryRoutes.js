import express from 'express';
import { treasuryManager } from '../engine/treasuryManager.js';

export const router = express.Router();

// Treasury Info
router.get('/treasury', (req, res) => {
  try {
    const info = treasuryManager.getTreasuryInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deposit Funds
router.post('/treasury/deposit', (req, res) => {
  const { amount_eth } = req.body;
  try {
    const updated = treasuryManager.depositFunds(amount_eth);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List Proposals
router.get('/proposals', (req, res) => {
  try {
    const list = treasuryManager.listProposals();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Propose Transaction
router.post('/proposals', (req, res) => {
  const { to_address, value_eth, data_hex, description, proposer_address } = req.body;
  try {
    const created = treasuryManager.submitProposal({
      toAddress: to_address,
      valueEth: value_eth,
      dataHex: data_hex,
      description,
      proposerAddress: proposer_address
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Confirm Proposal
router.post('/proposals/:id/confirm', (req, res) => {
  const { owner_address } = req.body;
  if (!owner_address) return res.status(400).json({ error: 'owner_address is required.' });

  try {
    const updated = treasuryManager.confirmProposal(parseInt(req.params.id, 10), owner_address);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Revoke Confirmation
router.post('/proposals/:id/revoke', (req, res) => {
  const { owner_address } = req.body;
  if (!owner_address) return res.status(400).json({ error: 'owner_address is required.' });

  try {
    const updated = treasuryManager.revokeConfirmation(parseInt(req.params.id, 10), owner_address);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Execute Proposal
router.post('/proposals/:id/execute', (req, res) => {
  const { caller_address } = req.body;
  if (!caller_address) return res.status(400).json({ error: 'caller_address is required.' });

  try {
    const updated = treasuryManager.executeProposal(parseInt(req.params.id, 10), caller_address);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
