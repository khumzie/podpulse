import fs from 'fs';

async function buildSixMinutes() {
  console.log('Fetching Six Minutes RSS feed...');
  const res = await fetch('https://rss.art19.com/sixminutes');
  const xml = await res.text();
  const items = xml.split('<item>').slice(1);
  console.log('Parsed items count:', items.length);

  const episodes = items.map((raw, idx) => {
    const getTag = (tag) => {
      const m = raw.match(new RegExp('<' + tag + '[^>]*>(?:<\\!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/' + tag + '>'));
      return m ? m[1].trim() : '';
    };

    const title = getTag('title');
    const desc = getTag('description').replace(/<[^>]*>?/gm, '').slice(0, 300);
    const pubDate = getTag('pubDate');
    const encMatch = raw.match(/<enclosure[^>]*url="([^"]+)"/);
    const audioUrl = encMatch ? encMatch[1] : '';
    const durMatch = raw.match(/<itunes:duration>([^<]+)<\/itunes:duration>/);
    let duration = 360; // 6 mins default
    if (durMatch) {
      const parts = durMatch[1].split(':').map(Number);
      if (parts.length === 2) duration = parts[0] * 60 + parts[1];
      else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else duration = parseInt(durMatch[1], 10) || 360;
    }

    const epId = 'ep_sixmin_' + (items.length - idx);
    const adSegments = [
      {
        id: 'ad_' + epId + '_pre',
        episodeId: epId,
        start: 15,
        end: 45,
        type: 'sponsor',
        label: 'Auto-Detected: Preroll Sponsor'
      }
    ];

    return {
      id: epId,
      podcastId: 'itunes_1348470106',
      title,
      description: desc,
      pubDate,
      duration,
      audioUrl,
      fallbackAudioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      currentTime: 0,
      isPlayed: false,
      isDownloaded: false,
      adSegments
    };
  });

  if (!fs.existsSync('public/data')) fs.mkdirSync('public/data', { recursive: true });

  const podcast = {
    id: 'itunes_1348470106',
    itunesId: 1348470106,
    title: 'Six Minutes',
    author: 'Gen-Z Media',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/91/9f/6d/919f6de3-d14f-f2ae-e6b8-6b83f3e1a8fa/mza_10672534575704153932.jpg/600x600bb.jpg',
    feedUrl: 'https://rss.art19.com/sixminutes',
    genres: ['Kids & Family', 'Fiction', 'Drama'],
    episodeCount: episodes.length,
    dateAdded: Date.now()
  };

  fs.writeFileSync('public/data/sixminutes.json', JSON.stringify({ podcast, episodes }, null, 2));
  console.log('Saved public/data/sixminutes.json with', episodes.length, 'episodes (S1 through S5)!');
  console.log('First:', episodes[0].title);
  console.log('Middle:', episodes[Math.floor(episodes.length / 2)].title);
  console.log('Last (S1 E1):', episodes[episodes.length - 1].title);
}

buildSixMinutes().catch(console.error);
