// Air Piano note playback. Notes are preloaded once and replayed from the
// start on each hit — creating a new player per hit is the documented
// anti-pattern for expo-audio and adds latency right when it matters most.
//
// Real note audio files are not included in this repo yet — drop short note
// clips under app/assets/audio/ and build a `NoteSource[]` with `require()`
// for each to use this. See app/README.md "Audio" section.

import { AudioPlayer, createAudioPlayer } from "expo-audio";

export interface NoteSource {
  key: number; // key zone index, matches keyIndexForHand()/tap zone index
  source: Parameters<typeof createAudioPlayer>[0];
}

export class PianoPlayer {
  private players = new Map<number, AudioPlayer>();

  constructor(sources: NoteSource[]) {
    for (const { key, source } of sources) {
      this.players.set(key, createAudioPlayer(source));
    }
  }

  play(key: number): void {
    const player = this.players.get(key);
    if (!player) return;
    player.seekTo(0);
    player.play();
  }

  release(): void {
    for (const player of this.players.values()) {
      player.remove();
    }
    this.players.clear();
  }
}
