import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { processCliGraphGeneration } from './api/generate.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // AI Generation endpoint
  app.post('/api/generate', async (req: Request, res: Response) => {
    try {
      const { prompt, attachments } = req.body;
      if (!prompt && (!attachments || attachments.length === 0)) {
        res.status(400).json({ success: false, error: 'Prompt or attachment is required.' });
        return;
      }

      const result = await processCliGraphGeneration({ prompt: prompt || '', attachments });
      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      console.error('API /api/generate error:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Internal server error while generating design.',
      });
    }
  });

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CliGraph Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
