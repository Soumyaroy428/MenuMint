import dotenv from 'dotenv';
import { app } from './app.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[MenuMint Server] running on http://localhost:${PORT}`);
  console.log(`[Health check] available at http://localhost:${PORT}/api/health`);
  console.log(`[MenuMint Public Menu] available at http://localhost:${PORT}/api/cafes/daily-grind/menu`);
  console.log(`[YouPI-PG V2 Gateway] Webhook endpoint mounted at http://localhost:${PORT}/api/payment/webhook`);
});

