import { storage } from '../../services/storage.js';
import { podcastService, SEED_PODCASTS } from '../../services/podcastService.js';

export const CATEGORIES = [
  { id: 'trending', label: '🔥 Trending', query: null },
  { id: 'kids', label: '👶 Kids & Family', query: 'Kids & Family' },
  { id: 'fiction', label: '📚 Fiction & Stories', query: 'Fiction Audio Drama' },
  { id: 'crime', label: '🔪 True Crime', query: 'True Crime' },
  { id: 'tech', label: '💻 Technology', query: 'Technology' },
  { id: 'comedy', label: '🎙️ Comedy', query: 'Comedy' },
  { id: 'news', label: '📰 News & Politics', query: 'News' },
  { id: 'science', label: '🔬 Science', query: 'Science' },
  { id: 'health', label: '💪 Health & Fitness', query: 'Health' },
  { id: 'business', label: '💼 Business', query: 'Business' }
];

export class DiscoverView {
  constructor(onSelectPodcast) {
    this.onSelectPodcast = onSelectPodcast;
    this.container = document.createElement('div');
    this.container.className = 'view-container fade-in';
    this.activeCategory = 'trending';
  }

  async render() {
    this.container.innerHTML = `
      <div class="view-title-row">
        <div>
          <h1 class="view-title">Discover</h1>
          <p class="view-subtitle">Browse categories, search shows, or import RSS</p>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="search-input-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="search" id="podcast-search-input" class="search-input" placeholder="Search podcasts (e.g. Six Minutes, Huberman...)" autocomplete="off" />
      </div>

      <!-- Category Filter Pills (Horizontal Scroll) -->
      <div class="category-scroll-bar" id="category-pills-bar">
        ${CATEGORIES.map(cat => `
          <button class="category-pill ${cat.id === this.activeCategory ? 'active' : ''}" data-cat-id="${cat.id}">
            ${cat.label}
          </button>
        `).join('')}
      </div>

      <!-- Custom RSS Feed Importer Box -->
      <div class="shield-settings-list" style="padding: 12px 14px; background: rgba(255,255,255,0.03);">
        <div style="font-size: 12.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">
          Import via Custom RSS Feed URL
        </div>
        <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">
          Paste any RSS feed URL (Substack, Buzzsprout, Libsyn) to add:
        </p>
        <div style="display: flex; gap: 8px;">
          <input type="url" id="rss-feed-input" class="search-input" style="padding-left: 12px; height: 36px; font-size: 12px;" placeholder="https://feeds.example.com/podcast.rss" />
          <button id="rss-import-btn" class="empty-state-btn" style="padding: 6px 14px; margin: 0; white-space: nowrap; font-size: 11.5px;">
            Import
          </button>
        </div>
      </div>

      <!-- Grid Header & 3x3 Compact Grid -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h2 style="font-size: 16px; font-weight: 800;" id="discover-section-title">
            Trending Series
          </h2>
          <span style="font-size: 11px; color: var(--text-tertiary);" id="discover-count-badge">Popular</span>
        </div>
        <div class="podcast-grid" id="discover-grid"></div>
      </div>
    `;

    this.initEventListeners();
    this.renderCuratedList();
    return this.container;
  }

  initEventListeners() {
    const searchInput = this.container.querySelector('#podcast-search-input');
    let debounceTimer = null;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();
      if (!query) {
        this.selectCategory(this.activeCategory);
        return;
      }

      debounceTimer = setTimeout(() => {
        this.performSearch(query);
      }, 400);
    });

    // Category Pill Clicks
    const pills = this.container.querySelectorAll('.category-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const catId = pill.dataset.catId;
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeCategory = catId;
        this.selectCategory(catId);
      });
    });

    // Custom RSS Feed Import
    const importBtn = this.container.querySelector('#rss-import-btn');
    const rssInput = this.container.querySelector('#rss-feed-input');

    importBtn.addEventListener('click', async () => {
      const url = rssInput.value.trim();
      if (!url) return;

      importBtn.disabled = true;
      importBtn.textContent = 'Importing...';

      try {
        const { podcast, episodes } = await podcastService.fetchAndParseFeed(url);
        await storage.savePodcast(podcast);
        await storage.saveEpisodes(episodes);
        rssInput.value = '';
        this.onSelectPodcast(podcast);
      } catch (err) {
        alert('Could not import RSS feed: ' + (err.message || 'Check URL and try again.'));
      } finally {
        importBtn.disabled = false;
        importBtn.textContent = 'Import';
      }
    });
  }

  async selectCategory(catId) {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (!cat) return;

    if (!cat.query) {
      // Trending / Curated default
      this.renderCuratedList();
      return;
    }

    const grid = this.container.querySelector('#discover-grid');
    const title = this.container.querySelector('#discover-section-title');
    const badge = this.container.querySelector('#discover-count-badge');
    if (!grid) return;

    title.textContent = cat.label;
    badge.textContent = 'Top Shows';
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="download-spinner"></div>
        <p>Loading ${cat.label} podcasts...</p>
      </div>
    `;

    const results = await podcastService.searchPodcasts(cat.query);
    this.renderPodcastCards(results, grid);
  }

  renderCuratedList() {
    const grid = this.container.querySelector('#discover-grid');
    const title = this.container.querySelector('#discover-section-title');
    const badge = this.container.querySelector('#discover-count-badge');
    if (!grid) return;

    title.textContent = 'Trending Series';
    badge.textContent = `${SEED_PODCASTS.length} Featured`;
    this.renderPodcastCards(SEED_PODCASTS, grid);
  }

  async performSearch(query) {
    const grid = this.container.querySelector('#discover-grid');
    const title = this.container.querySelector('#discover-section-title');
    const badge = this.container.querySelector('#discover-count-badge');
    if (!grid) return;

    title.textContent = `Results: "${query}"`;
    badge.textContent = 'Searching...';
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="download-spinner"></div>
        <p>Searching iTunes directory...</p>
      </div>
    `;

    const results = await podcastService.searchPodcasts(query);
    badge.textContent = `${results.length} found`;

    if (results.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>No podcasts found matching "${query}". Try another term or paste an RSS feed URL above.</p>
        </div>
      `;
      return;
    }

    this.renderPodcastCards(results, grid);
  }

  async renderPodcastCards(podcastsList, grid) {
    grid.innerHTML = '';
    for (const pod of podcastsList) {
      const isSaved = !!(await storage.getPodcast(pod.id));
      const card = document.createElement('div');
      card.className = 'podcast-card';
      card.innerHTML = `
        <div style="position: relative;">
          <img class="podcast-card-cover" src="${pod.cover}" alt="${pod.title}" loading="lazy" />
          <button class="card-action-overlay-btn card-add-btn ${isSaved ? 'added' : ''}" id="add-btn-${pod.id}" title="${isSaved ? 'In Library' : 'Add to My Podcasts'}">
            ${isSaved ? '✓' : '+'}
          </button>
        </div>
        <div class="podcast-card-title">${pod.title}</div>
        <div class="podcast-card-author">${pod.author || ''}</div>
        <div class="podcast-card-badge">${(pod.genres || [])[0] || 'Podcast'}</div>
      `;

      // 1-Tap Quick Add/Remove Library Button
      const addBtn = card.querySelector('.card-add-btn');
      addBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (addBtn.classList.contains('added')) {
          await storage.deletePodcast(pod.id);
          addBtn.classList.remove('added');
          addBtn.textContent = '+';
          addBtn.title = 'Add to My Podcasts';
          return;
        }

        addBtn.innerHTML = '<div class="download-spinner" style="width:10px;height:10px;"></div>';
        try {
          let podcastData = pod;
          let episodesData = [];
          if (pod.itunesId) {
            const res = await podcastService.fetchPodcastWithEpisodesFromITunes(pod.itunesId, pod);
            podcastData = res.podcast;
            episodesData = res.episodes;
          } else if (pod.episodes) {
            episodesData = pod.episodes;
          } else {
            episodesData = podcastService.generatePlaceholderEpisodes(pod, 6);
          }

          await storage.savePodcast(podcastData);
          if (episodesData && episodesData.length > 0) {
            await storage.saveEpisodes(episodesData);
          }
          addBtn.classList.add('added');
          addBtn.textContent = '✓';
          addBtn.title = 'In Library';
        } catch (err) {
          addBtn.textContent = '+';
          console.error('Error adding podcast:', err);
        }
      });

      // Card Click: Open Details
      card.addEventListener('click', async () => {
        card.style.opacity = '0.6';
        card.style.pointerEvents = 'none';
        const badgeEl = card.querySelector('.podcast-card-badge');
        if (badgeEl) badgeEl.textContent = 'Loading...';

        try {
          let podcastData = pod;
          let episodesData = [];

          if (pod.itunesId) {
            const result = await podcastService.fetchPodcastWithEpisodesFromITunes(pod.itunesId, pod);
            podcastData = result.podcast;
            episodesData = result.episodes;
          } else if (pod.episodes) {
            episodesData = pod.episodes;
          } else if (pod.feedUrl) {
            try {
              const result = await podcastService.fetchAndParseFeed(pod.feedUrl);
              podcastData = result.podcast;
              episodesData = result.episodes;
            } catch (feedErr) {
              episodesData = podcastService.generatePlaceholderEpisodes(pod, 6);
            }
          } else {
            episodesData = podcastService.generatePlaceholderEpisodes(pod, 6);
          }

          await this.onSelectPodcast(podcastData, episodesData);
        } catch (err) {
          console.error('Error opening podcast:', err);
          alert('Could not load episodes for this podcast: ' + (err.message || 'Please try again.'));
        } finally {
          card.style.opacity = '1';
          card.style.pointerEvents = 'auto';
          if (badgeEl) badgeEl.textContent = (pod.genres || [])[0] || 'Podcast';
        }
      });

      grid.appendChild(card);
    }
  }
}

