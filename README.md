# Limitra USA

Curated product discovery platform. Editor-vetted fashion, beauty, home, and lifestyle finds from trusted retailers — with an affiliate model and a fully manageable admin panel.

## Stack

| Layer | Technology |
|---|---|
| Backend | Laravel 13 (PHP 8.3) |
| Frontend | React 19 + Inertia.js 3 |
| Build | Vite 8 + Tailwind CSS 4 |
| Database | SQLite (dev/UAT) · MySQL (production) |
| AI | Anthropic Claude Haiku (chat widget) |
| Queue | Database driver |

## Requirements

- PHP 8.3+
- Composer
- Node.js 20+
- SQLite (dev) or MySQL 8+ (production)

## Quick Start

```bash
# 1. Clone and enter
git clone <repo-url>
cd Limitra-USA-edit

# 2. One-command setup (install, .env, key, migrate, npm build)
composer setup

# 3. Start dev server (PHP + queue + logs + Vite, all in one terminal)
composer dev
```

Visit `http://localhost:8000`. Admin panel at `http://localhost:8000/admin`.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```dotenv
APP_NAME="Limitra USA"
APP_URL=https://your-domain.com

# Database — switch to mysql for production
DB_CONNECTION=sqlite          # dev/UAT
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=limitra_usa
# DB_USERNAME=root
# DB_PASSWORD=

# Required for the chat widget
ANTHROPIC_API_KEY=sk-ant-...
```

Key flags to set correctly in production:

```dotenv
APP_ENV=production
APP_DEBUG=false
```

## Database

All content is DB-driven and seeded. Run migrations and seed in one step:

```bash
php artisan migrate --seed
```

### Tables

| Table | Description |
|---|---|
| `categories` | 6 top-level categories (Women, Men, Beauty, Home & Living, Lifestyle, Travel) |
| `subcategories` | Sub-categories per category |
| `products` | 135 products — `is_featured` and `is_resort` flags control homepage rows |
| `product_details` | Editorial copy, highlights, specs, was_price |
| `product_reviews` | User-submitted reviews per product |
| `occasions` | Special collection events (World Cup, Graduation, etc.) |
| `articles` | Journal articles with block JSON body |
| `looks` | Style-the-Look galleries with product arrays |
| `videos` | YouTube video data (vid_id, tags) |
| `guides` | Buying guide cards |
| `site_settings` | Key/value store for all editable homepage content |
| `newsletter_subscribers` | Newsletter signups |

### Admin Account

The default admin account is created by `AdminSeeder`. Check `database/seeders/AdminSeeder.php` and change the credentials before deploying to any shared environment.

## Admin Panel

Route: `/admin` — protected by the `EnsureIsAdmin` middleware (`is_admin = 1` on the user record).

| Section | What you can manage |
|---|---|
| Dashboard | Overview stats |
| Products | Full CRUD — price, images, brand, is_featured / is_resort flags |
| Reviews | Moderate product reviews |
| Categories | Descriptions, images, taglines |
| Style the Look | Hero looks with product grids and style notes |
| Videos | YouTube video metadata and product links |
| Journal | Articles with rich block content |
| Occasions | Special collections with cover images |
| Settings | All homepage text — announce bar, hero title/CTAs, product row labels |

Login is rate-limited to **6 attempts per minute** per IP.

## Storefront Routes

```
GET  /                          Home
GET  /category/{slug}           Category page
GET  /category/{cat}/{sub}      Subcategory page
GET  /product/{id}              Product detail
GET  /collection/{type}         Curated collections (new, trending, editors, gifts…)
GET  /article/{slug}            Journal article
GET  /guides                    Buying guides
GET  /looks                     Style the Look index
GET  /look/{slug}               Individual look
GET  /page/{page}               Static pages (about, contact, privacy, terms…)
POST /api/chat                  AI chat widget (rate-limited: 30 req/min)
POST /newsletter/subscribe      Newsletter signup
```

## Design System

Four palette themes switchable via `document.documentElement.dataset.palette`:

| Theme | Brand | Accent |
|---|---|---|
| `riviera` (default) | Navy `#16357a` | Gold `#cf8a32` |
| `softgold` | Steel navy `#21406f` | Muted gold `#b9974c` |
| `charcoal` | Charcoal `#25282e` | Warm tan `#b08a55` |
| `champagne` | Deep brown `#2c2118` | Champagne `#bb9357` |

Fonts: **Bodoni Moda** (display/headings) · **Jost** (body)

## Building for Production

```bash
# Optimise PHP autoloader and config
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Build JS/CSS bundle
npm run build
```

Switch `DB_CONNECTION` to `mysql` and keep a queue worker running (supervisor recommended):

```bash
php artisan queue:work --tries=3
```

## Security Notes

- `APP_DEBUG` must be `false` in production — exposes stack traces and config values when `true`
- Admin login is throttled (6/min per IP); chat API is throttled (30/min per IP)
- `announce_text` and hero fields are server-sanitised — only `<strong>`, `<em>`, `<br>`, `<span>` are passed through, all attributes stripped
- SQLite has no connection pooling and is not suitable for production traffic — use MySQL or PostgreSQL
- Never commit `.env` — it is gitignored; generate a fresh `APP_KEY` on each new deployment with `php artisan key:generate`
