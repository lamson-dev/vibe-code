# Vibe Code Monorepo

This monorepo contains multiple projects managed with Turborepo and npm workspaces.

## Project Structure

```
vibe-code/
├── packages/           # Contains all project packages
├── package.json       # Root package.json for workspace management
└── turbo.json        # Turborepo configuration
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development servers:
   ```bash
   npm run dev
   ```

3. Build all packages:
   ```bash
   npm run build
   ```

## Available Scripts

- `npm run build` - Build all packages
- `npm run dev` - Start development servers
- `npm run lint` - Run linting
- `npm run test` - Run tests

## Adding New Packages

To add a new package:

1. Create a new directory in `packages/`
2. Initialize a new package with `npm init`
3. Add your package to the workspace by updating the root `package.json` 