import { Phase, instructions, phaseNames } from './game.js';
export function storyText(phase) {
  return { title: phaseNames[phase], subtitle: instructions[phase], act: phase <= Phase.HELD ? 'ACT I / THEFT' : phase <= Phase.DEBT ? 'ACT II / TRANSFER' : 'ACT III / RECKONING' };
}
export function formatTimer(seconds) {return `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;}
