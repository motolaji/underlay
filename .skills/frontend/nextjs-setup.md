# nextjs-setup.md

## Goal

Set up `app/` as a Next.js 14 App Router project for Underlay.

## Requirements

- Use npm
- Use App Router and `src/`
- Use Tailwind CSS
- Use TypeScript
- Public routes:
  - `/`
  - `/protocol`
- App routes:
  - `/app`
  - `/app/lp`
  - `/app/positions`
- Match Underlay's current frontend direction:
  - light off-white base
  - white surfaces
  - lower border radius
  - contemporary product UI
  - clearer app-vs-marketing separation

## Checklist

1. Initialize the app with Next.js 14 and Tailwind
2. Add design tokens for the light off-white product system
3. Split marketing shell from workspace shell
4. Add route placeholders for `/`, `/app`, `/app/lp`, `/app/positions`, and `/protocol`
5. Add types and state folders for market, cart, vault, and position state
6. Keep live integrations separate from public marketing content
