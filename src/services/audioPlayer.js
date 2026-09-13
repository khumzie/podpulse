import { storage } from './storage.js';

class AudioPlayerService {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.playsInline = true;

    this.currentEpisode = null;
    this.currentPodcast = null;
    this.currentAdSegments = [];
    this.currentBlobUrl = null;
    this.queue = [];

    this.isPlaying = false;
    this.duration = 0;
    this.currentTime = 0;
    this.playbackRate = 1.0;
    this.volume = 1.0;

    // Ad Skipping Configuration
    this.autoSkipAds = true;
    this.skipIntroEnabled = false;
    this.skipIntroSeconds = 30;
    this.skipOutroEnabled = false;
    this.skipOutroSeconds = 60;

    // Sleep Timer
    this.sleepTimerId = null;
    this.sleepTimerRemaining = 0;

    // Event listeners array
    this.listeners = {
      stateChange: [],
      timeUpdate: [],
      adSkipped: [],
      adDetected: [],
      trackEnded: [],
      error: []
    };

    this.initAudioListeners();
    this.loadSavedSettings();
  }

  async loadSavedSettings() {
    this.autoSkipAds = await storage.getSetting('autoSkipAds', true);
    this.skipIntroEnabled = await storage.getSetting('skipIntroEnabled', false);
    this.skipIntroSeconds = await storage.getSetting('skipIntroSeconds', 30);
    this.skipOutroEnabled = await storage.getSetting('skipOutroEnabled', false);
    this.skipOutroSeconds = await storage.getSetting('skipOutroSeconds', 60);
    this.playbackRate = await storage.getSetting('playbackRate', 1.0);
    this.audio.playbackRate = this.playbackRate;
  }

  initAudioListeners() {
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.notify('stateChange', { isPlaying: true });
      this.updateMediaSession();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notify('stateChange', { isPlaying: false });
      this.updateMediaSession();
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio.duration || this.currentEpisode?.duration || 0;
      this.notify('stateChange', { duration: this.duration });
      this.updateMediaSession();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio.currentTime;
      if (!this.duration && this.audio.duration) {
        this.duration = this.audio.duration;
      }

      // Check for Ad segments to auto-skip
      this.evaluateAdSkipping();

      this.notify('timeUpdate', {
        currentTime: this.currentTime,
        duration: this.duration
      });

      // Periodically persist progress (every 5 seconds)
      if (this.currentEpisode && Math.floor(this.currentTime) % 5 === 0) {
        storage.updateEpisodeProgress(this.currentEpisode.id, this.currentTime, this.duration);
      }
    });

    this.audio.addEventListener('ended', async () => {
      this.isPlaying = false;
      if (this.currentEpisode) {
        await storage.markEpisodePlayed(this.currentEpisode.id, true);
        this.currentEpisode.isPlayed = true;
      }
      this.notify('trackEnded', { episode: this.currentEpisode });
      this.notify('stateChange', { isPlaying: false });

      // Automatically play next in sequence
      try {
        await this.playNext();
      } catch (err) {
        console.warn('Auto-advance to next episode error:', err);
      }
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio playback error:', e);
      // Try fallback if available
      if (this.currentEpisode && this.currentEpisode.fallbackAudioUrl && this.audio.src !== this.currentEpisode.fallbackAudioUrl) {
        console.log('Attempting audio fallback URL...');
        this.audio.src = this.currentEpisode.fallbackAudioUrl;
        this.audio.play().catch(err => console.error('Fallback play failed:', err));
        return;
      }
      this.notify('error', { error: e });
    });

    // Setup iOS MediaSession Action Handlers
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skip = details.seekOffset || 15;
        this.seek(Math.max(0, this.audio.currentTime - skip));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skip = details.seekOffset || 30;
        this.seek(Math.min(this.duration, this.audio.currentTime + skip));
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
    }
  }

  // Evaluate playback position against known ad segments
  evaluateAdSkipping() {
    if (!this.autoSkipAds || !this.currentAdSegments || this.currentAdSegments.length === 0) {
      return;
    }

    const now = this.currentTime;

    for (const segment of this.currentAdSegments) {
      // Check if inside ad segment
      if (now >= segment.start && now < segment.end) {
        const secondsSkipped = segment.end - now;
        if (secondsSkipped > 0.5) {
          // Perform instant ad skip
          console.log(`⚡ Auto-skipping ad segment: ${segment.label} (${segment.start}s - ${segment.end}s)`);
          this.audio.currentTime = segment.end + 0.2;
          this.currentTime = this.audio.currentTime;

          // Record stats
          storage.recordAdSkip(secondsSkipped);

          // Notify UI to display glowing iOS banner
          this.notify('adSkipped', {
            segment,
            secondsSaved: Math.round(secondsSkipped),
            newTime: this.audio.currentTime
          });
          return;
        }
      }
    }

    // Check Intro Auto-Skip
    if (this.skipIntroEnabled && this.skipIntroSeconds > 0 && now < this.skipIntroSeconds && now > 0.5) {
      console.log(`⚡ Auto-skipping intro (${this.skipIntroSeconds}s)`);
      this.audio.currentTime = this.skipIntroSeconds + 0.2;
      this.notify('adSkipped', {
        segment: { label: 'Intro Preroll' },
        secondsSaved: this.skipIntroSeconds,
        newTime: this.audio.currentTime
      });
    }
  }

  // Play an episode (handles offline blob or streaming URL)
  async playEpisode(episode, podcast, queue = null) {
    this.currentEpisode = episode;
    this.currentPodcast = podcast;
    if (queue && Array.isArray(queue)) {
      this.queue = queue;
    }

    // Clean up previous blob URL
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    // Load Ad Segments for this episode
    const segmentsFromDb = await storage.getAdSegmentsForEpisode(episode.id);
    this.currentAdSegments = segmentsFromDb.length > 0 ? segmentsFromDb : (episode.adSegments || []);

    // Check if we have offline audio stored in IndexedDB
    let audioSrc = episode.audioUrl;
    let isOfflineSource = false;

    const offlineBlob = await storage.getEpisodeAudio(episode.id);
    if (offlineBlob) {
      this.currentBlobUrl = URL.createObjectURL(offlineBlob);
      audioSrc = this.currentBlobUrl;
      isOfflineSource = true;
      console.log('Using downloaded offline audio blob for playback.');
    } else if (!navigator.onLine) {
      throw new Error('This episode is not downloaded and you are currently offline.');
    }

    // Set Audio Source
    this.audio.src = audioSrc;
    this.audio.playbackRate = this.playbackRate;

    // Restore previous progress if available and not completed
    if (episode.currentTime && episode.currentTime > 5 && !episode.isPlayed) {
      this.audio.currentTime = episode.currentTime;
    } else {
      this.audio.currentTime = 0;
    }

    try {
      await this.audio.play();
      this.isPlaying = true;
    } catch (err) {
      console.warn('Direct play error, waiting for user gesture or fallback:', err);
      // If direct streaming failed, try fallback
      if (episode.fallbackAudioUrl && audioSrc !== episode.fallbackAudioUrl) {
        this.audio.src = episode.fallbackAudioUrl;
        await this.audio.play();
        this.isPlaying = true;
      }
    }

    this.updateMediaSession();
    this.notify('stateChange', {
      episode: this.currentEpisode,
      podcast: this.currentPodcast,
      isPlaying: this.isPlaying,
      isOfflineSource,
      adSegments: this.currentAdSegments
    });
  }

  // Resume playback
  async resume() {
    try {
      await this.audio.play();
      this.isPlaying = true;
      this.notify('stateChange', { isPlaying: true });
    } catch (e) {
      console.error('Failed to resume:', e);
    }
  }

  // Pause playback
  pause() {
    this.audio.pause();
    this.isPlaying = false;
    this.notify('stateChange', { isPlaying: false });
  }

  // Toggle play/pause
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  }

  // Play next episode in queue
  async playNext() {
    if (!this.queue || this.queue.length === 0 || !this.currentEpisode) return false;
    const currentIndex = this.queue.findIndex(e => e.id === this.currentEpisode.id);
    if (currentIndex !== -1 && currentIndex + 1 < this.queue.length) {
      const nextEp = this.queue[currentIndex + 1];
      console.log('Playing next episode in queue:', nextEp.title);
      await this.playEpisode(nextEp, this.currentPodcast, this.queue);
      return true;
    }
    return false;
  }

  // Play previous episode in queue
  async playPrevious() {
    if (!this.queue || this.queue.length === 0 || !this.currentEpisode) return false;
    const currentIndex = this.queue.findIndex(e => e.id === this.currentEpisode.id);
    if (currentIndex > 0) {
      const prevEp = this.queue[currentIndex - 1];
      console.log('Playing previous episode in queue:', prevEp.title);
      await this.playEpisode(prevEp, this.currentPodcast, this.queue);
      return true;
    }
    return false;
  }

  // Seek to target seconds
  seek(seconds) {
    const target = Math.max(0, Math.min(this.duration || Infinity, seconds));
    this.audio.currentTime = target;
    this.currentTime = target;
    this.notify('timeUpdate', {
      currentTime: target,
      duration: this.duration
    });
    this.updateMediaSession();
  }

  // Seek relative (+30s, -15s)
  skip(seconds) {
    this.seek(this.audio.currentTime + seconds);
  }

  // Set playback speed (e.g. 0.8, 1.0, 1.25, 1.5, 2.0)
  setPlaybackRate(rate) {
    this.playbackRate = rate;
    this.audio.playbackRate = rate;
    storage.setSetting('playbackRate', rate);
    this.notify('stateChange', { playbackRate: rate });
  }

  // Configure Auto-Skip Ads toggle
  setAutoSkipAds(enabled) {
    this.autoSkipAds = enabled;
    storage.setSetting('autoSkipAds', enabled);
    this.notify('stateChange', { autoSkipAds: enabled });
  }

  // Add custom user ad marker
  async addCustomAdSegment(start, end, label = 'User Marked Ad') {
    if (!this.currentEpisode) return;
    const newSeg = {
      id: 'ad_user_' + Date.now(),
      episodeId: this.currentEpisode.id,
      start: Math.round(start),
      end: Math.round(end),
      type: 'sponsor',
      label
    };

    await storage.saveAdSegment(newSeg);
    this.currentAdSegments.push(newSeg);
    this.notify('stateChange', { adSegments: this.currentAdSegments });
    return newSeg;
  }

  // Sleep Timer (e.g. 15, 30, 45, 60 minutes)
  setSleepTimer(minutes) {
    if (this.sleepTimerId) {
      clearInterval(this.sleepTimerId);
      this.sleepTimerId = null;
    }

    if (minutes <= 0) {
      this.sleepTimerRemaining = 0;
      this.notify('stateChange', { sleepTimerRemaining: 0 });
      return;
    }

    this.sleepTimerRemaining = minutes * 60;
    this.notify('stateChange', { sleepTimerRemaining: this.sleepTimerRemaining });

    this.sleepTimerId = setInterval(() => {
      this.sleepTimerRemaining -= 1;
      if (this.sleepTimerRemaining <= 0) {
        clearInterval(this.sleepTimerId);
        this.sleepTimerId = null;
        this.pause();
        this.notify('stateChange', { sleepTimerRemaining: 0 });
      } else {
        this.notify('stateChange', { sleepTimerRemaining: this.sleepTimerRemaining });
      }
    }, 1000);
  }

  // Sanitize and resolve artwork URL to absolute HTTPS URL for iOS compatibility
  getSafeArtworkUrl(url) {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return new URL('./apple-touch-icon.png', window.location.href).href;
    }
    url = url.trim();
    if (url.startsWith('/')) {
      return new URL('.' + url, window.location.href).href;
    }
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    if (!url.startsWith('http')) {
      return new URL(url, window.location.href).href;
    }
    return url;
  }

  // 1-Tap Skip Commercial Break (+60s or skip to end of current ad)
  async skipCurrentAdBreak(secondsToSkip = 60) {
    if (!this.currentEpisode) return;

    const now = this.currentTime;
    // Check if we are currently inside an already detected segment
    const activeSeg = (this.currentAdSegments || []).find(s => now >= s.start && now < s.end);

    let jumpTarget;
    let secondsSaved;
    let label;

    if (activeSeg) {
      jumpTarget = activeSeg.end + 0.5;
      secondsSaved = Math.max(1, activeSeg.end - now);
      label = activeSeg.label || 'Sponsor Ad Break';
    } else {
      jumpTarget = Math.min((this.duration || Infinity) - 1, now + secondsToSkip);
      secondsSaved = secondsToSkip;
      label = 'User-Skipped Ad Break';

      // Save this new ad segment to IndexedDB so this episode remembers it!
      const newSeg = {
        id: 'ad_user_' + Date.now(),
        episodeId: this.currentEpisode.id,
        start: Math.floor(now),
        end: Math.ceil(jumpTarget),
        type: 'sponsor',
        label: 'User-Saved Ad Break'
      };
      await storage.saveAdSegment(newSeg);
      this.currentAdSegments.push(newSeg);
      this.currentAdSegments.sort((a, b) => a.start - b.start);
    }

    this.seek(jumpTarget);
    storage.recordAdSkip(secondsSaved);

    this.notify('adSkipped', {
      segment: { label },
      secondsSaved: Math.round(secondsSaved),
      newTime: jumpTarget
    });

    this.notify('stateChange', { adSegments: this.currentAdSegments });
    return jumpTarget;
  }

  // Update MediaSession on iOS Lock Screen / Control Center / Dynamic Island
  updateMediaSession() {
    if (!('mediaSession' in navigator) || !this.currentEpisode) return;

    const rawCover = this.currentPodcast?.cover || this.currentEpisode?.cover;
    const safeArtUrl = this.getSafeArtworkUrl(rawCover);
    const localAppleTouchIcon = new URL('./apple-touch-icon.png', window.location.href).href;
    const localIcon512 = new URL('./icon-512.png', window.location.href).href;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentEpisode.title,
        artist: this.currentPodcast?.author || 'PodPulse',
        album: this.currentPodcast?.title || 'PodPulse Podcast',
        artwork: [
          { src: safeArtUrl, sizes: '96x96' },
          { src: safeArtUrl, sizes: '128x128' },
          { src: safeArtUrl, sizes: '192x192' },
          { src: safeArtUrl, sizes: '256x256' },
          { src: safeArtUrl, sizes: '384x384' },
          { src: safeArtUrl, sizes: '512x512' },
          { src: localAppleTouchIcon, sizes: '180x180', type: 'image/png' },
          { src: localIcon512, sizes: '512x512', type: 'image/png' }
        ]
      });
    } catch (err) {
      console.warn('MediaSession metadata set error:', err);
    }

    if (this.duration && !isNaN(this.duration)) {
      try {
        navigator.mediaSession.setPositionState({
          duration: this.duration,
          playbackRate: this.audio.playbackRate,
          position: Math.min(this.currentTime, this.duration)
        });
      } catch (e) {
        // Safe check for state updates
      }
    }
  }

  // Subscribe to events
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  notify(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in ${event} listener:`, err);
        }
      });
    }
  }
}

export const audioPlayer = new AudioPlayerService();
