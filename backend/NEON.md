# Configuration Neon (PostgreSQL)

L’application peut utiliser une base **Neon** pour stocker les credentials Pronote et le cache des données à la place des fichiers `credentials.json` et `data.json`.

## 1. Créer un projet Neon

1. Aller sur [console.neon.tech](https://console.neon.tech) et créer un compte / projet.
2. Créer une base de données et récupérer l’**URL de connexion** (Connection string).

## 2. Créer les tables

Dans le **SQL Editor** du dashboard Neon, exécuter le contenu du fichier `backend/schema.sql` :

- `pronote_credentials` : une ligne (id=1) pour les identifiants de session Pronote.
- `pronote_cache` : une ligne (id=1) pour le cache des données (notes, devoirs, EDT, etc.).

## 3. Variables d’environnement

Définir `DATABASE_URL` avec l’URL Neon (ex. `postgresql://user:password@host/database?sslmode=require`) :

- **En local** : dans un fichier `.env.local` à la racine de `personal-pronote`, ou en export dans le terminal.
- **Côté Python** : les routes Next.js qui lancent le script Python lui passent déjà `process.env` ; si `DATABASE_URL` est défini dans l’environnement Next (`.env.local` ou Vercel), le script Python le reçoit.

## 4. Comportement

- **Si `DATABASE_URL` est défini** : lecture/écriture des credentials et du cache dans Neon (plus de dépendance aux fichiers).
- **Si `DATABASE_URL` n’est pas défini** : comportement inchangé avec `credentials.json` et `data.json` dans le dossier `backend/`.

## 5. Déploiement (ex. Vercel)

Pour déployer le front Next.js sur Vercel tout en utilisant Neon :

1. Configurer la variable d’environnement `DATABASE_URL` dans les paramètres du projet Vercel.
2. Le **backend Python** (pronote_client.py) doit tourner ailleurs (Railway, Render, etc.) car Vercel ne peut pas exécuter ce script. Ce backend doit aussi avoir `DATABASE_URL` configuré et se connecter à la même base Neon.

Voir la doc du projet pour l’architecture « Front Vercel + Backend Python externe » si vous visez un déploiement complet.
