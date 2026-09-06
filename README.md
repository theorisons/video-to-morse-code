# Morse code generator

Client-side Next.js app to translate text to Morse and generate Morse WAV audio.

## Features

- **Text to Morse** — live ITU translation; accents (`é`, `è`, …) fold to base letters
- **Dual follow-along** — highlights the plaintext letter and Morse pattern during playback
- **Audio settings** — WPM, frequency, volume, waveform, Farnsworth, sound presets
- **WAV download** — export with the same settings as playback

Everything runs in the browser via [`@morsecodeapp/morse`](https://www.npmjs.com/package/@morsecodeapp/morse). UI is shadcn (Base UI + Vega) + Tailwind.

## Develop

Requires [pnpm](https://pnpm.io/) (pinned via `packageManager` in `package.json`).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm build
pnpm start
pnpm lint
```
