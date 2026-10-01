const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const store = require('./store');

const router = express.Router();
let strategyReady = false;

function clientUrl() {
  return process.env.CLIENT_URL || 'http://localhost:5173';
}

function callbackUrl() {
  return process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5173/api/auth/google/callback';
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (typeof secret === 'string' && secret.length >= 16) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET est obligatoire en production (16 caractères minimum).');
  }

  console.warn('SESSION_SECRET absent : secret de développement utilisé.');
  return 'dev-only-session-secret-change-me';
}

function googleConfigured() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  return typeof id === 'string' && id.length > 0
    && typeof secret === 'string' && secret.length > 0;
}

function assertConfig() {
  sessionSecret();
  if (!googleConfigured()) {
    console.warn('GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET absent : la connexion Google est désactivée.');
  }
}

function sessionOptions() {
  const production = process.env.NODE_ENV === 'production';
  return {
    name: 'oauth.sid',
    secret: sessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    },
  };
}

function setupPassport() {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    const user = store.findUserById(id);
    done(null, user || false);
  });
}

function ensureGoogleStrategy() {
  if (strategyReady || !googleConfigured()) return;

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackUrl(),
    state: true,
  }, (accessToken, refreshToken, profile, done) => {
    const emailInfo = Array.isArray(profile.emails) ? profile.emails[0] : null;
    const email = emailInfo && typeof emailInfo.value === 'string'
      ? emailInfo.value.trim().toLowerCase()
      : '';
    const verified = Boolean(profile._json && profile._json.email_verified === true);
    if (!email || !verified) {
      return done(null, false);
    }

    const photo = Array.isArray(profile.photos) ? profile.photos[0] : null;
    const user = store.upsertGoogleUser({
      googleId: profile.id,
      email,
      name: profile.displayName || email,
      picture: photo && typeof photo.value === 'string' ? photo.value : '',
    });
    return done(null, user);
  }));

  strategyReady = true;
}

function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({ error: 'Non authentifié.' });
}

function cookieClearOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

router.get('/config', (req, res) => {
  res.json({
    google: googleConfigured(),
    callbackUrl: callbackUrl(),
  });
});

router.get('/google', (req, res, next) => {
  if (!googleConfigured()) {
    return res.redirect(`${clientUrl()}/?auth=config`);
  }
  ensureGoogleStrategy();
  return passport.authenticate('google', {
    scope: ['openid', 'profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!googleConfigured()) {
    return res.redirect(`${clientUrl()}/?auth=config`);
  }
  ensureGoogleStrategy();
  return passport.authenticate('google', {
    failureRedirect: `${clientUrl()}/?auth=failed`,
  })(req, res, next);
}, (req, res, next) => {
  const user = req.user;
  req.session.regenerate((err) => {
    if (err) return next(err);
    return req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      return res.redirect(clientUrl());
    });
  });
});

router.post('/logout', (req, res, next) => {
  const finish = () => {
    res.clearCookie('oauth.sid', cookieClearOptions());
    return res.json({ ok: true });
  };

  if (typeof req.logout !== 'function') return finish();

  return req.logout((err) => {
    if (err) return next(err);
    if (!req.session) return finish();
    return req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      return finish();
    });
  });
});

router.get('/me', (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }
  return res.json({
    email: req.user.email,
    name: req.user.name,
    picture: req.user.picture || '',
  });
});

module.exports = {
  router,
  requireAuth,
  assertConfig,
  setupPassport,
  sessionOptions,
};
