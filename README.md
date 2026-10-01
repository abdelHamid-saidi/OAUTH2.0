# OAuth 2.0 — Google avec Passport.js

Connexion Google, puis publication d’articles. Client React, API Express.

## Configuration

1. Créez un client OAuth **Application Web** dans la [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Autorisez ces URI de redirection :
   - local : `http://localhost:5173/api/auth/google/callback`
   - Docker : `http://localhost:4000/api/auth/google/callback`
3. Copiez `.env.example` vers `.env` et remplissez `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `SESSION_SECRET`.

## Lancer

En local, dans deux terminaux :

```powershell
npm install --prefix server
npm install --prefix client
npm run dev --prefix server
npm run dev --prefix client
```

Ouvrez http://localhost:5173

Avec Docker :

```powershell
docker compose up --build
```

Ouvrez http://localhost:8080

Après un changement du fichier `.env` : `docker compose up -d --force-recreate`
