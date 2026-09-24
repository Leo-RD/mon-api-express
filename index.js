const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

app.use(express.json());

// 1. Connexion à la BDD de Laravel
const cheminBddLaravel = '/Users/leo/Herd/auth-app/database/database.sqlite';

const db = new sqlite3.Database(cheminBddLaravel, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error("Erreur BDD :", err.message);
    } else {
        console.log("✅ Connecté à la base de données Laravel !");
    }
});

// ==========================================
// ROUTES ARTICLES (Adaptées à la BDD Laravel)
// ==========================================

// Récupérer tous les articles (Triés du plus récent au plus ancien)
app.get('/api/articles', (req, res) => {
    db.all("SELECT * FROM articles ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ erreur: err.message });
        res.status(200).json(rows);
    });
});

// Récupérer un article spécifique
app.get('/api/articles/:id', (req, res) => {
    db.get("SELECT * FROM articles WHERE id = ?", [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ erreur: err.message });
        if (!row) return res.status(404).json({ erreur: "Article introuvable." });
        res.status(200).json(row);
    });
});

// Créer un nouvel article
app.post('/api/articles', (req, res) => {
    // On utilise title et content au lieu de titre et contenu
    const { title, content, image } = req.body; 
    
    if (!title || !content) {
        return res.status(400).json({ erreur: "Les champs 'title' et 'content' sont requis." });
    }

    // Création de la date au format Laravel (YYYY-MM-DD HH:MM:SS)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    db.run(
        "INSERT INTO articles (title, content, image, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", 
        [title, content, image || null, now, now], 
        function(err) {
            if (err) return res.status(500).json({ erreur: err.message });
            res.status(201).json({ 
                id: this.lastID, 
                title, 
                content, 
                image,
                created_at: now,
                updated_at: now
            });
        }
    );
});

// ==========================================
// ROUTES COMMENTAIRES
// ==========================================

app.get('/api/articles/:id/comments', (req, res) => {
    db.all("SELECT * FROM comments WHERE article_id = ?", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ erreur: err.message });
        res.status(200).json(rows);
    });
});

app.post('/api/articles/:id/comments', (req, res) => {
    const article_id = req.params.id;
    // On suppose que la table s'appelle 'comments' avec 'author' et 'content'
    const { author, content } = req.body;

    if (!author || !content) return res.status(400).json({ erreur: "L'auteur et le contenu sont requis." });

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    db.run(
        "INSERT INTO comments (article_id, author, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", 
        [article_id, author, content, now, now], 
        function(err) {
            if (err) return res.status(500).json({ erreur: err.message });
            res.status(201).json({ id: this.lastID, article_id, author, content });
        }
    );
});

// ==========================================
// LANCEMENT
// ==========================================
app.listen(port, () => {
    console.log(`✅ API Blog démarrée sur http://localhost:${port}`);
});