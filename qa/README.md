# Optional official Meta IWER verification

Run `node scripts/prepare-emulator.mjs`, then the ordinary development server and open `http://localhost:4173/qa/emulator.html`.

The preparation script downloads **iwer 2.8.0** from the official npm registry and verifies the package SHA-512 integrity before extracting only its browser module and MIT license. Its generated files remain ignored and are excluded from the production build. The emulator is never injected into the normal application entry.

Click **Enter immersive VR**, then **Pinch left hand**, **Move held hand right**, and **Release left hand**. After the debt instruction, pinch again, release, and wait for the ending. Repeat a pinch to replay. Also check **Stereo eyes**, left-hand occlusion/recovery while holding, and system pause/resume. These controls modify official IWER device state, not application state or test outcomes.

This is software-emulated WebXR input/rendering evidence. It does not establish physical Quest frame rate, thermal performance, optical hand tracking quality or comfort. Label recordings “Meta IWER Quest 3 emulation”.

Official references:
- https://meta-quest.github.io/immersive-web-emulation-runtime/getting-started.html
- https://developers.meta.com/vr/documentation/web/webxr-first-steps/
- https://github.com/meta-quest/immersive-web-emulation-runtime
