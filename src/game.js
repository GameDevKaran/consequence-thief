/** Pure, deterministic story state-machine. All elapsed durations in seconds. */
export const Phase = Object.freeze({ INTRO: 0, STEAL: 1, HELD: 2, TRANSFER: 3, DEBT: 4, ENDING: 5, COMPLETE: 6 });
export const phaseNames = ['THE FALL', 'STEAL THE CONSEQUENCE', 'CARRY THE IMPOSSIBLE', 'TRANSFER THE DAMAGE', 'THE DEBT RETURNS', 'BREAK THE SKY', 'NOTHING DISAPPEARS'];
export const instructions = [
  'WATCH WHAT SHOULD HAPPEN',
  'PINCH / HOLD TO STEAL DESTRUCTION',
  'RELEASE TO TRANSFER IT',
  'THE STRUCTURE TAKES THE IMPACT',
  'PINCH AGAIN TO REDIRECT THE DEBT',
  'REALITY COLLECTS ITS DEBT',
  'THE PRICE REMAINS. PINCH TO BEGIN AGAIN.'
];
const AUTO = { [Phase.INTRO]: 2.4, [Phase.TRANSFER]: 4.0, [Phase.ENDING]: 7.0 };
export function createGame(t = 0) {
  return { phase: Phase.INTRO, phaseAt: t, phaseElapsed: 0, now: t, transitionCount: 0, lastEvent: 'intro', heldPosition: [0, 1.38, -1.15] };
}
export function goToPhase(game, phase, now) {
  if (!Number.isFinite(now)) throw new Error('Invalid timestamp');
  game.phase = phase;
  game.phaseAt = now;
  game.now = now;
  game.phaseElapsed = 0;
  game.transitionCount++;
  game.lastEvent = phaseNames[phase];
}
export function updateGame(game, now, heldPosition = null) {
  game.now = now;
  game.phaseElapsed = Math.max(0, now - game.phaseAt);
  if (game.phase === Phase.INTRO && game.phaseElapsed >= AUTO[Phase.INTRO]) goToPhase(game, Phase.STEAL, now);
  else if (game.phase === Phase.TRANSFER && game.phaseElapsed >= AUTO[Phase.TRANSFER]) goToPhase(game, Phase.DEBT, now);
  else if (game.phase === Phase.ENDING && game.phaseElapsed >= AUTO[Phase.ENDING]) goToPhase(game, Phase.COMPLETE, now);
  if (heldPosition && game.phase === Phase.HELD && heldPosition.length === 3 && heldPosition.every(Number.isFinite)) {
    // Keep the orb comfortably in front of the player even if a tracking joint reports outlier coordinates.
    game.heldPosition = heldPosition.map((v, i) => Math.max([-2, 0.45, -2.8][i], Math.min([2, 2.7, -0.25][i], v)));
  }
  return game.phase;
}
export function pointerDown(game, now) {
  if (game.phase === Phase.STEAL) { goToPhase(game, Phase.HELD, now); return 'steal'; }
  if (game.phase === Phase.DEBT) { goToPhase(game, Phase.ENDING, now); return 'ending'; }
  if (game.phase === Phase.COMPLETE) { Object.assign(game, createGame(now)); return 'replay'; }
  return null;
}
export function pointerUp(game, now) {
  if (game.phase === Phase.HELD) { goToPhase(game, Phase.TRANSFER, now); return 'transfer'; }
  return null;
}
export function progress(game, phase = game.phase) {
  if (phase === Phase.COMPLETE) return 1;
  if (phase === Phase.INTRO || phase === Phase.TRANSFER || phase === Phase.ENDING) return Math.min(1, game.phaseElapsed / AUTO[phase]);
  return 0;
}
