const express = require('express');
const store = require('./store');
const { requireAuth } = require('./auth');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ articles: store.listArticles() });
});

router.post('/', requireAuth, (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  if (!title || title.length > 120 || !content || content.length > 5000) {
    return res.status(400).json({ error: 'Le titre et le contenu sont requis.' });
  }

  const article = store.createArticle(req.user.email, title, content);
  return res.status(201).json({ article });
});

module.exports = router;
