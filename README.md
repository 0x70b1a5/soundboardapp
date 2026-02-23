# Soundboard - A real-time audio manipulation web app

![Preact](https://img.shields.io/badge/Preact-10.x-673AB8?logo=preact)
![Tone.js](https://img.shields.io/badge/Tone.js-15.x-F734D7)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite)
![Sounds](https://img.shields.io/badge/sounds-211-orange)

A full-stack web soundboard with real-time pitch shifting, speed control, reverb, and instant mid-playback audio reversal. 211 sounds across 15 categories, all manipulable on the fly.

## Features

### Real-Time Audio Engine
- **Speed Control** - 0.5x to 2.0x playback with fine-grained 0.05x increments
- **Pitch Shifting** - -12 to +12 semitones, independent of speed
- **Vinyl Mode** - Lock pitch to speed for authentic record-player effects, with automatic pitch compensation via `pitch + (-12 * log2(speed))`
- **Reverb** - Adjustable wet/dry room reverb routed through Tone.js effect chain
- **Instant Reverse** - Flip playback direction mid-sound without interruption, using dual-buffer architecture (forward + reversed clones) with real-time offset calculation

### Sound Library
- **211 sounds** organized into **15 categories** - strings, mechanical-metal, splats, horns, nature, slides, and more
- **Alphabetical or Category sorting** with auto-generated HSV color coding for visual distinction
- **Real-time search** across all sound names
- **Favorites** - Long-press any sound to favorite it; persisted in localStorage and pinned in a sticky header for instant access

### Responsive Interface
- **Desktop** - Floating control panels anchored to screen corners with full slider controls
- **Mobile** - Compact bottom bar with icon-driven controls and haptic feedback on long-press
- **Dark mode** with system preference detection
- **Five button sizes** (xxs through lg) for density preference
- **Procedurally generated backgrounds** - unique CSS gradient compositions on every load

### Performance
- **Batched preloading** - Sounds load in groups of 5 with a visual progress bar
- **Retry with exponential backoff** - Failed loads retry up to 3 times
- **Lazy UI feedback** - Not-yet-loaded sounds are visually greyed out with a wait cursor

## Architecture

```
Frontend (Preact + Vite)          Backend (Express)
┌───────────────────────┐         ┌───────────────────┐
│  App.tsx              │         │  app.ts           │
│  ├─ useAudio hook     │  ◄────► │  /api/sounds      │
│  │  └─ Tone.js        │  proxy  │  /api/audio/:path │
│  │     Player → Pitch │         └───────────────────┘
│  │     Shift → Reverb │              │
│  │     → Destination  │         Recursive file read
│  ├─ SoundButton       │         of audio directory
│  ├─ SoundList         │
│  ├─ Slider (custom)   │
│  └─ LoadingBar        │
└───────────────────────┘
```

The `useAudio` hook manages the entire audio lifecycle: preloading buffers, maintaining dual players per sound (forward and reversed clones), routing through a `Player → PitchShift → Reverb → Destination` effect chain, and tracking playback state via refs for seamless mid-playback manipulation.

## Setup

1. Clone the repo
2. Install dependencies - `npm install`
3. Drop your audio files into a directory and point the server at it
4. Start the backend - `npm run server`
5. Start the frontend - `npm run dev`

## See Also

- [JeevesPT](https://github.com/0x70b1a5/jeevespt) - A multi-persona AI Discord bot powered by Claude
