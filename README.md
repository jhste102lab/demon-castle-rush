# Demon Castle Rush

**Demon Castle Rush** (Korean title: 마왕성 러시) is a mobile-first browser game about growing a demon castle while surviving endless kingdom invasions.

Play it here: https://jhste102lab.github.io/demon-castle-rush/

## Game

- Infinite auto-battle survival score game with 120-second invasion cycles.
- Runs in a single vertical screen on mobile and desktop browsers.
- Castle facilities attack automatically while heroes push from the top of the field.
- Upgrade, construction, risk-reward, and skill-modifier choices can be selected manually or auto-picked when the timer expires.
- 2x and 3x speed controls affect combat, spawning, growth, and choice timers.
- No login, backend, ads, payments, online ranking, external images, external fonts, CDN assets, or audio files.

## Development

```bash
npm ci
npm run dev
```

Useful checks:

```bash
npm test
npm run build
npm run preview
npm run test:e2e
```

The Playwright suite runs against the production preview server and checks both mobile and desktop layouts.

## Environment Variables

This version does not require runtime environment variables. The source currently has no `import.meta.env`, `process.env`, or `VITE_*` app configuration references.

Local `.env` files are intentionally ignored. If future features add `VITE_*` variables, load them locally from the NovelTrack Infisical environment and configure matching GitHub Actions secrets for public deployment. Do not commit `.env` files.

## Deployment

The project is deployed to GitHub Pages from `.github/workflows/deploy.yml`.

On every push to `main`, GitHub Actions installs dependencies, runs unit tests, builds the Vite app, uploads `dist`, and deploys it to GitHub Pages.

## Original Goal

`goal.md` is the original one-shot Korean implementation prompt used to define the game requirements. It is kept in the repository as project context and a checklist for future changes; it is not required to run the game.

## License

No open-source license has been added yet. The repository is public for viewing and playing the deployed game.
