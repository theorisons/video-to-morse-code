import type { MorsePlayer } from "@morsecodeapp/morse/audio";

/**
 * MorsePlayer schedules a wall-clock `endTimer` at play() and never
 * pauses/reschedules it. Pausing for long enough (or pause→resume with
 * intervening wall time) fires end early and resets playback.
 *
 * These wrappers clear the timer on pause and re-arm it for the remaining
 * duration on resume.
 */
type PlayerInternals = {
  endTimer: ReturnType<typeof setTimeout> | null;
  _totalTime: number;
  handlePlaybackEnd: () => void;
};

function internals(player: MorsePlayer): PlayerInternals {
  return player as unknown as PlayerInternals;
}

function clearEndTimer(player: MorsePlayer) {
  const p = internals(player);
  if (p.endTimer) {
    clearTimeout(p.endTimer);
    p.endTimer = null;
  }
}

function armEndTimer(player: MorsePlayer) {
  const p = internals(player);
  clearEndTimer(player);
  const remainingMs = Math.max(0, p._totalTime - player.currentTime);
  p.endTimer = setTimeout(() => {
    p.handlePlaybackEnd();
  }, remainingMs + 100);
}

/** Patch pause/resume so only Stop (or natural end after real remaining time) resets. */
export function patchMorsePlayerTransport(player: MorsePlayer): MorsePlayer {
  const originalPause = player.pause.bind(player);
  const originalResume = player.resume.bind(player);

  player.pause = () => {
    originalPause();
    if (player.state === "paused") {
      clearEndTimer(player);
    }
  };

  player.resume = async () => {
    await originalResume();
    if (player.state === "playing") {
      armEndTimer(player);
    }
  };

  return player;
}
