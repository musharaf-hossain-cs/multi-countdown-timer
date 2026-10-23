# ChronoDeck

A polished multi-countdown timer made for dashboards, presentations, and fullscreen displays.

## Features

- Add, edit, and delete multiple labelled countdowns
- Automatic nearest-first sorting
- Blinking visual alert when a timer reaches zero
- Responsive grid and list layouts
- Dynamic fullscreen presentation mode (`F` shortcut)
- Local persistence across page refreshes
- Static build that works from any GitHub Pages subpath

## Run locally

```bash
npm install
npm run dev
```

Run tests and create the production bundle:

```bash
npm test
npm run build
```

## Future scope: global sync

This version intentionally uses browser-local storage only. GitHub Pages is static, so a future shared version will need a separate database such as Firebase Realtime Database. A public no-login database must contain only non-sensitive countdowns.

## GitHub Pages

The included workflow builds and publishes the app whenever `main` is pushed. In the repository settings, choose **GitHub Actions** as the Pages source.
