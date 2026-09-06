# Run Doc — tenderX Frontend Preview

## Uncommitted artifacts

None. All dependencies are committed in `package.json` / `package-lock.json`.

## How to reproduce

```bash
cd frontend
npm install        # installs all deps including `motion`
```

## How to run the server

```bash
cd frontend
npx vite --host 0.0.0.0 --port 5173
```

- Default port: **5173**
- The server proxies `/api` requests to `http://127.0.0.1:8000` (Django backend)
- The frontend works standalone without the backend (shows auth/login screens)
