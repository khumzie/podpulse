import { storage } from '../../services/storage.js';
import { podcastService } from '../../services/podcastService.js';

export class LibraryView {
  constructor(onSelectPodcast) {
    this.onSelectPodcast = onSelectPodcast;
    this.container = document.createElement('div');
    this.container.className = 'view-container fade-in';
  }

  async render() {
    this.container.innerHTML = `
      <div class="view-title-row">
        <div>
          <h1 class="view-title">My Podcasts</h1>
          <p class="view-subtitle">Your subscribed shows & series progress</p>
        </div>
      </div>
      <div id="series-hero-container"></div>
      <div class="podcast-grid" id="podcasts-grid">
        <div class="empty-state">
          <div class="download-spinner"></div>
          <p>Loading podcasts...</p>
        </div>
      </div>
    `;

    await this.loadData();
    return this.container;
  }

  async loadData() {
    const podcasts = await storage.getAllPodcasts();
    const heroContainer = this.container.querySelector('#series-hero-container');
    const gridContainer = this.container.querySelector('#podcasts-grid');

    if (podcasts.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"/>
          </svg>
          <h3>No podcasts subscribed yet</h3>
          <p>Explore the Discover tab or search to add your favorite shows.</p>
        </div>
      `;
      heroContainer.innerHTML = '';
      return;
    }

    // Pick top podcast for Series Progress Hero Banner
    const topPodcast = podcasts[0];
    const stats = await podcastService.getPodcastSeriesStats(topPodcast.id);

    heroContainer.innerHTML = `
      <div class="series-stats-card" id="hero-card-${topPodcast.id}">
        <div class="stats-header">
          <div>
            <span class="stats-title">Featured Series Tracker</span>
            <div class="stats-highlight">${stats.unplayedCount} ${stats.unplayedCount === 1 ? 'Episode' : 'Episodes'} Left</div>
          </div>
          <span class="podcast-card-badge">${stats.percentComplete}% Finished</span>
        </div>
        <div class="stats-subtext">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span><strong>${stats.formattedRemainingTime}</strong> remaining in <em>${topPodcast.title}</em></span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${stats.percentComplete}%;"></div>
        </div>
      </div>
    `;

    // Add click handler to hero card
    heroContainer.querySelector('.series-stats-card')?.addEventListener('click', () => {
      this.onSelectPodcast(topPodcast);
    });

    // Render Grid of Podcasts
    gridContainer.innerHTML = '';
    for (const pod of podcasts) {
      const podStats = await podcastService.getPodcastSeriesStats(pod.id);
      const card = document.createElement('div');
      card.className = 'podcast-card';
      card.innerHTML = `
        <div style="position: relative;">
          <img class="podcast-card-cover" src="${pod.cover}" alt="${pod.title}" loading="lazy"/>
          <button class="card-action-overlay-btn card-remove-btn" title="Remove from library">
            ✕
          </button>
        </div>
        <div class="podcast-card-title">${pod.title}</div>
        <div class="podcast-card-author">${pod.author || ''}</div>
        <div class="podcast-card-badge">
          ${podStats.unplayedCount} left
        </div>
      `;

      // Quick Remove Button (instant deletion, no blocking confirm)
      const removeBtn = card.querySelector('.card-remove-btn');
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        card.style.transition = 'all 0.18s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.8)';
        await storage.deletePodcast(pod.id);
        setTimeout(() => {
          this.loadData();
        }, 180);
      });

      card.addEventListener('click', () => {
        this.onSelectPodcast(pod);
      });
      gridContainer.appendChild(card);
    }
  }
}
