import { storage } from '../../services/storage.js';
import { audioPlayer } from '../../services/audioPlayer.js';
import { podcastService } from '../../services/podcastService.js';

export class AdShieldView {
  constructor(onPlayEpisode) {
    this.onPlayEpisode = onPlayEpisode;
    this.container = document.createElement('div');
    this.container.className = 'view-container fade-in';
  }

  async render() {
    const stats = await storage.getAdStats();
    const autoSkipAds = await storage.getSetting('autoSkipAds', true);
    const skipIntroEnabled = await storage.getSetting('skipIntroEnabled', false);
    const skipIntroSeconds = await storage.getSetting('skipIntroSeconds', 30);
    const skipOutroEnabled = await storage.getSetting('skipOutroEnabled', false);
    const skipOutroSeconds = await storage.getSetting('skipOutroSeconds', 60);

    const formattedTimeSaved = podcastService.formatDurationDetailed(stats.totalSecondsSaved || 0);

    this.container.innerHTML = `
      <div class="view-title-row">
        <div>
          <h1 class="view-title">Ad Shield</h1>
          <p class="view-subtitle">Intelligent audio ad-blocker & sponsor skipper</p>
        </div>
        <div class="ad-shield-pill">
          <div class="shield-pulse"></div>
          Active
        </div>
      </div>

      <!-- Time Saved Metrics -->
      <div class="shield-metric-grid">
        <div class="shield-metric-card">
          <span class="metric-label">Time Saved</span>
          <div class="metric-value" id="stat-time-saved">${formattedTimeSaved}</div>
          <span style="font-size: 11px; color: var(--text-tertiary);">Zero commercial downtime</span>
        </div>
        <div class="shield-metric-card">
          <span class="metric-label">Ads Skipped</span>
          <div class="metric-value" id="stat-ads-skipped">${stats.totalAdsSkipped || 0}</div>
          <span style="font-size: 11px; color: var(--text-tertiary);">Sponsors & promos jumped</span>
        </div>
      </div>

      <!-- Interactive Instant Test Button -->
      <div class="series-stats-card" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%); border-color: rgba(245, 158, 11, 0.35);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 14px; font-weight: 800; color: #fbbf24;">⚡ Test Ad-Skipper Live</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
              Loads a demo track with an ad at 0:02 that instantly auto-skips to 0:08
            </div>
          </div>
          <button id="btn-test-ad-skip" class="empty-state-btn" style="padding: 8px 14px; font-size: 12px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
            Test Skip
          </button>
        </div>
      </div>

      <!-- Ad Shield Settings Controls -->
      <h2 style="font-size: 16px; font-weight: 800; margin-top: 6px;">Skipping Preferences</h2>
      <div class="shield-settings-list">
        <!-- Master Auto-Skip Toggle -->
        <div class="shield-setting-row">
          <div>
            <div class="setting-title">Auto-Skip Sponsor Segments</div>
            <div class="setting-desc">Instantly jump past sponsor reads, brand promotions, and partner breaks</div>
          </div>
          <div class="ios-switch ${autoSkipAds ? 'checked' : ''}" id="switch-auto-skip">
            <div class="thumb"></div>
          </div>
        </div>

        <!-- Skip Intro Preroll -->
        <div class="shield-setting-row">
          <div>
            <div class="setting-title">Skip Intro Preroll (${skipIntroSeconds}s)</div>
            <div class="setting-desc">Jump past repetitive opening theme music and network announcements</div>
          </div>
          <div class="ios-switch ${skipIntroEnabled ? 'checked' : ''}" id="switch-skip-intro">
            <div class="thumb"></div>
          </div>
        </div>

        <!-- Skip Outro Postroll -->
        <div class="shield-setting-row">
          <div>
            <div class="setting-title">Skip Outro Credits (${skipOutroSeconds}s)</div>
            <div class="setting-desc">Skip end-of-episode credits, disclaimers, and trailing promo plugs</div>
          </div>
          <div class="ios-switch ${skipOutroEnabled ? 'checked' : ''}" id="switch-skip-outro">
            <div class="thumb"></div>
          </div>
        </div>
      </div>

      <!-- How it works explanation -->
      <div class="shield-settings-list" style="padding: 16px; background: rgba(255, 255, 255, 0.02);">
        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">
          How PodPulse Removes Podcast Ads:
        </div>
        <ul style="font-size: 12px; color: var(--text-secondary); line-height: 1.6; padding-left: 18px;">
          <li><strong>ID3 & Podcast 2.0 Chapters:</strong> Reads embedded chapter markers titled <em>Sponsor, Ad, Promo, Commercial</em> and automatically jumps ahead.</li>
          <li><strong>Audio Waveform Highlighting:</strong> Ad breaks appear as amber blocks on the playback scrubber.</li>
          <li><strong>Community & Custom Markers:</strong> Tap "Mark Ad" in the player at any time to bookmark and skip sponsor breaks.</li>
        </ul>
      </div>

      <div style="display: flex; justify-content: center;">
        <button id="btn-reset-stats" class="played-toggle-btn" style="color: var(--text-tertiary); font-size: 12px;">
          Reset Ad Shield Statistics
        </button>
      </div>
    `;

    this.initEventListeners();
    return this.container;
  }

  initEventListeners() {
    // Master Auto Skip Toggle
    const autoSkipSwitch = this.container.querySelector('#switch-auto-skip');
    autoSkipSwitch.addEventListener('click', async () => {
      const current = autoSkipSwitch.classList.contains('checked');
      const next = !current;
      autoSkipSwitch.classList.toggle('checked', next);
      audioPlayer.setAutoSkipAds(next);
      await storage.setSetting('autoSkipAds', next);
    });

    // Skip Intro Toggle
    const introSwitch = this.container.querySelector('#switch-skip-intro');
    introSwitch.addEventListener('click', async () => {
      const current = introSwitch.classList.contains('checked');
      const next = !current;
      introSwitch.classList.toggle('checked', next);
      audioPlayer.skipIntroEnabled = next;
      await storage.setSetting('skipIntroEnabled', next);
    });

    // Skip Outro Toggle
    const outroSwitch = this.container.querySelector('#switch-skip-outro');
    outroSwitch.addEventListener('click', async () => {
      const current = outroSwitch.classList.contains('checked');
      const next = !current;
      outroSwitch.classList.toggle('checked', next);
      audioPlayer.skipOutroEnabled = next;
      await storage.setSetting('skipOutroEnabled', next);
    });

    // Reset Stats
    this.container.querySelector('#btn-reset-stats').addEventListener('click', async () => {
      if (confirm('Reset saved time and ads skipped counters?')) {
        await storage.setSetting('adStats', { totalAdsSkipped: 0, totalSecondsSaved: 0 });
        this.container.querySelector('#stat-time-saved').textContent = '0 mins';
        this.container.querySelector('#stat-ads-skipped').textContent = '0';
      }
    });

    // Test Ad-Skip Live Demo
    this.container.querySelector('#btn-test-ad-skip').addEventListener('click', async () => {
      // Create or use a demo episode with an ad at 2s - 8s
      const testEpisode = {
        id: 'ep-test-demo',
        podcastId: 'pod-huberman',
        title: '⚡ Live Ad-Skip Test Track (Demo)',
        description: 'This demo contains a marked sponsor ad break at 00:02 to 00:08. Watch the player automatically detect and jump right past it!',
        duration: 30,
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        currentTime: 0,
        isPlayed: false,
        isDownloaded: false,
        adSegments: [
          {
            id: 'ad-demo-test',
            episodeId: 'ep-test-demo',
            start: 2,
            end: 8,
            type: 'sponsor',
            label: 'Test Sponsor: HyperSpeed VPN (6s Ad)'
          }
        ]
      };

      const testPodcast = {
        id: 'pod-demo',
        title: 'PodPulse Ad-Shield Live Demo',
        author: 'Ad-Free Demonstration',
        cover: '/icon.svg'
      };

      await this.onPlayEpisode(testEpisode, testPodcast);
    });
  }
}
