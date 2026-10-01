const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { router: authRouter, assertConfig, setupPassport, sessionOptions } = require('./auth');
const articlesRouter = require('./articles');

const PORT = Number(process.env.PORT) || 4000;

function createApp() {
  const app = express();
  const origin = process.env.CLIENT_URL || 'http://localhost:5173';

  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin,
    credentials: true,
  }));
  app.use(express.json({ limit: '32kb' }));

  setupPassport();
  app.use(session(sessionOptions()));
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/articles', articlesRouter);

  app.use((err, req, res, next) => {
    console.error(err.message);
    if (res.headersSent) return next(err);
    return res.status(500).json({ error: 'Erreur interne.' });
  });

  return app;
}

function main() {
  assertConfig();
  const app = createApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OAuth Google écoute sur http://localhost:${PORT}`);
  });
}

main();
