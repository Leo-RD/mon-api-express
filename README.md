# API Blog

API REST Express branchée directement sur la base SQLite du blog Laravel (`auth-app`).

## Lancer l'API

```bash
npm install
npm run dev     # avec rechargement automatique (nodemon)
# ou
npm start
```

- API : http://localhost:3000
- Documentation et tests interactifs (Swagger) : http://localhost:3000/api-docs

Par défaut, l'API utilise `/Users/leo/Herd/auth-app/database/database.sqlite`. Pour pointer ailleurs :

```bash
DB_PATH=/chemin/vers/database.sqlite npm start
```

## Routes

| Méthode | URL                          | Corps JSON                         |
|---------|------------------------------|------------------------------------|
| GET     | `/api/articles`              |                                    |
| GET     | `/api/articles/:id`          |                                    |
| POST    | `/api/articles`              | `title`, `content`, `image` (opt.) |
| GET     | `/api/articles/:id/comments` |                                    |
| POST    | `/api/articles/:id/comments` | `user_id`, `content`               |

Exemple :

```bash
curl -X POST http://localhost:3000/api/articles/1/comments \
  -H 'Content-Type: application/json' \
  -d '{"user_id": 1, "content": "Super article !"}'
```

## Docker

La base n'est pas copiée dans l'image : on monte le dossier `database` de Laravel sur `/data`.

```bash
docker build -t api-blog .
docker run -p 3000:3000 -v /Users/leo/Herd/auth-app/database:/data api-blog
```

## Limites connues

L'API n'a **aucune authentification** : n'importe qui peut créer des articles et commenter au nom de n'importe quel `user_id`. Les suppressions restent volontairement côté Laravel, où le rôle admin est vérifié.
