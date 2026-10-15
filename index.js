const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// CONFIGURATION SWAGGER / OPENAPI
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Blog',
      version: '1.0.0',
      description: 'API REST branchée sur la base de données du blog Laravel (auth-app).',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur local de développement',
      },
    ],
  },
  // Spécifie à Swagger de lire ce fichier-ci pour trouver les commentaires @swagger
  apis: [__filename],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// On attache l'interface graphique Swagger à la route /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==========================================
// CONNEXION À LA BDD DE LARAVEL
// ==========================================
// Le chemin peut être changé avec la variable d'environnement DB_PATH (utile pour Docker)
const cheminBddLaravel = process.env.DB_PATH || '/Users/leo/Herd/auth-app/database/database.sqlite';

const db = new sqlite3.Database(cheminBddLaravel, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error("Erreur BDD :", err.message);
    } else {
        console.log(`✅ Connecté à la base de données Laravel (${cheminBddLaravel}) !`);
    }
});

// Comme Laravel, on fait respecter les clés étrangères (suppressions en cascade, etc.)
db.run("PRAGMA foreign_keys = ON");

// Date au format Laravel (YYYY-MM-DD HH:MM:SS)
const maintenant = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

// ==========================================
// ROUTES ARTICLES
// ==========================================

/**
 * @swagger
 * /api/articles:
 *   get:
 *     summary: Lister les articles
 *     description: Retourne tous les articles, du plus récent au plus ancien.
 *     tags: [Articles]
 *     responses:
 *       200:
 *         description: Liste des articles.
 *       500:
 *         description: Erreur serveur.
 */
app.get('/api/articles', (req, res) => {
    db.all("SELECT * FROM articles ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ erreur: err.message });
        res.status(200).json(rows);
    });
});

/**
 * @swagger
 * /api/articles/{id}:
 *   get:
 *     summary: Récupérer un article
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: L'article demandé.
 *       404:
 *         description: Article introuvable.
 *       500:
 *         description: Erreur serveur.
 */
app.get('/api/articles/:id', (req, res) => {
    db.get("SELECT * FROM articles WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ erreur: err.message });
        if (!row) return res.status(404).json({ erreur: "Article introuvable." });
        res.status(200).json(row);
    });
});

/**
 * @swagger
 * /api/articles:
 *   post:
 *     summary: Créer un article
 *     tags: [Articles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Mon premier article
 *               content:
 *                 type: string
 *                 example: Le contenu de l'article.
 *               image:
 *                 type: string
 *                 description: Chemin d'une image déjà présente dans storage/app/public (ex. articles/photo.jpg).
 *     responses:
 *       201:
 *         description: Article créé.
 *       400:
 *         description: Champs manquants.
 *       500:
 *         description: Erreur serveur.
 */
app.post('/api/articles', (req, res) => {
    const { title, content, image } = req.body;

    if (!title || !content) {
        return res.status(400).json({ erreur: "Les champs 'title' et 'content' sont requis." });
    }

    const now = maintenant();

    db.run(
        "INSERT INTO articles (title, content, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [title, content, image || null, now, now],
        function(err) {
            if (err) return res.status(500).json({ erreur: err.message });
            res.status(201).json({
                id: this.lastID,
                title,
                content,
                image: image || null,
                created_at: now,
                updated_at: now
            });
        }
    );
});

// ==========================================
// ROUTES COMMENTAIRES
// ==========================================

/**
 * @swagger
 * /api/articles/{id}/comments:
 *   get:
 *     summary: Lister les commentaires d'un article
 *     description: Chaque commentaire inclut le nom de son auteur (user_name).
 *     tags: [Commentaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Liste des commentaires.
 *       500:
 *         description: Erreur serveur.
 */
app.get('/api/articles/:id/comments', (req, res) => {
    db.all(
        `SELECT comments.*, users.name AS user_name
         FROM comments
         JOIN users ON users.id = comments.user_id
         WHERE comments.article_id = ?
         ORDER BY comments.created_at`,
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ erreur: err.message });
            res.status(200).json(rows);
        }
    );
});

/**
 * @swagger
 * /api/articles/{id}/comments:
 *   post:
 *     summary: Ajouter un commentaire à un article
 *     description: L'auteur est un utilisateur Laravel existant, identifié par son id.
 *     tags: [Commentaires]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, content]
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               content:
 *                 type: string
 *                 example: Super article !
 *     responses:
 *       201:
 *         description: Commentaire créé.
 *       400:
 *         description: Champs manquants ou utilisateur inexistant.
 *       404:
 *         description: Article introuvable.
 *       500:
 *         description: Erreur serveur.
 */
app.post('/api/articles/:id/comments', (req, res) => {
    const article_id = Number(req.params.id);
    const { user_id, content } = req.body;

    if (!user_id || !content) {
        return res.status(400).json({ erreur: "Les champs 'user_id' et 'content' sont requis." });
    }

    db.get("SELECT id FROM articles WHERE id = ?", [article_id], (err, article) => {
        if (err) return res.status(500).json({ erreur: err.message });
        if (!article) return res.status(404).json({ erreur: "Article introuvable." });

        db.get("SELECT id FROM users WHERE id = ?", [user_id], (err, user) => {
            if (err) return res.status(500).json({ erreur: err.message });
            if (!user) return res.status(400).json({ erreur: "Utilisateur introuvable." });

            const now = maintenant();

            db.run(
                "INSERT INTO comments (article_id, user_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                [article_id, user_id, content, now, now],
                function(err) {
                    if (err) return res.status(500).json({ erreur: err.message });
                    res.status(201).json({
                        id: this.lastID,
                        article_id,
                        user_id,
                        content,
                        created_at: now,
                        updated_at: now
                    });
                }
            );
        });
    });
});

// ==========================================
// LANCEMENT
// ==========================================
app.listen(port, () => {
    console.log(`✅ API Blog démarrée sur http://localhost:${port}`);
    console.log(`📖 Documentation Swagger sur http://localhost:${port}/api-docs`);
});
