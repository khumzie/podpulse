export class IosInstallPrompt {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'modal-overlay';
    this.container.id = 'ios-install-modal';
    this.render();
  }

  render() {
    const currentUrl = window.location.origin.includes('localhost') 
      ? 'http://192.168.0.120:5173' 
      : window.location.origin;
    
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}&bgcolor=090B10&color=8b5cf6&margin=1`;

    this.container.innerHTML = `
      <div class="player-sheet-content" style="background: var(--bg-surface); border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg); border-top: 1px solid var(--border-card); padding: 24px; max-width: 440px; margin: 0 auto; box-shadow: 0 -10px 40px rgba(0,0,0,0.6); max-height: 88vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="/apple-touch-icon.png" style="width: 42px; height: 42px; border-radius: 10px; box-shadow: 0 4px 12px rgba(139,92,246,0.3);" alt="PodPulse" />
            <div>
              <div style="font-size: 17px; font-weight: 800; color: #ffffff;">Add PodPulse to iPhone</div>
              <div style="font-size: 12px; color: var(--text-secondary);">Standalone PWA • Offline Audio</div>
            </div>
          </div>
          <button id="close-install-modal" class="sheet-close-btn" style="width: 32px; height: 32px;">✕</button>
        </div>

        <!-- Step A: Scan or Open on iPhone -->
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-card); border-radius: 14px; padding: 14px; text-align: center; margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent); margin-bottom: 8px;">
            Step 1: Open in iPhone Safari
          </div>
          <div style="display: flex; justify-content: center; align-items: center; margin: 8px 0;">
            <div style="padding: 8px; background: #090B10; border-radius: 12px; border: 1px solid rgba(139,92,246,0.3); display: inline-block;">
              <img src="${qrCodeUrl}" width="140" height="140" alt="Scan with iPhone Camera" style="display: block; border-radius: 8px;" />
            </div>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
            Scan with your <strong>iPhone Camera</strong> or type in <strong>Safari</strong>:
          </div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px;">
            <code style="background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 6px; color: #a5b4fc; font-size: 13px; font-weight: 600;">${currentUrl}</code>
            <button id="copy-pwa-url-btn" style="background: rgba(255,255,255,0.1); border: none; color: #fff; padding: 5px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: 600;">
              Copy
            </button>
          </div>
        </div>

        <!-- Step B: iOS Safari Add to Home Screen -->
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: var(--text-secondary);">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 2px;">
            Step 2: Add to Home Screen
          </div>

          <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.04); padding: 10px 12px; border-radius: 12px;">
            <div style="width: 26px; height: 26px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; flex-shrink: 0;">1</div>
            <div>In Safari, tap the <strong>Share</strong> icon in bottom toolbar (<span style="font-size: 16px; color: #60a5fa;">⎋</span> or box with arrow).</div>
          </div>

          <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.04); padding: 10px 12px; border-radius: 12px;">
            <div style="width: 26px; height: 26px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; flex-shrink: 0;">2</div>
            <div>Scroll down and tap <strong>"Add to Home Screen"</strong> (<span style="font-size: 15px; color: #60a5fa;">⊞</span>).</div>
          </div>

          <div style="display: flex; gap: 12px; align-items: center; background: rgba(255,255,255,0.04); padding: 10px 12px; border-radius: 12px;">
            <div style="width: 26px; height: 26px; border-radius: 50%; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; flex-shrink: 0;">3</div>
            <div>Tap <strong>Add</strong> in the top-right corner.</div>
          </div>
        </div>

        <div style="margin-top: 14px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); border-radius: 10px; padding: 10px; font-size: 12px; color: #34d399; line-height: 1.4;">
          ✨ <strong>Native Experience:</strong> Opens full-screen without Safari browser bars, keeps playing in the background & lock screen, and caches episodes offline.
        </div>

        <button id="got-it-install-btn" class="empty-state-btn" style="width: 100%; margin-top: 16px; padding: 12px; font-size: 14px;">
          Got It!
        </button>
      </div>
    `;

    this.container.querySelector('#close-install-modal').addEventListener('click', () => this.close());
    this.container.querySelector('#got-it-install-btn').addEventListener('click', () => this.close());
    
    const copyBtn = this.container.querySelector('#copy-pwa-url-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(currentUrl);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy', 2000);
      });
    }

    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) this.close();
    });

    return this.container;
  }

  open() {
    this.container.classList.add('open');
  }

  close() {
    this.container.classList.remove('open');
  }
}
