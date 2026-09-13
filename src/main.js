import './styles/index.css';
import './styles/components.css';
import './styles/player.css';

import { storage } from './services/storage.js';
import { podcastService } from './services/podcastService.js';
import { audioPlayer } from './services/audioPlayer.js';

import { LibraryView } from './ui/views/libraryView.js';
import { PodcastDetailView } from './ui/views/podcastDetailView.js';
import { DiscoverView } from './ui/views/discoverView.js';
import { DownloadsView } from './ui/views/downloadsView.js';
import { AdShieldView } from './ui/views/adShieldView.js';

import { MiniPlayer } from './ui/components/miniPlayer.js';
import { PlayerModal } from './ui/components/playerModal.js';
import { IosInstallPrompt } from './ui/components/iosInstallPrompt.js';

class App {
  constructor() {
    this.viewport = document.getElementById('main-viewport');
    this.currentTab = 'library';
    this.currentView = null;

    this.miniPlayer = null;
    this.playerModal = null;
    this.installPrompt = null;

    this.init();
  }

  async init() {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      try {
        await navigator.serviceWorker.register('./sw.js');
        console.log('PodPulse Service Worker registered.');
      } catch (err) {
        console.warn('Service worker registration failed:', err);
      }
    }

    // Initialize UI Components
    this.playerModal = new PlayerModal();
    document.getElementById('player-modal-mount').appendChild(this.playerModal.container);

    this.miniPlayer = new MiniPlayer(() => {
      this.playerModal.open();
    });
    document.getElementById('mini-player-mount').appendChild(this.miniPlayer.container);

    this.installPrompt = new IosInstallPrompt();
    document.getElementById('install-modal-mount').appendChild(this.installPrompt.container);

    this.initGlobalListeners();
    this.initNetworkListeners();
    this.initAdSkipHUD();

    // Render Initial View
    await this.switchTab('library');
  }

  initGlobalListeners() {
    // Navigation Tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Brand Logo Click returns to Library
    document.getElementById('brand-home-btn').addEventListener('click', () => {
      this.switchTab('library');
    });

    // Header Ad Shield Pill opens Ad Shield Tab
    document.getElementById('header-shield-pill').addEventListener('click', () => {
      this.switchTab('adshield');
    });

    // Install Guide Button
    document.getElementById('header-install-btn').addEventListener('click', () => {
      this.installPrompt.open();
    });
  }

  initNetworkListeners() {
    const banner = document.getElementById('offline-banner');

    const updateNetworkStatus = () => {
      if (!navigator.onLine) {
        banner.classList.remove('hidden');
        banner.textContent = 'Offline Mode — Playing from local downloads';
      } else {
        // If not simulating offline, hide banner
        const switchOffline = document.getElementById('switch-simulate-offline');
        if (!switchOffline || !switchOffline.classList.contains('checked')) {
          banner.classList.add('hidden');
        }
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
  }

  initAdSkipHUD() {
    const toastContainer = document.getElementById('hud-toast-container');

    // Display high-impact iOS Dynamic Island / HUD notification when an ad is skipped
    audioPlayer.on('adSkipped', ({ segment, secondsSaved }) => {
      const toast = document.createElement('div');
      toast.className = 'hud-toast';
      toast.innerHTML = `
        <svg class="bolt-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        <span>Auto-Skipped ${secondsSaved}s Ad (${segment.label || 'Sponsor Read'})</span>
      `;

      toastContainer.appendChild(toast);

      // Auto remove after 3.5 seconds
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    });
  }

  async switchTab(tabName) {
    this.currentTab = tabName;

    // Update Tab Bar Active State
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    this.viewport.innerHTML = '';

    if (tabName === 'library') {
      this.currentView = new LibraryView((podcast) => {
        this.openPodcastDetail(podcast);
      });
    } else if (tabName === 'discover') {
      this.currentView = new DiscoverView((podcast, episodes) => {
        this.openPodcastDetail(podcast, episodes);
      });
    } else if (tabName === 'downloads') {
      this.currentView = new DownloadsView((episode, podcast) => {
        this.playEpisode(episode, podcast);
      });
    } else if (tabName === 'adshield') {
      this.currentView = new AdShieldView((episode, podcast) => {
        this.playEpisode(episode, podcast);
      });
    }

    const element = await this.currentView.render();
    this.viewport.appendChild(element);
  }

  async openPodcastDetail(podcast, episodes = null) {
    const previousTab = this.currentTab;
    try {
      const detailView = new PodcastDetailView(
        podcast,
        () => this.switchTab(previousTab || 'discover'),
        (episode, pod, queue) => this.playEpisode(episode, pod, queue),
        episodes
      );
      const element = await detailView.render();
      this.currentView = detailView;
      this.viewport.innerHTML = '';
      this.viewport.appendChild(element);
    } catch (err) {
      console.error('Failed to open podcast detail:', err);
      this.viewport.innerHTML = `
        <div class="view-container">
          <button class="back-btn" id="error-back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back
          </button>
          <div class="empty-state">
            <h3>Could not load show</h3>
            <p>${err.message || 'An unexpected error occurred while loading this podcast.'}</p>
          </div>
        </div>
      `;
      this.viewport.querySelector('#error-back-btn')?.addEventListener('click', () => {
        this.switchTab(previousTab || 'discover');
      });
    }
  }

  async playEpisode(episode, podcast, queue = null) {
    try {
      await audioPlayer.playEpisode(episode, podcast, queue);
      this.miniPlayer.updateUI();
    } catch (err) {
      alert(err.message || 'Unable to start audio playback.');
    }
  }
}

// Bootstrap Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
