# Morse code generator

Live site: **[morse.theorisons.dev](https://morse.theorisons.dev)**

A browser Morse studio for putting Morse into a video: follow-along text, WAV audio, and an oscilloscope you can key over footage.

English and French: [/en](https://morse.theorisons.dev/en) · [/fr](https://morse.theorisons.dev/fr)

## Features

- **Text to Morse** — live ITU encoding; accents fold to base letters
- **Follow-along** — highlights the current letter and Morse pattern while audio plays
- **Oscilloscope** — binary on/off trace that tracks playback
- **Sound presets** — Military, Naval, Telegraph, Radio, Sonar (speed, tone, waveform)
- **Farnsworth timing** — character speed and overall pace as separate WPMs
- **WAV export** — same settings as live playback
- **Morse reference** — tap a character to hear it

Everything runs in the browser, no server-side audio processing.
Based heavily on [@morsecodeapp/morse](https://www.npmjs.com/package/@morsecodeapp/morse).

## Stack

Next.js App Router, next-intl, next-themes, shadcn/ui (Base UI), Tailwind CSS 4.

## Develop

Requires [pnpm](https://pnpm.io/) (version pinned in `package.json`).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).
