import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { initDb } from './db.js';
import { router as treasuryRouter } from './routes/treasuryRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8011;

// Initialize Database
initDb();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1', treasuryRouter);

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'MultiSafe Treasury Management Engine',
    version: '1.0.0',
    contracts: 'MultiSigTreasury.sol'
  });
});

// Serve Frontend SPA
const frontendPath = join(__dirname, '../../frontend');
if (existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(join(frontendPath, 'index.html'));
  });
}

export const server = app.listen(PORT, () => {
  console.log(`[MultiSafe] Institutional Treasury Server running at http://localhost:${PORT}`);
});

export default app;
