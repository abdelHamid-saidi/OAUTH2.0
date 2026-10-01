const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'db.json');

function emptyDb() {
  return { users: [], articles: [] };
}

function load() {
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      articles: Array.isArray(parsed.articles) ? parsed.articles : [],
    };
  } catch (err) {
    if (err.code === 'ENOENT') return emptyDb();
    throw err;
  }
}

function save(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmpPath = `${dbPath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2));
  fs.renameSync(tmpPath, dbPath);
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture || '',
  };
}

function findUserById(id) {
  const user = load().users.find((item) => item.id === id);
  return user ? toPublicUser(user) : null;
}

function upsertGoogleUser({ googleId, email, name, picture }) {
  const db = load();
  let user = db.users.find((item) => item.googleId === googleId);
  if (!user) {
    user = {
      id: crypto.randomUUID(),
      googleId,
      email,
      name,
      picture,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
  } else {
    user.email = email;
    user.name = name;
    user.picture = picture;
  }
  save(db);
  return toPublicUser(user);
}

function listArticles() {
  return load()
    .articles
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((article) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      createdAt: article.createdAt,
    }));
}

function createArticle(authorEmail, title, content) {
  const db = load();
  const article = {
    id: crypto.randomUUID(),
    title,
    content,
    authorEmail,
    createdAt: new Date().toISOString(),
  };
  db.articles.push(article);
  save(db);
  return {
    id: article.id,
    title: article.title,
    content: article.content,
    createdAt: article.createdAt,
  };
}

module.exports = {
  findUserById,
  upsertGoogleUser,
  listArticles,
  createArticle,
};
