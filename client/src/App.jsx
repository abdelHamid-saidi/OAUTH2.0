import { useEffect, useState } from 'react';
import { api, apiUrl } from './api';

function formatDate(iso) {
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function ErrorText({ message }) {
  if (!message) return null;
  return <p className="error">{message}</p>;
}

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

function LoginView({ error, configured, callbackUrl }) {
  return (
    <main className="screen">
      <article className="card">
        <p className="kicker">Fil rouge authentification</p>
        <h1>OAuth 2.0</h1>
        <p className="subtitle">Connexion Google avec Passport.js</p>
        <h2>Connexion</h2>
        <p className="hint">
          Google authentifie le compte, puis l'application reçoit un code qu'elle échange contre un jeton d'accès et le profil OpenID Connect.
        </p>
        <ErrorText message={error} />
        {!configured && (
          <p className="notice">
            Renseignez <code>GOOGLE_CLIENT_ID</code> et <code>GOOGLE_CLIENT_SECRET</code> dans le fichier <code>.env</code>.
            URI de redirection à autoriser : <code>{callbackUrl}</code>
          </p>
        )}
        <button
          className="google"
          type="button"
          disabled={!configured}
          onClick={() => {
            window.location.href = apiUrl('/api/auth/google');
          }}
        >
          <GoogleMark />
          Se connecter avec Google
        </button>
      </article>
    </main>
  );
}

function Articles({ articles }) {
  if (!articles.length) {
    return <p className="empty">Aucun article pour le moment.</p>;
  }

  return articles.map((article) => (
    <article className="article" key={article.id}>
      <h3>{article.title}</h3>
      <p>{article.content}</p>
      <time dateTime={article.createdAt}>{formatDate(article.createdAt)}</time>
    </article>
  ));
}

function AppView({ user, articles, error, pending, onLogout, onPublish }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  return (
    <main className="screen">
      <section className="shell">
        <header className="app-header">
          <div>
            <p className="kicker">Fil rouge authentification</p>
            <h1>OAuth 2.0</h1>
            <p className="subtitle">Connecté avec Google</p>
          </div>
          <button className="ghost" type="button" onClick={onLogout} disabled={pending}>
            Se déconnecter
          </button>
        </header>

        <section className="panel">
          <div className="profile">
            {user.picture ? (
              <img className="avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="avatar avatar-fallback" aria-hidden="true">
                {(user.name || user.email || '?').slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <p className="welcome">
                Bienvenue, <strong>{user.name || user.email}</strong>
              </p>
              <p className="email">{user.email}</p>
            </div>
          </div>
          <p className="hint">
            La session Passport est portée par un cookie HttpOnly. La publication d'un article exige cette session.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onPublish(title, content, () => {
                setTitle('');
                setContent('');
              });
            }}
          >
            <input
              name="title"
              type="text"
              placeholder="Titre"
              aria-label="Titre"
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
            <textarea
              name="content"
              placeholder="Contenu"
              aria-label="Contenu"
              maxLength={5000}
              rows={3}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
            />
            <ErrorText message={error} />
            <button type="submit" disabled={pending}>Publier</button>
          </form>
        </section>

        <section className="articles">
          <h2>Articles</h2>
          <div id="articles">
            <Articles articles={articles} />
          </div>
        </section>
      </section>
    </main>
  );
}

function authMessage(code) {
  if (code === 'config') {
    return 'La connexion Google n\'est pas configurée.';
  }
  if (code === 'failed') {
    return 'La connexion Google a échoué, ou l\'adresse email n\'est pas vérifiée.';
  }
  return '';
}

export default function App() {
  const [view, setView] = useState('loading');
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loginError, setLoginError] = useState('');
  const [postError, setPostError] = useState('');
  const [pending, setPending] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = authMessage(params.get('auth'));
    if (message) {
      setLoginError(message);
      window.history.replaceState({}, '', window.location.pathname);
    }

    let cancelled = false;

    (async () => {
      try {
        const config = await api('/api/auth/config');
        if (cancelled) return;
        setConfigured(Boolean(config.google));
        setCallbackUrl(config.callbackUrl || '');
      } catch (err) {
        if (!cancelled) setLoginError(err.message);
      }

      try {
        const me = await api('/api/auth/me');
        if (cancelled) return;
        const data = await api('/api/articles');
        if (cancelled) return;
        setUser(me);
        setArticles(data.articles);
        setView('app');
      } catch (err) {
        if (cancelled) return;
        if (err.status !== 401) setLoginError(err.message);
        setView('login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    setPending(true);
    try {
      await api('/api/auth/logout', { method: 'POST', body: '{}' });
      setUser(null);
      setArticles([]);
      setPostError('');
      setLoginError('');
      setView('login');
    } catch (err) {
      setPostError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function publish(title, content, reset) {
    setPostError('');
    setPending(true);
    try {
      await api('/api/articles', {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      const data = await api('/api/articles');
      setArticles(data.articles);
      reset();
    } catch (err) {
      setPostError(err.message);
      if (err.status === 401) {
        setLoginError('Votre session a expiré.');
        setView('login');
      }
    } finally {
      setPending(false);
    }
  }

  if (view === 'loading') {
    return (
      <main className="screen">
        <p className="subtitle">Chargement…</p>
      </main>
    );
  }

  if (view === 'app' && user) {
    return (
      <AppView
        user={user}
        articles={articles}
        error={postError}
        pending={pending}
        onLogout={logout}
        onPublish={publish}
      />
    );
  }

  return (
    <LoginView
      error={loginError}
      configured={configured}
      callbackUrl={callbackUrl}
    />
  );
}
