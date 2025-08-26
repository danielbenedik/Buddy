# Buddy

> [Balance Money App ]

---

## 🚀 Environments

We use **GitHub Pages** with two environments:

- **Staging**  
  Automatically deployed from the `main` branch.  
  👉 [https://danielbenedik.github.io/Buddy/stg/](https://danielbenedik.github.io/Buddy/stg/)

- **Production**  
  Manual promotion from staging.  
  👉 [https://danielbenedik.github.io/Buddy/](https://danielbenedik.github.io/Buddy/)

### Deployment Flow

1. Merge PR → `main` → GitHub Actions builds with  
   `PUBLIC_URL=/Buddy/stg/` → deploys to `/stg/`
2. When staging is verified, run the **Promote to prod** workflow from the  
   **Actions** tab → builds with `PUBLIC_URL=/Buddy/` → deploys to `/`

---

## ⚙️ CI/CD

### Pull Request Checks
Every PR to `main` triggers:
- **Prettier** – formatting check
- **ESLint** – lint rules for React + TypeScript + Prettier
- **TypeScript** – type checking (`tsc --noEmit`)
- **Tests** – run via `npm test -- --ci --watchAll=false`

Merging is blocked until checks pass (or bypassed by an admin).

### GitHub Actions Workflows

- **Deploy staging to /stg**  
  Runs on push to `main`, builds app with `PUBLIC_URL=/Buddy/stg/` and updates `/stg`.

- **Promote to prod**  
  Manual workflow (`workflow_dispatch`). Builds with `PUBLIC_URL=/Buddy/` and publishes to `/`.

- **PR Lint & Type Check**  
  Runs on pull requests, enforces code quality.

---

## 🛠️ Development

### Install dependencies
```bash
npm install
