// IndexedDB Storage Service for PodPulse PWA
const DB_NAME = 'PodPulseDB';
const DB_VERSION = 1;

class StorageService {
  constructor() {
    this.db = null;
    this.initPromise = this.initDB();
  }

  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Podcasts Store
        if (!db.objectStoreNames.contains('podcasts')) {
          const podcastStore = db.createObjectStore('podcasts', { keyPath: 'id' });
          podcastStore.createIndex('title', 'title', { unique: false });
        }

        // Episodes Store
        if (!db.objectStoreNames.contains('episodes')) {
          const episodeStore = db.createObjectStore('episodes', { keyPath: 'id' });
          episodeStore.createIndex('podcastId', 'podcastId', { unique: false });
          episodeStore.createIndex('isPlayed', 'isPlayed', { unique: false });
          episodeStore.createIndex('isDownloaded', 'isDownloaded', { unique: false });
        }

        // Audio Blobs Store (for offline downloads)
        if (!db.objectStoreNames.contains('audio_blobs')) {
          db.createObjectStore('audio_blobs', { keyPath: 'episodeId' });
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Ad Segments Store
        if (!db.objectStoreNames.contains('ad_segments')) {
          const adStore = db.createObjectStore('ad_segments', { keyPath: 'id' });
          adStore.createIndex('episodeId', 'episodeId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB init error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.initPromise;
    }
    return this.db;
  }

  // --- Generic Store Helpers ---
  async get(storeName, key) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, item) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Podcasts API ---
  async savePodcast(podcast) {
    return this.put('podcasts', podcast);
  }

  async getPodcast(id) {
    let pod = await this.get('podcasts', id);
    if (!pod && id !== undefined && id !== null) {
      if (typeof id === 'string' && !isNaN(Number(id))) {
        pod = await this.get('podcasts', Number(id));
      } else if (typeof id === 'number') {
        pod = await this.get('podcasts', String(id));
      }
      if (!pod) {
        const all = await this.getAllPodcasts();
        pod = all.find(p => p.id === id || String(p.id) === String(id) || (p.itunesId && String(p.itunesId) === String(id))) || null;
      }
    }
    return pod;
  }

  async getAllPodcasts() {
    return this.getAll('podcasts');
  }

  async deletePodcast(id) {
    const all = await this.getAllPodcasts();
    const idsToDelete = new Set();
    if (id !== undefined && id !== null) {
      idsToDelete.add(id);
      idsToDelete.add(String(id));
      if (!isNaN(Number(id))) idsToDelete.add(Number(id));
    }
    for (const p of all) {
      if (
        p.id === id ||
        String(p.id) === String(id) ||
        (p.itunesId && (p.itunesId === id || String(p.itunesId) === String(id)))
      ) {
        idsToDelete.add(p.id);
      }
    }

    for (const curId of idsToDelete) {
      const episodes = await this.getEpisodesByPodcast(curId);
      for (const ep of episodes) {
        await this.deleteEpisodeAudio(ep.id);
        await this.delete('episodes', ep.id);
      }
      await this.delete('podcasts', curId);
    }
    return true;
  }

  // --- Episodes API ---
  async saveEpisode(episode) {
    return this.put('episodes', episode);
  }

  async saveEpisodes(episodes) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('episodes', 'readwrite');
      const store = tx.objectStore('episodes');
      episodes.forEach(ep => store.put(ep));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getEpisode(id) {
    return this.get('episodes', id);
  }

  async getAllEpisodes() {
    return this.getAll('episodes');
  }

  async getEpisodesByPodcast(podcastId) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('episodes', 'readonly');
      const store = transaction.objectStore('episodes');
      const index = store.index('podcastId');
      const request = index.getAll(podcastId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async markEpisodePlayed(episodeId, isPlayed = true) {
    const ep = await this.getEpisode(episodeId);
    if (ep) {
      ep.isPlayed = isPlayed;
      if (isPlayed) {
        ep.currentTime = ep.duration || 0;
      }
      await this.saveEpisode(ep);
      return ep;
    }
    return null;
  }

  async updateEpisodeProgress(episodeId, currentTime, duration) {
    const ep = await this.getEpisode(episodeId);
    if (ep) {
      ep.currentTime = currentTime;
      if (duration && !ep.duration) ep.duration = duration;
      // If played more than 95%, auto-mark as played
      if (duration > 0 && currentTime / duration >= 0.95) {
        ep.isPlayed = true;
      }
      await this.saveEpisode(ep);
      return ep;
    }
    return null;
  }

  // --- Offline Audio Blobs API ---
  async saveEpisodeAudio(episodeId, blob, mimeType = 'audio/mpeg') {
    const item = {
      episodeId,
      blob,
      mimeType,
      size: blob.size,
      savedAt: Date.now()
    };
    await this.put('audio_blobs', item);
    // update episode downloaded flag
    const ep = await this.getEpisode(episodeId);
    if (ep) {
      ep.isDownloaded = true;
      ep.downloadedSize = blob.size;
      await this.saveEpisode(ep);
    }
    return item;
  }

  async getEpisodeAudio(episodeId) {
    const item = await this.get('audio_blobs', episodeId);
    return item ? item.blob : null;
  }

  async deleteEpisodeAudio(episodeId) {
    await this.delete('audio_blobs', episodeId);
    const ep = await this.getEpisode(episodeId);
    if (ep) {
      ep.isDownloaded = false;
      delete ep.downloadedSize;
      await this.saveEpisode(ep);
    }
    return true;
  }

  async getAllDownloadedAudios() {
    return this.getAll('audio_blobs');
  }

  async getTotalStorageUsage() {
    const all = await this.getAllDownloadedAudios();
    return all.reduce((sum, item) => sum + (item.size || 0), 0);
  }

  // --- Ad Segments API ---
  async saveAdSegment(segment) {
    if (!segment.id) {
      segment.id = 'ad_' + Math.random().toString(36).substr(2, 9);
    }
    return this.put('ad_segments', segment);
  }

  async getAdSegmentsForEpisode(episodeId) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('ad_segments', 'readonly');
      const store = tx.objectStore('ad_segments');
      const index = store.index('episodeId');
      const req = index.getAll(episodeId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteAdSegment(id) {
    return this.delete('ad_segments', id);
  }

  // --- Settings & Stats API ---
  async getSetting(key, defaultValue = null) {
    const item = await this.get('settings', key);
    return item !== null ? item.value : defaultValue;
  }

  async setSetting(key, value) {
    return this.put('settings', { key, value });
  }

  async getAdStats() {
    const stats = await this.getSetting('adStats', {
      totalAdsSkipped: 0,
      totalSecondsSaved: 0
    });
    return stats;
  }

  async recordAdSkip(secondsSaved) {
    const stats = await this.getAdStats();
    stats.totalAdsSkipped = (stats.totalAdsSkipped || 0) + 1;
    stats.totalSecondsSaved = (stats.totalSecondsSaved || 0) + Math.round(secondsSaved);
    await this.setSetting('adStats', stats);
    return stats;
  }
}

export const storage = new StorageService();
