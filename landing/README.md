# SegreGate landing page

Scroll-driven 3D journey: a garbage truck drives through a neighbourhood, collecting bins as you scroll.
Three.js (procedural scene) + GSAP ScrollTrigger + Lenis smooth scroll. No framework.

```bash
npm install
npm run dev      # http://localhost:5174
npm run build
```

- `src/scene.ts`: the 3D world. Camera shots and sky colours are defined per page section (`KEYS`, `MOODS`).
- `src/main.ts`: scroll choreography (pinned app tour, parallax, counters, bin-check HUD).
- `public/shots/`: real screenshots of the resident app and admin dashboard.

## Optional: use your own truck model
Drop a garbage truck at `public/models/truck.glb`. It is scaled to the truck length automatically.
If it faces the wrong way, change `TRUCK_GLB_ROTATION_Y` in `src/scene.ts`.
