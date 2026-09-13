import { audioPlayer } from '../../services/audioPlayer.js';

export class MiniPlayer {
  constructor(onExpand) {
    this.onExpand = onExpand;
    this.container = document.createElement('div');
    this.container.className = 'mini-player-container hidden';
    this.container.id = 'app-mini-player';

    this.render();
    this.initListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="mini-cover-wrapper">
        <img class="mini-cover" id="mini-cover" src="./apple-touch-icon.png" alt="Cover" />
        <div class="mini-cover-placeholder">🎙️</div>
      </div>
      <div class="mini-info">
        <div class="mini-title" id="mini-title">No episode playing</div>
        <div class="mini-subtitle">
          <span id="mini-subtitle">PodPulse</span>
          <span>•</span>
          <span class="ad-free-tag">⚡ Ad Shield</span>
        </div>
      </div>
      <div class="mini-controls">
        <button class="mini-btn skip-ad-btn" id="mini-skip-ad-btn" title="⚡ Skip Ad Break (+60s)" aria-label="Skip Ad">
          <span style="font-size: 13px; font-weight: 800; color: #fbbf24;">⚡</span>
        </button>
        <button class="mini-btn play-btn" id="mini-play-btn" aria-label="Play/Pause">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" id="mini-play-icon">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </button>
        <button class="mini-btn" id="mini-forward-btn" aria-label="Skip 30 seconds">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="13 17 18 12 13 7"/>
            <polyline points="6 17 11 12 6 7"/>
          </svg>
        </button>
      </div>
      <div class="mini-progress-bar">
        <div class="mini-progress-fill" id="mini-progress-fill"></div>
      </div>
    `;

    return this.container;
  }

  initListeners() {
    // Tapping the card (excluding controls) expands the full player sheet
    this.container.addEventListener('click', (e) => {
      if (e.target.closest('.mini-btn')) return;
      this.onExpand();
    });

    // 1-Tap Instant Skip Ad Break
    const skipAdBtn = this.container.querySelector('#mini-skip-ad-btn');
    if (skipAdBtn) {
      skipAdBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audioPlayer.skipCurrentAdBreak(60);
      });
    }

    // Play/Pause button
    const playBtn = this.container.querySelector('#mini-play-btn');
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      audioPlayer.togglePlay();
    });

    // Skip 30s
    const forwardBtn = this.container.querySelector('#mini-forward-btn');
    forwardBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      audioPlayer.skip(30);
    });

    // Listen to audioPlayer state changes
    audioPlayer.on('stateChange', () => {
      this.updateUI();
    });

    audioPlayer.on('timeUpdate', ({ currentTime, duration }) => {
      if (duration > 0) {
        const pct = (currentTime / duration) * 100;
        const fill = this.container.querySelector('#mini-progress-fill');
        if (fill) fill.style.width = `${pct}%`;
      }
    });
  }

  updateUI() {
    const episode = audioPlayer.currentEpisode;
    const podcast = audioPlayer.currentPodcast;

    if (!episode) {
      this.container.classList.add('hidden');
      return;
    }

    this.container.classList.remove('hidden');

    const cover = this.container.querySelector('#mini-cover');
    const title = this.container.querySelector('#mini-title');
    const subtitle = this.container.querySelector('#mini-subtitle');
    const playIcon = this.container.querySelector('#mini-play-icon');

    if (cover) {
      const rawCover = podcast?.cover || episode?.cover;
      const safeUrl = audioPlayer.getSafeArtworkUrl(rawCover);
      delete cover.dataset.triedProxy;
      cover.src = safeUrl;
      cover.onerror = () => {
        if (!cover.dataset.triedProxy && safeUrl.startsWith('http')) {
          cover.dataset.triedProxy = 'true';
          cover.src = `https://images.weserv.nl/?url=${encodeURIComponent(safeUrl)}&w=120&h=120&fit=cover`;
        } else {
          cover.src = new URL('./apple-touch-icon.png', window.location.href).href;
        }
      };
    }

    if (title) title.textContent = episode.title;
    if (subtitle) subtitle.textContent = podcast?.title || 'Podcast';

    if (playIcon) {
      if (audioPlayer.isPlaying) {
        playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
      } else {
        playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
      }
    }
  }
}
