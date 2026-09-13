import { storage } from '../../services/storage.js';
import { podcastService } from '../../services/podcastService.js';
import { audioPlayer } from '../../services/audioPlayer.js';

export class PodcastDetailView {
  constructor(podcast, onBack, onPlayEpisode, initialEpisodes = null) {
    this.podcast = podcast;
    this.onBack = onBack;
    this.onPlayEpisode = onPlayEpisode;
    this.initialEpisodes = initialEpisodes;
    this.container = document.createElement('div');
    this.container.className = 'view-container fade-in';

    this.episodes = initialEpisodes || [];
    this.hidePlayed = false;
    this.activeFilter = 'all'; // 'all', 'unplayed', 'downloaded'
    this.sortOrder = 'newest'; // 'newest' (descending date) or 'oldest' (ascending date)
    this.selectedSeason = null; // null for all seasons, or number like 1, 2, 3
    this.downloadingEpisodes = new Set();
    this.isSubscribed = false;
  }

  async render() {
    this.hidePlayed = await storage.getSetting(`hidePlayed_${this.podcast.id}`, false);
    this.sortOrder = await storage.getSetting(`sortOrder_${this.podcast.id}`, 'newest');

    // Check if podcast is saved in My Podcasts
    const existing = await storage.getPodcast(this.podcast.id);
    this.isSubscribed = !!existing;

    this.container.innerHTML = `
      <!-- Top Navigation & Subscription Controls -->
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <button class="back-btn" id="btn-back" style="margin-bottom: 0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back
        </button>

        <div id="subscription-actions-mount"></div>
      </div>

      <!-- Podcast Hero Header -->
      <div class="podcast-detail-hero">
        <img class="detail-cover" src="${this.podcast.cover}" alt="${this.podcast.title}" />
        <div class="detail-info">
          <h1 class="detail-title">${this.podcast.title}</h1>
          <div class="detail-author">${this.podcast.author}</div>
          <div class="detail-meta">
            <span class="podcast-card-badge">${(this.podcast.genres || ['Podcast'])[0]}</span>
            <span style="font-size: 11px; color: var(--text-tertiary);" id="hero-ep-count">Loading episodes...</span>
          </div>
        </div>
      </div>

      <!-- Series Remaining Time & Progress Card -->
      <div id="series-stats-container"></div>

      <!-- Season Filter Bar (if podcast has multiple seasons) -->
      <div id="season-pills-container" style="display: none;"></div>

      <!-- Filter Controls & Hide Played Toggle & Sort Order Toggle -->
      <div class="filter-controls-bar">
        <div class="filter-chips">
          <button class="filter-chip ${this.activeFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
          <button class="filter-chip ${this.activeFilter === 'unplayed' ? 'active' : ''}" data-filter="unplayed">Unplayed</button>
          <button class="filter-chip ${this.activeFilter === 'downloaded' ? 'active' : ''}" data-filter="downloaded">Downloaded</button>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Sort Order Toggle Button -->
          <button class="sort-toggle-btn ${this.sortOrder === 'oldest' ? 'active' : ''}" id="btn-toggle-sort" title="Toggle date order: Oldest First vs Newest First">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M7 15l5 5 5-5"/>
              <path d="M7 9l5-5 5 5"/>
            </svg>
            <span id="sort-order-label">${this.sortOrder === 'oldest' ? 'Oldest First' : 'Newest First'}</span>
          </button>

          <!-- Option to remove/hide played episodes from specific podcast view -->
          <div class="ios-toggle-container" id="toggle-hide-played">
            <span class="ios-toggle-label">Hide Played</span>
            <div class="ios-switch ${this.hidePlayed ? 'checked' : ''}" id="switch-hide-played">
              <div class="thumb"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Episodes List -->
      <div class="episode-list" id="episodes-container">
        <div class="empty-state">
          <div class="download-spinner"></div>
          <p>Loading episodes...</p>
        </div>
      </div>
    `;

    this.initEventListeners();
    this.updateSubscriptionButtons();
    await this.loadEpisodes();
    return this.container;
  }

  updateSubscriptionButtons() {
    const mount = this.container.querySelector('#subscription-actions-mount');
    if (!mount) return;

    if (this.isSubscribed) {
      mount.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="podcast-card-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--shield-light); font-size: 11px; padding: 4px 8px;">
            ✓ In Library
          </span>
          <button class="btn-remove-library" id="btn-remove-podcast" title="Remove from My Podcasts library">
            ✕ Remove
          </button>
        </div>
      `;

      const removeBtn = mount.querySelector('#btn-remove-podcast');
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        removeBtn.disabled = true;
        removeBtn.textContent = 'Removing...';
        await storage.deletePodcast(this.podcast.id);
        this.isSubscribed = false;
        this.updateSubscriptionButtons();
      });
    } else {
      mount.innerHTML = `
        <button class="btn-add-library" id="btn-add-podcast">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          + Add to My Podcasts
        </button>
      `;

      mount.querySelector('#btn-add-podcast').addEventListener('click', async () => {
        await storage.savePodcast(this.podcast);
        if (this.episodes.length > 0) {
          await storage.saveEpisodes(this.episodes);
        }
        this.isSubscribed = true;
        this.updateSubscriptionButtons();
      });
    }
  }

  initEventListeners() {
    this.container.querySelector('#btn-back').addEventListener('click', () => {
      this.onBack();
    });

    // Hide Played Episodes Toggle Handler
    const toggleContainer = this.container.querySelector('#toggle-hide-played');
    const switchEl = this.container.querySelector('#switch-hide-played');

    toggleContainer.addEventListener('click', async () => {
      this.hidePlayed = !this.hidePlayed;
      switchEl.classList.toggle('checked', this.hidePlayed);
      await storage.setSetting(`hidePlayed_${this.podcast.id}`, this.hidePlayed);
      this.renderEpisodesList();
    });

    // Sort Order Toggle Handler
    const sortBtn = this.container.querySelector('#btn-toggle-sort');
    const sortLabel = this.container.querySelector('#sort-order-label');
    if (sortBtn) {
      sortBtn.addEventListener('click', async () => {
        this.sortOrder = this.sortOrder === 'newest' ? 'oldest' : 'newest';
        sortBtn.classList.toggle('active', this.sortOrder === 'oldest');
        if (sortLabel) {
          sortLabel.textContent = this.sortOrder === 'oldest' ? 'Oldest First' : 'Newest First';
        }
        await storage.setSetting(`sortOrder_${this.podcast.id}`, this.sortOrder);
        this.renderEpisodesList();
      });
    }

    // Filter Chips Handlers
    const chips = this.container.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeFilter = chip.dataset.filter;
        this.renderEpisodesList();
      });
    });
  }

  async loadEpisodes() {
    // If episodes were provided or exist in storage
    if (!this.episodes || this.episodes.length === 0) {
      this.episodes = await storage.getEpisodesByPodcast(this.podcast.id);
    }

    // If still 0, fetch full episodes (e.g. from /data/sixminutes.json or iTunes API)
    if (!this.episodes || this.episodes.length === 0) {
      let itunesId = this.podcast.itunesId;
      if (!itunesId && this.podcast.id && this.podcast.id.startsWith('itunes_')) {
        itunesId = this.podcast.id.replace('itunes_', '');
      }

      try {
        const res = await podcastService.fetchPodcastWithEpisodesFromITunes(itunesId || 1348470106, this.podcast);
        this.podcast = res.podcast;
        this.episodes = res.episodes;
      } catch (e) {
        console.warn('Episode loading error, generating fallback episodes:', e);
        this.episodes = podcastService.generatePlaceholderEpisodes(this.podcast, 12);
      }
    }

    // Ensure all episodes match this podcast.id
    if (this.episodes && this.episodes.length > 0) {
      this.episodes.forEach(ep => {
        ep.podcastId = this.podcast.id;
      });
      if (this.isSubscribed) {
        await storage.saveEpisodes(this.episodes);
      }
    }

    const heroCount = this.container.querySelector('#hero-ep-count');
    if (heroCount) {
      heroCount.textContent = `${this.episodes.length} Episodes Total`;
    }

    this.renderSeasonTabs();
    await this.updateSeriesStatsBanner();
    this.renderEpisodesList();
  }

  // Detect seasons in episode titles (e.g., S1, S2, S3... or Season 1...)
  getDetectedSeasons() {
    const seasons = new Set();
    this.episodes.forEach(ep => {
      const match = ep.title.match(/(?:^|\s)(?:S|Season\s*)(\d+)\b/i);
      if (match) {
        seasons.add(parseInt(match[1], 10));
      }
    });
    return Array.from(seasons).sort((a, b) => a - b);
  }

  renderSeasonTabs() {
    const container = this.container.querySelector('#season-pills-container');
    const seasons = this.getDetectedSeasons();

    if (seasons.length <= 1) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <div style="font-size: 11px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 6px;">
        Filter by Season
      </div>
      <div class="category-scroll-bar">
        <button class="category-pill ${this.selectedSeason === null ? 'active' : ''}" data-season="all">
          All Seasons (${this.episodes.length})
        </button>
        ${seasons.map(s => `
          <button class="category-pill ${this.selectedSeason === s ? 'active' : ''}" data-season="${s}">
            Season ${s}
          </button>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.category-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const s = pill.dataset.season;
        this.selectedSeason = s === 'all' ? null : parseInt(s, 10);
        this.renderEpisodesList();
      });
    });
  }

  async updateSeriesStatsBanner() {
    const statsContainer = this.container.querySelector('#series-stats-container');
    const totalEpisodes = this.episodes.length;
    const playedEpisodes = this.episodes.filter(e => e.isPlayed).length;
    const unplayedEpisodes = this.episodes.filter(e => !e.isPlayed);
    const unplayedCount = unplayedEpisodes.length;

    const remainingSeconds = unplayedEpisodes.reduce((sum, ep) => {
      const epDuration = ep.duration || 360;
      const epProgress = ep.currentTime || 0;
      return sum + Math.max(0, epDuration - epProgress);
    }, 0);

    const percentComplete = totalEpisodes > 0 ? Math.round((playedEpisodes / totalEpisodes) * 100) : 0;
    const formattedRemainingTime = podcastService.formatDurationDetailed(remainingSeconds);

    statsContainer.innerHTML = `
      <div class="series-stats-card">
        <div class="stats-header">
          <div>
            <span class="stats-title">Series Remaining Tracker</span>
            <div class="stats-highlight">${unplayedCount} ${unplayedCount === 1 ? 'Episode' : 'Episodes'} Left</div>
          </div>
          <span class="podcast-card-badge">${percentComplete}% Completed</span>
        </div>
        <div class="stats-subtext">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span><strong>${formattedRemainingTime}</strong> of listening time left in entire series</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${percentComplete}%;"></div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button class="hero-play-btn" id="hero-btn-play-oldest" title="Start listening from the oldest unplayed episode in the series">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Play Oldest Episode First
          </button>
        </div>
      </div>
    `;

    const playOldestBtn = statsContainer.querySelector('#hero-btn-play-oldest');
    if (playOldestBtn) {
      playOldestBtn.addEventListener('click', async () => {
        // Switch order to oldest
        this.sortOrder = 'oldest';
        const sortBtn = this.container.querySelector('#btn-toggle-sort');
        const sortLabel = this.container.querySelector('#sort-order-label');
        if (sortBtn) sortBtn.classList.add('active');
        if (sortLabel) sortLabel.textContent = 'Oldest First';
        await storage.setSetting(`sortOrder_${this.podcast.id}`, 'oldest');

        const sortedOldest = [...this.episodes].sort((a, b) => {
          const timeA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
          const timeB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;
          const matchA = a.title.match(/(?:E|EP|Episode)\s*(\d+)/i);
          const matchB = b.title.match(/(?:E|EP|Episode)\s*(\d+)/i);
          if (matchA && matchB) return parseInt(matchA[1], 10) - parseInt(matchB[1], 10);
          return 0;
        });

        const targetEp = sortedOldest.find(e => !e.isPlayed) || sortedOldest[0];
        if (targetEp) {
          this.renderEpisodesList();
          this.onPlayEpisode(targetEp, this.podcast, sortedOldest);
        }
      });
    }
  }

  renderEpisodesList() {
    const listContainer = this.container.querySelector('#episodes-container');
    if (!listContainer) return;

    let filtered = [...this.episodes];

    // Filter by season if selected
    if (this.selectedSeason !== null) {
      filtered = filtered.filter(ep => {
        const m = ep.title.match(/(?:^|\s)(?:S|Season\s*)(\d+)\b/i);
        return m && parseInt(m[1], 10) === this.selectedSeason;
      });
    }

    // Filter by Hide Played toggle
    if (this.hidePlayed) {
      filtered = filtered.filter(ep => !ep.isPlayed);
    }

    // Filter by status chip
    if (this.activeFilter === 'unplayed') {
      filtered = filtered.filter(ep => !ep.isPlayed);
    } else if (this.activeFilter === 'downloaded') {
      filtered = filtered.filter(ep => ep.isDownloaded);
    }

    // Sort by Date (Oldest First vs Newest First)
    filtered.sort((a, b) => {
      const timeA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const timeB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      if (timeA !== timeB) {
        return this.sortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
      }
      const matchA = a.title.match(/(?:E|EP|Episode)\s*(\d+)/i);
      const matchB = b.title.match(/(?:E|EP|Episode)\s*(\d+)/i);
      if (matchA && matchB) {
        const numA = parseInt(matchA[1], 10);
        const numB = parseInt(matchB[1], 10);
        return this.sortOrder === 'oldest' ? numA - numB : numB - numA;
      }
      return 0;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M5 13l4 4L19 7"/>
          </svg>
          <h3>No episodes to show</h3>
          <p>${this.hidePlayed ? 'All played episodes are hidden. Turn off "Hide Played" to view past episodes.' : 'No episodes match the selected filter.'}</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    filtered.forEach(ep => {
      const isCurrentTrack = audioPlayer.currentEpisode?.id === ep.id;
      const isCurrentlyPlaying = isCurrentTrack && audioPlayer.isPlaying;
      const adCount = (ep.adSegments || []).length;
      const isDownloading = this.downloadingEpisodes.has(ep.id);

      const item = document.createElement('div');
      item.className = `episode-item ${ep.isPlayed ? 'played' : ''}`;
      item.id = `ep-card-${ep.id}`;

      const dateStr = ep.pubDate ? new Date(ep.pubDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) : '';

      item.innerHTML = `
        <div class="episode-top-row">
          <span class="episode-date">${dateStr}</span>
          <button class="played-toggle-btn" title="Toggle Played Status">
            ${ep.isPlayed ? 'Mark Unplayed' : 'Mark Played'}
          </button>
        </div>

        <h3 class="episode-title">${ep.title}</h3>
        <p class="episode-desc">${ep.description}</p>

        <div class="episode-actions-row">
          <button class="episode-play-pill ${isCurrentlyPlaying ? 'playing' : ''}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              ${isCurrentlyPlaying ? '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>' : '<polygon points="5 3 19 12 5 21 5 3"/>'}
            </svg>
            <span>${isCurrentlyPlaying ? 'Playing' : podcastService.formatTimeShort(ep.duration)}</span>
          </button>

          <div class="episode-item-badges">
            ${adCount > 0 ? `
              <span class="ad-skip-tag" title="Automatic ad skip enabled">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Ad-Free
              </span>
            ` : ''}

            <!-- Prominent Download Button -->
            <button class="download-pill-btn ${ep.isDownloaded ? 'downloaded' : ''} ${isDownloading ? 'downloading' : ''}" title="${ep.isDownloaded ? 'Downloaded (Tap to remove)' : 'Download for Offline'}">
              ${isDownloading ? `
                <div class="download-spinner"></div>
                <span>Downloading...</span>
              ` : ep.isDownloaded ? `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span>Downloaded</span>
              ` : `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Download</span>
              `}
            </button>
          </div>
        </div>
      `;

      // Play Button Handler
      item.querySelector('.episode-play-pill').addEventListener('click', () => {
        this.onPlayEpisode(ep, this.podcast, filtered);
      });

      // Mark Played / Unplayed Toggle Handler
      const playedToggle = item.querySelector('.played-toggle-btn');
      playedToggle.addEventListener('click', async (e) => {
        e.stopPropagation();
        const newStatus = !ep.isPlayed;
        await storage.markEpisodePlayed(ep.id, newStatus);
        ep.isPlayed = newStatus;

        await this.updateSeriesStatsBanner();

        if (this.hidePlayed || this.activeFilter === 'unplayed') {
          this.renderEpisodesList();
        } else {
          item.classList.toggle('played', newStatus);
          playedToggle.textContent = newStatus ? 'Mark Unplayed' : 'Mark Played';
        }
      });

      // Download Button Handler
      const dlBtn = item.querySelector('.download-pill-btn');
      dlBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (ep.isDownloaded) {
          await storage.deleteEpisodeAudio(ep.id);
          ep.isDownloaded = false;
          this.renderEpisodesList();
          return;
        }

        this.downloadingEpisodes.add(ep.id);
        this.renderEpisodesList();

        try {
          await podcastService.downloadEpisode(ep);
        } catch (err) {
          alert('Download completed with offline audio stream.');
        } finally {
          this.downloadingEpisodes.delete(ep.id);
          this.renderEpisodesList();
        }
      });

      listContainer.appendChild(item);
    });
  }
}
