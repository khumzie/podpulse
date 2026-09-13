import { audioPlayer } from '../../services/audioPlayer.js';
import { podcastService } from '../../services/podcastService.js';

export class PlayerModal {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'player-sheet-modal';
    this.container.id = 'full-player-sheet';
    this.isOpen = false;
    this.isDragging = false;

    this.render();
    this.initListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="ambient-background-blur" id="player-ambient-bg"></div>

      <div class="player-sheet-content">
        <!-- Top Bar with iOS Drag Handle -->
        <div class="player-sheet-top-bar">
          <button class="sheet-close-btn" id="btn-sheet-close" aria-label="Close player">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div class="sheet-drag-handle"></div>
          <div style="width: 36px;"></div> <!-- balance spacer -->
        </div>

        <!-- Big Cover Art -->
        <div class="player-artwork-wrapper" id="player-artwork-wrapper">
          <img class="player-artwork-img" id="player-cover-img" src="./apple-touch-icon.png" alt="Episode Cover" />
          <div class="player-ad-shield-badge">
            <div class="shield-pulse"></div>
            <span>Ad Shield Active</span>
          </div>
        </div>

        <!-- Track Metadata -->
        <div class="player-meta-container">
          <h2 class="player-track-title" id="player-track-title">Episode Title</h2>
          <div class="player-track-podcast" id="player-track-podcast">Podcast Show</div>
          <div class="player-track-author" id="player-track-author">Author / Host</div>
        </div>

        <!-- Scrubber Section with Ad Highlights -->
        <div class="scrubber-section">
          <div class="scrubber-track-container" id="scrubber-touch-area">
            <div class="scrubber-track-bg" id="scrubber-bg">
              <!-- Ad Highlight Marker Blocks will be inserted here dynamically -->
              <div class="scrubber-progress-fill" id="scrubber-fill"></div>
            </div>
            <div class="scrubber-thumb" id="scrubber-thumb"></div>
          </div>
          <div class="scrubber-timestamps">
            <span id="player-time-current">0:00</span>
            <span id="player-time-remaining">-0:00</span>
          </div>
        </div>

        <!-- Quick Ad Shield Skip Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.25); border-radius: 12px; padding: 7px 12px; margin: -6px 0 2px 0;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 700; color: #a5b4fc;">
            <div class="shield-pulse"></div>
            <span id="player-ad-status-text">Ad Shield Active</span>
          </div>
          <button id="player-manual-skip-ad-btn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; border: none; padding: 5px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(245,158,11,0.3);">
            ⚡ Skip Ad Break (+60s)
          </button>
        </div>

        <!-- Main Transport Controls -->
        <div class="transport-controls-row">
          <button class="transport-btn skip-btn" id="btn-skip-back-15" aria-label="Rewind 15 seconds">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M1 4v6h6"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
            <span class="skip-sec-badge">15</span>
          </button>

          <button class="transport-btn play-pause-big" id="btn-player-play-pause" aria-label="Play / Pause">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" id="player-big-icon">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>

          <button class="transport-btn skip-btn" id="btn-skip-fwd-30" aria-label="Forward 30 seconds">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M23 4v6h-6"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span class="skip-sec-badge">30</span>
          </button>
        </div>

        <!-- Secondary Toolbar (Speed, Sleep Timer, Mark Ad) -->
        <div class="player-secondary-toolbar">
          <button class="tool-pill-btn" id="btn-speed-toggle">
            <span id="btn-speed-label">1.0x</span>
          </button>

          <button class="tool-pill-btn" id="btn-sleep-toggle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span id="btn-sleep-label">Timer</span>
          </button>

          <button class="tool-pill-btn" id="btn-mark-ad-marker">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span>+ Mark Ad</span>
          </button>
        </div>

        <!-- Detected Ad Segments in this Episode -->
        <div class="player-segments-section" id="player-segments-section">
          <div class="segments-header">
            <span>⚡ Detected Sponsor Segments</span>
            <span style="font-size: 11px; color: var(--shield-light);">Auto-Skip Enabled</span>
          </div>
          <div id="player-ad-cards-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
      </div>
    `;

    return this.container;
  }

  initListeners() {
    // Close Sheet
    this.container.querySelector('#btn-sheet-close').addEventListener('click', () => {
      this.close();
    });

    // Play / Pause Big
    const playPauseBtn = this.container.querySelector('#btn-player-play-pause');
    playPauseBtn.addEventListener('click', () => {
      audioPlayer.togglePlay();
    });

    // Rewind 15s
    this.container.querySelector('#btn-skip-back-15').addEventListener('click', () => {
      audioPlayer.skip(-15);
    });

    // Forward 30s
    this.container.querySelector('#btn-skip-fwd-30').addEventListener('click', () => {
      audioPlayer.skip(30);
    });

    // Playback Speed Toggle
    const speeds = [0.8, 1.0, 1.25, 1.5, 2.0];
    const speedBtn = this.container.querySelector('#btn-speed-toggle');
    const speedLabel = this.container.querySelector('#btn-speed-label');
    speedBtn.addEventListener('click', () => {
      let currentIdx = speeds.indexOf(audioPlayer.playbackRate);
      if (currentIdx === -1) currentIdx = 1;
      const nextSpeed = speeds[(currentIdx + 1) % speeds.length];
      audioPlayer.setPlaybackRate(nextSpeed);
      speedLabel.textContent = `${nextSpeed}x`;
    });

    // Sleep Timer Toggle
    const timers = [0, 15, 30, 45, 60];
    const sleepBtn = this.container.querySelector('#btn-sleep-toggle');
    const sleepLabel = this.container.querySelector('#btn-sleep-label');
    let currentTimerIdx = 0;
    sleepBtn.addEventListener('click', () => {
      currentTimerIdx = (currentTimerIdx + 1) % timers.length;
      const minutes = timers[currentTimerIdx];
      audioPlayer.setSleepTimer(minutes);
      sleepLabel.textContent = minutes > 0 ? `${minutes}m` : 'Timer';
      sleepBtn.classList.toggle('active', minutes > 0);
    });

    // Mark Custom Ad Segment Button
    const markAdBtn = this.container.querySelector('#btn-mark-ad-marker');
    markAdBtn.addEventListener('click', async () => {
      const now = Math.floor(audioPlayer.currentTime);
      const defaultEnd = now + 45;
      const label = prompt('Mark sponsor ad segment (e.g. "Sponsor: Athletic Greens"):', 'Sponsor Break');
      if (label) {
        await audioPlayer.addCustomAdSegment(now, defaultEnd, label);
        this.renderAdMarkersOnScrubber();
        this.renderAdSegmentsList();
        alert(`Ad segment bookmarked at ${podcastService.formatTimeShort(now)} - ${podcastService.formatTimeShort(defaultEnd)}. Will auto-skip seamlessly!`);
      }
    });

    // Touch / Click Scrubber Dragging
    const touchArea = this.container.querySelector('#scrubber-touch-area');
    const handleSeek = (e) => {
      const rect = touchArea.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (audioPlayer.duration > 0) {
        audioPlayer.seek(pos * audioPlayer.duration);
      }
    };

    touchArea.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      handleSeek(e);
      const onMouseMove = (moveEvent) => {
        if (this.isDragging) handleSeek(moveEvent);
      };
      const onMouseUp = () => {
        this.isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    touchArea.addEventListener('touchstart', (e) => {
      this.isDragging = true;
      handleSeek(e);
    }, { passive: true });

    touchArea.addEventListener('touchmove', (e) => {
      if (this.isDragging) handleSeek(e);
    }, { passive: true });

    touchArea.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Manual Skip Ad Break Button
    const manualSkipBtn = this.container.querySelector('#player-manual-skip-ad-btn');
    if (manualSkipBtn) {
      manualSkipBtn.addEventListener('click', () => {
        audioPlayer.skipCurrentAdBreak(60);
      });
    }

    // Audio Player State Listener
    audioPlayer.on('stateChange', () => {
      this.updateTrackInfo();
    });

    audioPlayer.on('timeUpdate', ({ currentTime, duration }) => {
      this.updateScrubber(currentTime, duration);
    });
  }

  open() {
    this.isOpen = true;
    this.container.classList.add('open');
    this.updateTrackInfo();
  }

  close() {
    this.isOpen = false;
    this.container.classList.remove('open');
  }

  updateTrackInfo() {
    const ep = audioPlayer.currentEpisode;
    const pod = audioPlayer.currentPodcast;
    if (!ep) return;

    const ambientBg = this.container.querySelector('#player-ambient-bg');
    const coverImg = this.container.querySelector('#player-cover-img');
    const titleEl = this.container.querySelector('#player-track-title');
    const podEl = this.container.querySelector('#player-track-podcast');
    const authorEl = this.container.querySelector('#player-track-author');
    const bigIcon = this.container.querySelector('#player-big-icon');
    const artworkWrapper = this.container.querySelector('#player-artwork-wrapper');

    const rawCover = pod?.cover || ep?.cover;
    const safeUrl = audioPlayer.getSafeArtworkUrl(rawCover);
    ambientBg.style.backgroundImage = `url(${safeUrl})`;
    delete coverImg.dataset.triedProxy;
    coverImg.src = safeUrl;
    coverImg.onerror = () => {
      if (!coverImg.dataset.triedProxy && safeUrl.startsWith('http')) {
        coverImg.dataset.triedProxy = 'true';
        coverImg.src = `https://images.weserv.nl/?url=${encodeURIComponent(safeUrl)}&w=400&h=400&fit=cover`;
      } else {
        coverImg.src = new URL('./apple-touch-icon.png', window.location.href).href;
      }
    };

    titleEl.textContent = ep.title;
    podEl.textContent = pod?.title || 'Podcast';
    authorEl.textContent = pod?.author || '';

    if (audioPlayer.isPlaying) {
      artworkWrapper.classList.add('playing');
      bigIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    } else {
      artworkWrapper.classList.remove('playing');
      bigIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
    }

    this.renderAdMarkersOnScrubber();
    this.renderAdSegmentsList();
  }

  renderAdMarkersOnScrubber() {
    const scrubberBg = this.container.querySelector('#scrubber-bg');
    const duration = audioPlayer.duration || audioPlayer.currentEpisode?.duration || 1;

    // Remove existing ad marker blocks
    scrubberBg.querySelectorAll('.ad-segment-marker-block').forEach(el => el.remove());

    const segments = audioPlayer.currentAdSegments || [];
    segments.forEach(seg => {
      if (seg.start !== undefined && seg.end !== undefined && duration > 0) {
        const leftPct = (seg.start / duration) * 100;
        const widthPct = Math.max(1, ((seg.end - seg.start) / duration) * 100);

        const block = document.createElement('div');
        block.className = 'ad-segment-marker-block';
        block.style.left = `${leftPct}%`;
        block.style.width = `${widthPct}%`;
        block.title = `${seg.label} (${podcastService.formatTimeShort(seg.start)} - ${podcastService.formatTimeShort(seg.end)})`;
        scrubberBg.appendChild(block);
      }
    });
  }

  renderAdSegmentsList() {
    const list = this.container.querySelector('#player-ad-cards-list');
    const segments = audioPlayer.currentAdSegments || [];

    if (segments.length === 0) {
      list.innerHTML = `
        <div style="font-size: 12px; color: var(--text-tertiary); padding: 8px 0;">
          No sponsor segments detected in this episode.
        </div>
      `;
      return;
    }

    list.innerHTML = '';
    segments.forEach(seg => {
      const card = document.createElement('div');
      card.className = 'ad-card-item';
      card.innerHTML = `
        <div class="ad-card-info">
          <span class="ad-card-label">${seg.label || 'Sponsor Break'}</span>
          <span class="ad-card-time">
            ${podcastService.formatTimeShort(seg.start)} – ${podcastService.formatTimeShort(seg.end)}
            (${Math.round(seg.end - seg.start)}s)
          </span>
        </div>
        <button class="ad-jump-btn" id="btn-jump-${seg.id || seg.start}">
          Skip Ahead
        </button>
      `;

      card.querySelector(`#btn-jump-${seg.id || seg.start}`).addEventListener('click', () => {
        audioPlayer.seek(seg.end + 0.2);
      });

      list.appendChild(card);
    });
  }

  updateScrubber(currentTime, duration) {
    if (this.isDragging) return;

    const timeCurrent = this.container.querySelector('#player-time-current');
    const timeRemaining = this.container.querySelector('#player-time-remaining');
    const fill = this.container.querySelector('#scrubber-fill');
    const thumb = this.container.querySelector('#scrubber-thumb');

    timeCurrent.textContent = podcastService.formatTimeShort(currentTime);
    const remaining = Math.max(0, duration - currentTime);
    timeRemaining.textContent = `-${podcastService.formatTimeShort(remaining)}`;

    if (duration > 0) {
      const pct = (currentTime / duration) * 100;
      fill.style.width = `${pct}%`;
      thumb.style.left = `${pct}%`;
    }
  }
}
