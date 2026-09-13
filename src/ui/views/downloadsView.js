import { storage } from '../../services/storage.js';
import { podcastService } from '../../services/podcastService.js';
import { audioPlayer } from '../../services/audioPlayer.js';

export class DownloadsView {
  constructor(onPlayEpisode) {
    this.onPlayEpisode = onPlayEpisode;
    this.container = document.createElement('div');
    this.container.className = 'view-container fade-in';
    this.isSimulatingOffline = false;
  }

  async render() {
    this.container.innerHTML = `
      <div class="view-title-row">
        <div>
          <h1 class="view-title">Offline Vault</h1>
          <p class="view-subtitle">Downloaded episodes available without internet</p>
        </div>
      </div>

      <!-- Storage & Offline Status Card -->
      <div class="series-stats-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%); border-color: rgba(16, 185, 129, 0.3);">
        <div class="stats-header">
          <div>
            <span class="stats-title" style="color: var(--shield-light);">IndexedDB Offline Storage</span>
            <div class="stats-highlight" id="storage-used-label">0.0 MB Used</div>
          </div>
          <button id="clear-all-downloads-btn" class="played-toggle-btn" style="color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 10px;">
            Clear All
          </button>
        </div>
        <div class="stats-subtext">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span id="download-count-label">0 episodes downloaded</span>
        </div>

        <!-- Offline Mode Simulator Toggle -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
          <div>
            <div style="font-size: 13px; font-weight: 700; color: #ffffff;">Simulate Offline Mode</div>
            <div style="font-size: 11px; color: var(--text-secondary);">Test playing downloaded files without internet</div>
          </div>
          <div class="ios-switch" id="switch-simulate-offline">
            <div class="thumb"></div>
          </div>
        </div>
      </div>

      <!-- Downloaded Episodes List -->
      <div class="episode-list" id="downloaded-episodes-container">
        <div class="empty-state">
          <div class="download-spinner"></div>
          <p>Loading downloads...</p>
        </div>
      </div>
    `;

    this.initEventListeners();
    await this.loadDownloadedEpisodes();
    return this.container;
  }

  initEventListeners() {
    // Offline simulation switch
    const offlineSwitch = this.container.querySelector('#switch-simulate-offline');
    offlineSwitch.addEventListener('click', () => {
      this.isSimulatingOffline = !this.isSimulatingOffline;
      offlineSwitch.classList.toggle('checked', this.isSimulatingOffline);

      const banner = document.getElementById('offline-banner');
      if (banner) {
        banner.classList.toggle('hidden', !this.isSimulatingOffline && navigator.onLine);
        if (this.isSimulatingOffline) {
          banner.textContent = '⚡ Airplane Mode (Offline Simulation) Active — Playing from Local Blobs';
        } else {
          banner.textContent = 'Offline Mode — Playing from local downloads';
        }
      }
    });

    // Clear All Downloads
    const clearBtn = this.container.querySelector('#clear-all-downloads-btn');
    clearBtn.addEventListener('click', async () => {
      if (confirm('Delete all offline downloaded episodes to free device storage?')) {
        const audios = await storage.getAllDownloadedAudios();
        for (const item of audios) {
          await storage.deleteEpisodeAudio(item.episodeId);
        }
        await this.loadDownloadedEpisodes();
      }
    });
  }

  async loadDownloadedEpisodes() {
    const listContainer = this.container.querySelector('#downloaded-episodes-container');
    const storageLabel = this.container.querySelector('#storage-used-label');
    const countLabel = this.container.querySelector('#download-count-label');

    const allEpisodes = await storage.getAllEpisodes();
    const downloaded = allEpisodes.filter(e => e.isDownloaded);

    // Calculate total bytes
    const totalBytes = await storage.getTotalStorageUsage();
    const mbUsed = (totalBytes / (1024 * 1024)).toFixed(1);
    storageLabel.textContent = `${mbUsed} MB Used`;
    countLabel.textContent = `${downloaded.length} episode${downloaded.length === 1 ? '' : 's'} downloaded`;

    if (downloaded.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          <h3>No offline downloads yet</h3>
          <p>Tap the download icon on any episode to save it for listening without internet.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    for (const ep of downloaded) {
      const podcast = await storage.getPodcast(ep.podcastId);
      const item = document.createElement('div');
      item.className = 'episode-item';
      const isCurrentTrack = audioPlayer.currentEpisode?.id === ep.id;
      const isCurrentlyPlaying = isCurrentTrack && audioPlayer.isPlaying;

      item.innerHTML = `
        <div class="episode-top-row">
          <span class="episode-date" style="color: var(--shield-light);">✓ Offline Ready</span>
          <button class="played-toggle-btn" style="color: #f87171;" id="delete-dl-${ep.id}">
            Delete
          </button>
        </div>

        <h3 class="episode-title">${ep.title}</h3>
        <p class="episode-desc">${podcast ? podcast.title : 'Podcast'}</p>

        <div class="episode-actions-row">
          <button class="episode-play-pill ${isCurrentlyPlaying ? 'playing' : ''}" id="play-dl-${ep.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              ${isCurrentlyPlaying ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>' : '<polygon points="5 3 19 12 5 21 5 3"/>'}
            </svg>
            <span>${isCurrentlyPlaying ? 'Playing' : 'Play Offline'}</span>
          </button>

          <span class="ad-skip-tag">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Ad-Free
          </span>
        </div>
      `;

      item.querySelector(`#play-dl-${ep.id}`).addEventListener('click', () => {
        this.onPlayEpisode(ep, podcast || { title: 'Downloaded Show', cover: '/icon.svg' });
      });

      item.querySelector(`#delete-dl-${ep.id}`).addEventListener('click', async () => {
        await storage.deleteEpisodeAudio(ep.id);
        await this.loadDownloadedEpisodes();
      });

      listContainer.appendChild(item);
    }
  }
}
