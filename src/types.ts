export interface Note {
  name: string;
  time: number;
  velocity: number;
  duration: number;
}

export interface Track {
  instrumentName: string;
  notes: Array<Note>;
}

export interface Channel {
  isPlaying: boolean;
  playNote(name: string, velocity: number): void;
  stopNote(): void;
}

export type Score = Array<Track>;
