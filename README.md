# Consequence Thief

You cannot stop what happens. You can change where the price is paid.

[Play Consequence Thief](https://consequence-thief-564976398462.web.app)

A short, seated WebXR narrative: pinch to extract a luminous consequence from a crystal, carry it in your hand, and release it to fracture a sealed structure. A second pinch redirects the debt into the sky. The final consequence stays visible until you choose to replay.

This is an authored three-act interaction with a fixed destination and ending, rather than a general physics simulation. Session length depends on how long you explore and hold the consequence.

## Run

Node.js 20.19 or later. No application dependencies or API keys.

```sh
node scripts/check.mjs
node --test tests/*.test.mjs
node scripts/serve.mjs
# Open http://localhost:4173/
node scripts/build.mjs
```

The production static root is `dist/`. The local server binds to loopback and refuses hidden paths. Never serve the repository root publicly. Firebase Hosting configuration publishes only the app; local notes, QA dependencies and the offline preview are excluded.

## Play

- Desktop: press and hold on the scene or hold Space; release to transfer. Press again when the debt returns, then again after the ending to replay.
- Immersive WebXR: open over HTTPS in a supported headset browser and enter VR. Pinch thumb and index finger, hold, and release. Controller trigger is an optional fallback.
- No movement through the world is required. Pause/resume follows XR visibility and tracking availability. Input ownership preserves the carried consequence during temporary hand occlusion.

## Implementation and verification

Native WebXR sessions, per-eye projection, procedural WebGL2/GLSL rendering, world-space instructions, and original Web Audio synthesis. No runtime network requests, analytics, accounts or persistence. Development uses AI-assisted coding and ChatGPT-assisted research.

Logic, matrices, input ownership and session lifecycle have automated coverage. The actual desktop renderer and full immersive interaction have been exercised using Meta's official IWER 2.8.0 Quest 3 emulation, including two-eye rendering and replay. See [QA setup](qa/README.md) for the optional emulator. Its pinned dependency is development-only and excluded from the production bundle.

Physical Quest hardware, optical hand tracking, comfort and sustained headset frame rate have **not** been tested. Emulation is evidence of the software path, not hardware certification. Native WebXR is used directly; the application does not depend on IWSDK.

MIT licensed. All in-game visuals and sound are procedural. The optional Meta IWER runtime retains its own MIT license.
