import {Synthesizer} from '../synthesizer/Synthesizer';
import {Track, Channel} from '../types';
import {PlayerInterface} from './playerInterface';
// @ts-ignore
// eslint-disable-next-line import/no-webpack-loader-syntax
import Thread from 'worker-loader!./trackThread.ts';
import {
  buildTimer,
  delayAsync
} from '../util';

export function player(synthesizer: Synthesizer, tracks: ReadonlyArray<Track>): PlayerInterface {
  let timer = buildTimer();

  let channels: Channel[] = [];

  let threads = new Set<Thread>();

  /**
   * Creates a new track thread for playing a specified track
   * @param track {Track} - The track to be played
   */
  const createTrackThread = (track: Track) => {
    const thread = new Thread();

    try {
      registerThread(thread);

      const channel = synthesizer.getChannel(track.instrumentName);

      registerChannel(channel);

      thread.onmessage = (e: MessageEvent) => {
        const data = e.data;

        if (channel.isPlaying) {
          if (data.type === 'playNote') {
            channel.playNote(data.note.name, data.note.velocity);
          }

          if (data.type === 'stopNote') {
            channel.stopNote();
          }

          if (data.type === 'done') {
            terminateThread(thread);
          }
        } else {
          terminateThread(thread);
        }

        if (data.type === 'error') {
          terminateThread(thread);
        }
      };

      thread.postMessage({type: 'playTrack', track});

    } catch (error) {
      console.log('Error creating track thread', error);
    }
  };

  /**
   * Plays all the tracks asynchronously until completion
   * @returns {Promise<string>} - A promise that resolves when playback is done (there are no active channels)
   */
  const play = (): Promise<void> => {
    return new Promise(async (resolve) => {
      tracks.forEach((track) => {
        createTrackThread(track);
      });

      while (hasActiveChannels()) {
        await delayAsync(5);
      }

      clearChannels();
      resolve();
    });
  };

  /**
   * Gets the current time of playback
   * @returns {number} - The current playback time
   */
  const getTime = (): number => {
    if (hasActiveChannels()) {
      return timer();
    }
    return 0;
  };

  /**
   * Skips playback to a specific timestamp
   * @param timestamp {number} - The timestamp to skip to
   */
  const skipToTimestamp = (timestamp: number) => {
    timer = buildTimer(timestamp);
    postMessageToThreads({ type: 'skipToTimestamp', timestamp });
  };

  /**
   * Registers a channel for tracking playback state
   * @param channel {Channel} - The channel to register
   */
  const registerChannel = (channel: Channel) => {
    channels.push(channel);
  };

  /**
   * Checks if any channels are currently active (playing)
   * @returns {boolean} - True if any channels are active, false otherwise
   */
  const hasActiveChannels = (): boolean => {
    return channels.some(channel => channel.isPlaying);
  };

  /**
   * Clears all registered channels.
   */
  const clearChannels = () => {
    channels = [];
  };

  /**
   * Terminates a specified thread and removes it from the set of active threads
   * @param thread {Thread} - The thread to terminate
   */
  const terminateThread = (thread: Thread) => {
    thread.terminate();
    threads.delete(thread);
  };

  /**
   * Registers a thread for tracking
   * @param thread {Thread} - The thread to register
   */
  const registerThread = (thread: Thread) => {
    threads.add(thread);
  };

  /**
   * Posts a message to all active threads
   * @param data {object} - The data to send to the threads
   */
  const postMessageToThreads = (data: object) => {
    threads.forEach(thread => {
      thread.postMessage(data);
    });
  };

  return {
    play,
    getTime,
    skipToTimestamp,
  };
}
