/* eslint-disable no-restricted-globals */
import { delayAsync, buildTimer } from '../util';
import { Track } from '../types';

const thread = () => {
  let isRewoundOrForwarded: boolean = false;
  let track: Track | undefined;
  let startingIndex: number = 0;
  let timestamp: number = 0;

  /**
   * Plays the track, starting from a specific index.
   * @param track - The track to be played
   * @returns {Promise<void>} - A promise that resolves when it finishes playing the track
   */
  const playTrack = async (track: Track): Promise<void> => {
    let timer = buildTimer();
    let currentTime: number = 0;

    if (!track || !Array.isArray(track.notes)) {
      postMessage({ type: 'error', message: 'Invalid track data' });
      return;
    }

    for (let i = 0; i < track.notes.length; i++) {
      const note = track.notes[i];

      // Handle when the track is rewound or forwarded
      if (isRewoundOrForwarded) {
        isRewoundOrForwarded = false;
        i = startingIndex - 1; // Set loop to start from the new index
        timer = buildTimer(timestamp); // Rebuild the timer from the new timestamp
        currentTime = timer();
        continue;
      }

      const instrument = track.instrumentName;
      const timeToPlay = note.time;

      // Sync the current time with the note's play time
      while (currentTime < timeToPlay) {
        currentTime = timer();
        await delayAsync(5);
      }

      postMessage({ type: 'playNote', note, instrument });

      await delayAsync(note.duration);

      postMessage({ type: 'stopNote', note, instrument });
    }

    postMessage({ type: 'done' });
  };

  /**
   * Finds the starting index based on the timestamp
   * @param track - The track containing notes to check
   * @param timestamp - The timestamp to find the starting index for
   * @returns {number} - The index of the first note to play based on the timestamp
   */
  const adjustStartingIndex = (track: Track, timestamp: number): number => {
    let startingIndex = 0;

    for (let i = 0; i < track.notes.length; i++) {
      if (track.notes[i].time >= timestamp) {
        startingIndex = i;
        break;
      }
    }
    return startingIndex;
  };

  /**
   * Handles messages from the main thread
   * @param event - The message event containing data from the main thread
   * @returns {void}
   */
  const handleMessage = (event: MessageEvent): void => {
    const data = event.data;

    if (data.type === 'playTrack') {
      track = data.track;
      playTrack(data.track); // Start playing the track
    }

    if (data.type === 'skipToTimestamp') {
      if (track) {
        startingIndex = adjustStartingIndex(track, data.timestamp);
        timestamp = data.timestamp; // Set the timestamp for skipping
        isRewoundOrForwarded = true;
      }
    }
  };

  return {
    handleMessage,
  };
};

const threadInstance = thread();

self.onmessage = (event: MessageEvent) => {
  threadInstance.handleMessage(event);
};
