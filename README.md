# Connect Four 3D — Standalone Deployment

Self-contained Connect Four with 3D multiplayer world.  
Copy of the game extracted from the Neon Games monorepo.

---

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Start the unified API + WebSocket server (port 3002)
npm run serve:api:unified

# 3. In another terminal — start the React dev server (port 3000)
npm start
```

Open **http://localhost:3000/connect-four** to play.

---

## Production Build

```bash
npm run build
```

This creates a `build/` folder with optimised static files.

### Deploy the client
Upload the contents of `build/` to any static host (Netlify, Vercel, S3, Atspace, shared hosting, etc.).

### Deploy the server
The server needs Node.js 18+.

```bash
# On your VPS / server:
npm install --production
node scripts/start-unified.js
```

The unified server runs on port **3002** and handles:
- REST API (auth, wallet, uploads) at `/api/*`
- Connect Four WebSocket at `/ws/c4`

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3002 | Server port |
| `UNIFIED_WS` | 1 | Enable unified WS mode |
| `MYSQL_HOST` | 127.0.0.1 | MySQL host |
| `MYSQL_PORT` | 3306 | MySQL port |
| `MYSQL_USER` | root | MySQL user |
| `MYSQL_PASSWORD` | *(empty)* | MySQL password |
| `MYSQL_DB` | game | Database name |
| `JWT_SECRET` | change_me_dev | JWT signing secret |
| `DB_OPTIONAL` | 1 | Start even if DB unavailable |

The server works without MySQL — accounts/wallet features are disabled but the game plays fine.

---

## Database (optional)

Run `server/schema.sql` against your MySQL instance to create the required tables:

```bash
mysql -u root game < server/schema.sql
```

---

## Folder Structure

```
connect-four-standalone/
├── package.json            # Standalone deps & scripts
├── .env.example            # Env template
├── nodemon.json            # Server auto-reload config
├── server/                 # API server + auth
│   ├── server.js
│   ├── jwt.js
│   └── schema.sql
├── scripts/
│   └── start-unified.js    # Unified server entry point
├── public/                 # Static assets
│   ├── models/             # 3D avatars & props
│   ├── sounds/             # Game audio
│   └── textures/           # Terrain textures
├── src/
│   ├── App.js              # Routes (C4 only)
│   ├── index.js            # React entry
│   ├── config.js           # Server host resolution
│   ├── components/
│   │   ├── games/
│   │   │   ├── ConnectFour/    # Game logic, lobby, WS client
│   │   │   ├── ConnectFour3D/  # 3D world (Three.js)
│   │   │   └── common/        # QuickChat, WaitingOverlay
│   │   ├── common/             # GameSetup, LoginOverlay, Wallet
│   │   └── Landing/            # Landing page
│   └── ...
└── build/                  # Production output (after npm run build)
```

---

## Routes

| Path | Component |
|------|-----------|
| `/` | Landing page |
| `/connect-four` | Connect Four (lobby → 3D game) |
| `/connect-four-3d` | 3D world test sandbox |
| `/registration` | Account creation |

---

## Notes

- All files are **unmodified copies** from the main repo (except `App.js` which only includes C4 routes and `package.json` which only includes C4 dependencies).
- The landing page still shows links to other games — they're just dead routes. Customise `LandingPage.jsx` and `MobileBottomNav.jsx` as needed.
- To regenerate this folder, run `node scripts/create-c4-standalone.js` from the main repo root.
