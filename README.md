# Girl-Zone-Backend

## Quick start

```bash
npm install express pg bcrypt dotenv
node server.js
```

Set the following environment variables (or a `DATABASE_URL`) before running:

- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`
- `PORT` *(optional, default 3000)*

Two REST endpoints are available:

- `POST /register` – body requires `email`, `firstName`, `lastName`, `password`.
- `POST /login` – body requires `email`, `password`, optional `rememberMe`.