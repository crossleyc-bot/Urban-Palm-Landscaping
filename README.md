# Urban Palm Landscaping

Full-stack web application for Urban Palm Landscaping — a Central Florida landscaping company offering design, installation, delivery, tree care, and seasonal cleanup services.

## Tech Stack

- **Frontend:** React 19, React Router, Vite
- **Backend:** Express 5, Node.js
- **Database:** SQLite (better-sqlite3)
- **Payments:** Stripe
- **Hosting:** AWS Elastic Beanstalk (Amazon Linux 2023, Node.js 22)

## Project Structure

```
├── src/                # React frontend (Vite)
├── server/
│   ├── server.js       # Express entry point
│   ├── database.js     # SQLite connection
│   ├── db.js           # Schema, migrations, seeds
│   ├── seed.js         # Initial data seeder
│   ├── routes/         # API route modules
│   ├── middleware/      # Auth & upload middleware
│   └── uploads/        # User-uploaded files
├── dist/               # Vite build output (gitignored)
├── .ebextensions/      # Elastic Beanstalk config
├── .platform/          # Nginx proxy config
└── Procfile            # EB process command
```

## Local Development

```bash
npm install
npm run dev        # Vite dev server (frontend)
npm run server     # Express API server
```

The Vite dev server proxies `/api` requests to the Express backend on port 3001.

## Production Build

```bash
npm run build      # Build frontend with Vite
npm run seed       # Seed initial data
npm start          # Start Express server (serves API + static frontend)
```

## Deployment (AWS Elastic Beanstalk)

The app deploys to Elastic Beanstalk with the following configuration:

- **Procfile** runs `npm run build && npm run seed && npm start`
- **NPM_USE_PRODUCTION=false** ensures devDependencies (Vite) are installed for the build step
- **`.ebextensions/03-build-tools.config`** installs gcc-c++, make, and python3 for `better-sqlite3` native compilation
- **ELB health check** points to `/api/health`
- **Nginx** is configured as the reverse proxy with a 100MB upload limit

Deploy with the EB CLI:

```bash
eb deploy
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `8080` | Server listen port |
| `NPM_USE_PRODUCTION` | `false` | Install devDependencies on EB |
| `STRIPE_SECRET_KEY` | — | Stripe API secret key |
| `JWT_SECRET` | auto-generated | JWT signing secret |

## API

All API routes are mounted under `/api`:

- `/api/health` — ELB health check
- `/api/auth/*` — Authentication (register, login)
- `/api/services` — Landscaping services
- `/api/quotes` — Quote requests
- `/api/orders` — Product orders (Stripe checkout)
- `/api/jobs` — Job scheduling & tracking
- `/api/suppliers` — Supplier & inventory management
- `/api/admin/*` — Admin dashboard endpoints
- `/api/notifications` — User notifications
