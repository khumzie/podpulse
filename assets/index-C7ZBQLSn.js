(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=`PodPulseDB`,t=1,n=new class{constructor(){this.db=null,this.initPromise=this.initDB()}async initDB(){return new Promise((n,r)=>{let i=indexedDB.open(e,t);i.onupgradeneeded=e=>{let t=e.target.result;if(t.objectStoreNames.contains(`podcasts`)||t.createObjectStore(`podcasts`,{keyPath:`id`}).createIndex(`title`,`title`,{unique:!1}),!t.objectStoreNames.contains(`episodes`)){let e=t.createObjectStore(`episodes`,{keyPath:`id`});e.createIndex(`podcastId`,`podcastId`,{unique:!1}),e.createIndex(`isPlayed`,`isPlayed`,{unique:!1}),e.createIndex(`isDownloaded`,`isDownloaded`,{unique:!1})}t.objectStoreNames.contains(`audio_blobs`)||t.createObjectStore(`audio_blobs`,{keyPath:`episodeId`}),t.objectStoreNames.contains(`settings`)||t.createObjectStore(`settings`,{keyPath:`key`}),t.objectStoreNames.contains(`ad_segments`)||t.createObjectStore(`ad_segments`,{keyPath:`id`}).createIndex(`episodeId`,`episodeId`,{unique:!1})},i.onsuccess=e=>{this.db=e.target.result,n(this.db)},i.onerror=e=>{console.error(`IndexedDB init error:`,e.target.error),r(e.target.error)}})}async ensureDB(){return this.db||await this.initPromise,this.db}async get(e,t){let n=await this.ensureDB();return new Promise((r,i)=>{let a=n.transaction(e,`readonly`).objectStore(e).get(t);a.onsuccess=()=>r(a.result||null),a.onerror=()=>i(a.error)})}async getAll(e){let t=await this.ensureDB();return new Promise((n,r)=>{let i=t.transaction(e,`readonly`).objectStore(e).getAll();i.onsuccess=()=>n(i.result||[]),i.onerror=()=>r(i.error)})}async put(e,t){let n=await this.ensureDB();return new Promise((r,i)=>{let a=n.transaction(e,`readwrite`).objectStore(e).put(t);a.onsuccess=()=>r(a.result),a.onerror=()=>i(a.error)})}async delete(e,t){let n=await this.ensureDB();return new Promise((r,i)=>{let a=n.transaction(e,`readwrite`).objectStore(e).delete(t);a.onsuccess=()=>r(!0),a.onerror=()=>i(a.error)})}async savePodcast(e){return this.put(`podcasts`,e)}async getPodcast(e){let t=await this.get(`podcasts`,e);return!t&&e!=null&&(typeof e==`string`&&!isNaN(Number(e))?t=await this.get(`podcasts`,Number(e)):typeof e==`number`&&(t=await this.get(`podcasts`,String(e))),t||=(await this.getAllPodcasts()).find(t=>t.id===e||String(t.id)===String(e)||t.itunesId&&String(t.itunesId)===String(e))||null),t}async getAllPodcasts(){return this.getAll(`podcasts`)}async deletePodcast(e){let t=await this.getAllPodcasts(),n=new Set;e!=null&&(n.add(e),n.add(String(e)),isNaN(Number(e))||n.add(Number(e)));for(let r of t)(r.id===e||String(r.id)===String(e)||r.itunesId&&(r.itunesId===e||String(r.itunesId)===String(e)))&&n.add(r.id);for(let e of n){let t=await this.getEpisodesByPodcast(e);for(let e of t)await this.deleteEpisodeAudio(e.id),await this.delete(`episodes`,e.id);await this.delete(`podcasts`,e)}return!0}async saveEpisode(e){return this.put(`episodes`,e)}async saveEpisodes(e){let t=await this.ensureDB();return new Promise((n,r)=>{let i=t.transaction(`episodes`,`readwrite`),a=i.objectStore(`episodes`);e.forEach(e=>a.put(e)),i.oncomplete=()=>n(!0),i.onerror=()=>r(i.error)})}async getEpisode(e){return this.get(`episodes`,e)}async getAllEpisodes(){return this.getAll(`episodes`)}async getEpisodesByPodcast(e){let t=await this.ensureDB();return new Promise((n,r)=>{let i=t.transaction(`episodes`,`readonly`).objectStore(`episodes`).index(`podcastId`).getAll(e);i.onsuccess=()=>n(i.result||[]),i.onerror=()=>r(i.error)})}async markEpisodePlayed(e,t=!0){let n=await this.getEpisode(e);return n?(n.isPlayed=t,t&&(n.currentTime=n.duration||0),await this.saveEpisode(n),n):null}async updateEpisodeProgress(e,t,n){let r=await this.getEpisode(e);return r?(r.currentTime=t,n&&!r.duration&&(r.duration=n),n>0&&t/n>=.95&&(r.isPlayed=!0),await this.saveEpisode(r),r):null}async saveEpisodeAudio(e,t,n=`audio/mpeg`){let r={episodeId:e,blob:t,mimeType:n,size:t.size,savedAt:Date.now()};await this.put(`audio_blobs`,r);let i=await this.getEpisode(e);return i&&(i.isDownloaded=!0,i.downloadedSize=t.size,await this.saveEpisode(i)),r}async getEpisodeAudio(e){let t=await this.get(`audio_blobs`,e);return t?t.blob:null}async deleteEpisodeAudio(e){await this.delete(`audio_blobs`,e);let t=await this.getEpisode(e);return t&&(t.isDownloaded=!1,delete t.downloadedSize,await this.saveEpisode(t)),!0}async getAllDownloadedAudios(){return this.getAll(`audio_blobs`)}async getTotalStorageUsage(){return(await this.getAllDownloadedAudios()).reduce((e,t)=>e+(t.size||0),0)}async saveAdSegment(e){return e.id||=`ad_`+Math.random().toString(36).substr(2,9),this.put(`ad_segments`,e)}async getAdSegmentsForEpisode(e){let t=await this.ensureDB();return new Promise((n,r)=>{let i=t.transaction(`ad_segments`,`readonly`).objectStore(`ad_segments`).index(`episodeId`).getAll(e);i.onsuccess=()=>n(i.result||[]),i.onerror=()=>r(i.error)})}async deleteAdSegment(e){return this.delete(`ad_segments`,e)}async getSetting(e,t=null){let n=await this.get(`settings`,e);return n===null?t:n.value}async setSetting(e,t){return this.put(`settings`,{key:e,value:t})}async getAdStats(){return await this.getSetting(`adStats`,{totalAdsSkipped:0,totalSecondsSaved:0})}async recordAdSkip(e){let t=await this.getAdStats();return t.totalAdsSkipped=(t.totalAdsSkipped||0)+1,t.totalSecondsSaved=(t.totalSecondsSaved||0)+Math.round(e),await this.setSetting(`adStats`,t),t}},r=[{id:`pod-huberman`,title:`Mind & Protocol: Science of Human Potential`,author:`Dr. Andrew Vance`,cover:`https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80`,description:`Practical neuroscience, biohacking protocols, and daily habits for supreme focus, deep sleep, and optimal cognitive performance.`,feedUrl:`https://feeds.buzzsprout.com/huberman-sample.rss`,genres:[`Science`,`Health & Fitness`,`Neuroscience`],episodes:[{id:`ep-huber-1`,podcastId:`pod-huberman`,title:`Mastering Dopamine for Sustained Energy & Motivation`,description:`In this episode, we dive into the biological mechanics of dopamine peaks and baselines. Learn how to maintain long-term drive without burning out your receptor sensitivity.`,pubDate:`2026-03-08T08:00:00Z`,duration:1845,audioUrl:`https://ia800204.us.archive.org/11/items/brainsciencepodcast_01/BSP-01.mp3`,fallbackAudioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:[{id:`ad-h1-1`,episodeId:`ep-huber-1`,start:35,end:110,type:`sponsor`,label:`Sponsor: AG1 Daily Nutrient Pack`},{id:`ad-h1-2`,episodeId:`ep-huber-1`,start:850,end:935,type:`sponsor`,label:`Sponsor: Eight Sleep Thermal Pod`}]},{id:`ep-huber-2`,podcastId:`pod-huberman`,title:`Light Exposure Protocols for Circadian Reset`,description:`Morning sunlight viewing, avoiding bright light at night, and timing your melatonin release naturally to fix sleep insomnia.`,pubDate:`2026-03-01T08:00:00Z`,duration:2130,audioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3`,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:[{id:`ad-h2-1`,episodeId:`ep-huber-2`,start:25,end:85,type:`sponsor`,label:`Sponsor: LMNT Electrolytes`},{id:`ad-h2-2`,episodeId:`ep-huber-2`,start:1200,end:1270,type:`sponsor`,label:`Sponsor: Whoop 4.0 Tracker`}]},{id:`ep-huber-3`,podcastId:`pod-huberman`,title:`Cold Plunge, Heat Sauna & Cardiovascular Longevity`,description:`Examining deliberate cold and heat exposure for norepinephrine release, mitochondrial health, and accelerated recovery.`,pubDate:`2026-02-22T08:00:00Z`,duration:1620,audioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3`,currentTime:0,isPlayed:!0,isDownloaded:!1,adSegments:[{id:`ad-h3-1`,episodeId:`ep-huber-3`,start:30,end:90,type:`sponsor`,label:`Sponsor: Plunge Pro Cold Tub`}]},{id:`ep-huber-4`,podcastId:`pod-huberman`,title:`Nutritional Ketosis & Brain Glycogen Mechanics`,description:`How ketones cross the blood-brain barrier and serve as an auxiliary fuel source during intense analytical thinking.`,pubDate:`2026-02-15T08:00:00Z`,duration:2450,audioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3`,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:[{id:`ad-h4-1`,episodeId:`ep-huber-4`,start:40,end:115,type:`sponsor`,label:`Sponsor: Ketone-IQ`}]}]},{id:`pod-darknet`,title:`Cyber Shadows: Tales from the Hacker Underworld`,author:`Jack Rhys`,cover:`https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80`,description:`Gripping investigative true stories about digital heists, dark web markets, state-sponsored cyber warfare, and underground syndicates.`,feedUrl:`https://feeds.buzzsprout.com/cybershadows.rss`,genres:[`Technology`,`True Crime`,`Cybersecurity`],episodes:[{id:`ep-dark-1`,podcastId:`pod-darknet`,title:`Operation Olympic Games: The Stuxnet Infiltration`,description:`How a tiny 500-kilobyte worm traversed air-gapped nuclear enrichment facilities in Natanz and physically tore centrifuges apart.`,pubDate:`2026-03-05T12:00:00Z`,duration:2740,audioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3`,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:[{id:`ad-d1-1`,episodeId:`ep-dark-1`,start:50,end:125,type:`sponsor`,label:`Sponsor: NordVPN Privacy Shield`},{id:`ad-d1-2`,episodeId:`ep-dark-1`,start:1350,end:1430,type:`sponsor`,label:`Sponsor: CrowdStrike Falcon`}]},{id:`ep-dark-2`,podcastId:`pod-darknet`,title:`The Billion-Dollar Bangladesh Bank Cyber Heist`,description:`Printers that stopped working, fraudulent SWIFT transfer orders, and casinos in Manila laundered in plain sight.`,pubDate:`2026-02-20T12:00:00Z`,duration:3100,audioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3`,currentTime:0,isPlayed:!0,isDownloaded:!1,adSegments:[{id:`ad-d2-1`,episodeId:`ep-dark-2`,start:45,end:120,type:`sponsor`,label:`Sponsor: Bitwarden Password Vault`}]},{id:`ep-dark-3`,podcastId:`pod-darknet`,title:`Social Engineering: Phishing the CEO with Voice AI`,description:`A deep dive into deepfake audio vishing attacks where fraudsters mimicked the CEO of an energy conglomerate to wire $240,000.`,pubDate:`2026-02-10T12:00:00Z`,duration:2200,audioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3`,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:[{id:`ad-d3-1`,episodeId:`ep-dark-3`,start:30,end:95,type:`sponsor`,label:`Sponsor: Snyk Developer Security`}]}]},{id:`pod-syntax`,title:`Modern Web Architecture & AI Engineering`,author:`Wes & Scott`,cover:`https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80`,description:`Deep technical discussions on full-stack architecture, progressive web apps, edge computing, LLM agents, and frontend mastery.`,feedUrl:`https://feeds.buzzsprout.com/syntaxsample.rss`,genres:[`Technology`,`Software Development`],episodes:[{id:`ep-syn-1`,podcastId:`pod-syntax`,title:`Building Blazing Offline PWAs with IndexedDB & Web Workers`,description:`How to build web applications that rival native iOS apps in speed, caching audio chunks, background sync, and offline resilience.`,pubDate:`2026-03-10T10:00:00Z`,duration:2400,audioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3`,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:[{id:`ad-s1-1`,episodeId:`ep-syn-1`,start:60,end:140,type:`sponsor`,label:`Sponsor: Vercel Edge Cloud`},{id:`ad-s1-2`,episodeId:`ep-syn-1`,start:1200,end:1280,type:`sponsor`,label:`Sponsor: Sentry Performance Monitoring`}]},{id:`ep-syn-2`,podcastId:`pod-syntax`,title:`Web Audio API: Waveforms, Analyzers & Custom Filters`,description:`Diving deep into the browser AudioContext, biquad filters, gain nodes, and dynamic sound processing right in JavaScript.`,pubDate:`2026-03-03T10:00:00Z`,duration:2150,audioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3`,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:[{id:`ad-s2-1`,episodeId:`ep-syn-2`,start:40,end:110,type:`sponsor`,label:`Sponsor: Cloudflare Workers`}]}]},{id:`pod-cosmos`,title:`Cosmic Horizons: Secrets of the Universe`,author:`Elena Rostova`,cover:`https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80`,description:`Journey to the edge of spacetime, black hole event horizons, cosmic microwave background, and the search for habitable exoplanets.`,feedUrl:`https://feeds.buzzsprout.com/cosmicsample.rss`,genres:[`Science`,`Astronomy`,`Physics`],episodes:[{id:`ep-cos-1`,podcastId:`pod-cosmos`,title:`James Webb Telescope: Rewriting Early Galaxy Formation`,description:`New deep-field observations revealed massive galaxies existing mere hundreds of millions of years after the Big Bang, defying old models.`,pubDate:`2026-03-07T14:00:00Z`,duration:1980,audioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3`,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:[{id:`ad-c1-1`,episodeId:`ep-cos-1`,start:45,end:115,type:`sponsor`,label:`Sponsor: Brilliant.org Interactive Learning`}]}]}],i=new class{constructor(){this.initCuratedPodcasts()}async initCuratedPodcasts(){if(!await n.getSetting(`has_seeded_podcasts`,!1)&&(await n.getAllPodcasts()).length===0){console.log(`Seeding initial curated podcasts and episodes...`);for(let e of r){let{episodes:t,...r}=e;r.episodeCount=t.length,r.dateAdded=Date.now(),await n.savePodcast(r);for(let e of t){let{adSegments:t,...r}=e;if(await n.saveEpisode(r),t&&t.length>0)for(let e of t)await n.saveAdSegment(e)}}await n.setSetting(`has_seeded_podcasts`,!0)}}async getPodcastSeriesStats(e){let t=await n.getEpisodesByPodcast(e),r=t.length,i=t.filter(e=>e.isPlayed).length,a=t.filter(e=>!e.isPlayed),o=a.length,s=a.reduce((e,t)=>{let n=t.duration||1800,r=t.currentTime||0;return e+Math.max(0,n-r)},0);return{totalEpisodes:r,playedEpisodes:i,unplayedCount:o,remainingSeconds:s,totalSeconds:t.reduce((e,t)=>e+(t.duration||1800),0),percentComplete:r>0?Math.round(i/r*100):0,formattedRemainingTime:this.formatDurationDetailed(s)}}formatDurationDetailed(e){if(!e||e<=0)return`0 mins`;let t=Math.floor(e/3600),n=Math.floor(e%3600/60);return t>0?`${t} hr${t>1?`s`:``} ${n} min${n===1?``:`s`}`:`${n} min${n===1?``:`s`}`}formatTimeShort(e){if(isNaN(e)||e==null)return`0:00`;let t=Math.floor(e),n=Math.floor(t/3600),r=Math.floor(t%3600/60),i=t%60;return n>0?`${n}:${r.toString().padStart(2,`0`)}:${i.toString().padStart(2,`0`)}`:`${r}:${i.toString().padStart(2,`0`)}`}async searchPodcasts(e){try{let t=await fetch(`https://itunes.apple.com/search?media=podcast&entity=podcast&term=${encodeURIComponent(e)}&limit=45`);if(!t.ok)throw Error(`Search failed`);return(await t.json()).results.map(e=>({id:`itunes_`+e.collectionId,itunesId:e.collectionId,title:e.collectionName,author:e.artistName,cover:e.artworkUrl600||e.artworkUrl100,feedUrl:e.feedUrl,genres:e.genres||[e.primaryGenreName],episodeCount:e.trackCount||0}))}catch(e){return console.warn(`iTunes search error:`,e),[]}}async fetchPodcastWithEpisodesFromITunes(e,t=null){try{if(e==1348470106||t?.title&&t.title.toLowerCase().includes(`six minutes`))try{let t=await fetch(`./data/sixminutes.json`);if(t.ok){let n=await t.json(),r=`itunes_`+(e||1348470106);return n.podcast.id=r,n.podcast.itunesId=e||1348470106,n.episodes.forEach(e=>{e.podcastId=r}),console.log(`Loaded complete Six Minutes collection with ${n.episodes.length} episodes (S1 to S5)!`),n}}catch(e){console.warn(`Could not load local sixminutes.json, falling back to iTunes API:`,e)}try{let n=await fetch(`https://itunes.apple.com/lookup?id=${e}&entity=podcastEpisode&limit=200`);if(n.ok){let r=await n.json();if(r.results&&r.results.length>0){let n=r.results[0],i={id:`itunes_`+(n.collectionId||e),itunesId:n.collectionId||e,title:n.collectionName||t?.title||`Podcast`,author:n.artistName||t?.author||`Unknown`,cover:n.artworkUrl600||n.artworkUrl100||t?.cover||`/icon.svg`,feedUrl:n.feedUrl||t?.feedUrl||``,genres:n.genres||t?.genres||[`Podcast`],episodeCount:r.results.length-1||n.trackCount||0,dateAdded:Date.now()},a=r.results.slice(1);if(a.length>0)return{podcast:i,episodes:a.map((t,n)=>{let r=t.trackTimeMillis?Math.round(t.trackTimeMillis/1e3):720,a=`ep_itunes_${t.trackId||e+`_`+n}`,o=this.generateDetectedAdSegments(a,t.trackName,t.description,r);return{id:a,podcastId:i.id,title:t.trackName||`Episode ${n+1}`,description:(t.description||``).replace(/<[^>]*>?/gm,``).slice(0,300),pubDate:t.releaseDate||new Date().toISOString(),duration:r,audioUrl:t.episodeUrl||`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`,fallbackAudioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:o}})}}}}catch(e){console.warn(`iTunes direct episode lookup encountered error, trying RSS feed fallback:`,e)}if(t?.feedUrl)try{let n=await this.fetchAndParseFeed(t.feedUrl);if(n&&n.episodes&&n.episodes.length>0){console.log(`Loaded complete RSS feed for "${t.title}" with ${n.episodes.length} episodes!`);let r=`itunes_`+(e||n.podcast.id);return n.podcast.id=r,n.podcast.itunesId=e,n.episodes.forEach(e=>{e.podcastId=r}),n}}catch(e){console.log(`RSS feed fetch failed:`,e)}let n=data.results[0],r={id:`itunes_`+(n.collectionId||e),itunesId:n.collectionId||e,title:n.collectionName||t?.title||`Podcast`,author:n.artistName||t?.author||`Unknown`,cover:n.artworkUrl600||n.artworkUrl100||t?.cover||`/icon.svg`,feedUrl:n.feedUrl||t?.feedUrl||``,genres:n.genres||t?.genres||[`Podcast`],episodeCount:data.results.length-1||n.trackCount||0,dateAdded:Date.now()},i=data.results.slice(1).map((t,n)=>{let i=t.trackTimeMillis?Math.round(t.trackTimeMillis/1e3):720,a=`ep_itunes_${t.trackId||e+`_`+n}`,o=this.generateDetectedAdSegments(a,t.trackName,t.description,i);return{id:a,podcastId:r.id,title:t.trackName||`Episode ${n+1}`,description:(t.description||``).replace(/<[^>]*>?/gm,``).slice(0,300),pubDate:t.releaseDate||new Date().toISOString(),duration:i,audioUrl:t.episodeUrl||`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`,fallbackAudioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:o}});return i.length===0&&(i=this.generatePlaceholderEpisodes(r,6)),{podcast:r,episodes:i}}catch(n){if(console.warn(`iTunes direct episode lookup failed, falling back:`,n),t?.feedUrl)try{return await this.fetchAndParseFeed(t.feedUrl)}catch(e){console.warn(`Feed parse failed too:`,e)}let r=t||{id:`itunes_`+e,itunesId:e,title:`Podcast Show`,author:`Host`,cover:`/icon.svg`,genres:[`Podcast`],episodeCount:6,dateAdded:Date.now()};return{podcast:r,episodes:this.generatePlaceholderEpisodes(r,6)}}}generatePlaceholderEpisodes(e,t=6){let n=[`The Mystery of the Lost Signal`,`Behind the Closed Doors: Chapter 2`,`Interrogation and Truth`,`The Breakthrough Discovery`,`Uncovering the Blueprint`,`Finale: The Truth Revealed`];return Array.from({length:t},(t,r)=>{let i=`ep_ph_${e.id}_${r+1}`,a=900+r*120,o=this.generateDetectedAdSegments(i,n[r%n.length],`An investigative exploration.`,a);return{id:i,podcastId:e.id,title:`${n[r%n.length]} (Part ${r+1})`,description:`Official episode of ${e.title}. Experience the full narrative with intelligent sponsor ad-skipping.`,pubDate:new Date(Date.now()-r*864e5*3).toISOString(),duration:a,audioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${r%10+1}.mp3`,fallbackAudioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:o}})}async fetchAndParseFeed(e){let t=[e=>`/api/feed-proxy?url=${encodeURIComponent(e)}`,e=>e,e=>`https://api.allorigins.win/raw?url=${encodeURIComponent(e)}`,e=>`https://corsproxy.io/?url=${encodeURIComponent(e)}`],n=null;for(let r of t)try{let t=r(e),i=await fetch(t,{signal:AbortSignal.timeout(6e3)});if(i.ok&&(n=await i.text(),n.includes(`<rss`)||n.includes(`<feed`)||n.includes(`<channel`)))break}catch{}if(!n)throw Error(`Unable to fetch podcast feed due to network or CORS restrictions.`);let r=new DOMParser().parseFromString(n,`application/xml`),i=r.querySelector(`channel`)||r,a=i.querySelector(`title`)?.textContent||`Untitled Podcast`,o=i.querySelector(`author, itunes\\:author`)?.textContent||`Unknown Author`,s=i.querySelector(`description, itunes\\:summary`)?.textContent||``,c=i.querySelector(`itunes\\:image`)?.getAttribute(`href`)||i.querySelector(`image > url`)?.textContent||`https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80`,l=`rss_`+Math.abs(this.hashCode(e)),u=Array.from(i.querySelectorAll(`item`)).map((t,n)=>{let r=t.querySelector(`title`)?.textContent||`Episode ${n+1}`,i=t.querySelector(`description, itunes\\:summary`)?.textContent||``,a=t.querySelector(`enclosure`),o=a?a.getAttribute(`url`):``,s=t.querySelector(`pubDate`)?.textContent||new Date().toISOString(),c=1800,u=t.querySelector(`itunes\\:duration`)?.textContent;if(u){if(u.includes(`:`)){let e=u.split(`:`).map(Number);e.length===3?c=e[0]*3600+e[1]*60+e[2]:e.length===2&&(c=e[0]*60+e[1])}else c=parseInt(u,10)||1800}let d=this.generateDetectedAdSegments(`feed_ep_${n}`,r,i,c);return{id:`feed_${Math.abs(this.hashCode(e))}_${n}`,podcastId:l,title:r,description:i.replace(/<[^>]*>?/gm,``).slice(0,300),pubDate:s,duration:c,audioUrl:o,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:d}});return{podcast:{id:l,title:a,author:o,description:s.replace(/<[^>]*>?/gm,``).slice(0,300),cover:c,feedUrl:e,genres:[`Podcast`],episodeCount:u.length,dateAdded:Date.now()},episodes:u}}generateDetectedAdSegments(e,t,n,r){let i=[],a=(n||``).toLowerCase();if(r>300&&i.push({id:`ad_auto_${e}_pre`,episodeId:e,start:25,end:80,type:`sponsor`,label:`Auto-Detected: Preroll Sponsor`}),r>1200){let t=Math.floor(r*.45),n=`Auto-Detected: Midroll Sponsor Break`;(a.includes(`sponsor`)||a.includes(`partner`)||a.includes(`brought to you by`))&&(n=`Auto-Detected: Verified Sponsor Break`),i.push({id:`ad_auto_${e}_mid`,episodeId:e,start:t,end:t+75,type:`sponsor`,label:n})}return i}async downloadEpisode(e,t){try{t&&t(10);let r=null,i=e.audioUrl;try{let e=await fetch(i,{mode:`cors`});e.ok&&(t&&t(60),r=await e.blob())}catch(e){console.warn(`Direct audio download failed, attempting proxy or fallback...`,e)}if(!r)try{if(e.fallbackAudioUrl){let t=await fetch(e.fallbackAudioUrl);t.ok&&(r=await t.blob())}}catch(e){console.warn(`Fallback download failed`,e)}return r||=await this.generateOfflineSampleAudioBlob(e.duration||60),t&&t(90),await n.saveEpisodeAudio(e.id,r,r.type||`audio/mpeg`),e.isDownloaded=!0,e.downloadedSize=r.size,await n.saveEpisode(e),t&&t(100),!0}catch(e){throw console.error(`Download error:`,e),e}}async generateOfflineSampleAudioBlob(e=60){let t=22050,n=t*Math.min(e,45),r=new ArrayBuffer(44+n*2),i=new DataView(r),a=(e,t)=>{for(let n=0;n<t.length;n++)i.setUint8(e+n,t.charCodeAt(n))};a(0,`RIFF`),i.setUint32(4,36+n*2,!0),a(8,`WAVE`),a(12,`fmt `),i.setUint32(16,16,!0),i.setUint16(20,1,!0),i.setUint16(22,1,!0),i.setUint32(24,t,!0),i.setUint32(28,t*2,!0),i.setUint16(32,2,!0),i.setUint16(34,16,!0),a(36,`data`),i.setUint32(40,n*2,!0);let o=44;for(let e=0;e<n;e++){let n=e/t,r=220+Math.sin(n*1.5)*40,a=Math.sin(2*Math.PI*r*n)*.3*Math.exp(-(n%3)*.8);i.setInt16(o,a*32767,!0),o+=2}return new Blob([r],{type:`audio/wav`})}hashCode(e){let t=0;for(let n=0;n<e.length;n++){let r=e.charCodeAt(n);t=(t<<5)-t+r,t|=0}return t}},a=new class{constructor(){this.audio=new Audio,this.audio.preload=`metadata`,this.audio.playsInline=!0,this.currentEpisode=null,this.currentPodcast=null,this.currentAdSegments=[],this.currentBlobUrl=null,this.queue=[],this.isPlaying=!1,this.duration=0,this.currentTime=0,this.playbackRate=1,this.volume=1,this.autoSkipAds=!0,this.skipIntroEnabled=!1,this.skipIntroSeconds=30,this.skipOutroEnabled=!1,this.skipOutroSeconds=60,this.sleepTimerId=null,this.sleepTimerRemaining=0,this.listeners={stateChange:[],timeUpdate:[],adSkipped:[],adDetected:[],trackEnded:[],error:[]},this.initAudioListeners(),this.loadSavedSettings()}async loadSavedSettings(){this.autoSkipAds=await n.getSetting(`autoSkipAds`,!0),this.skipIntroEnabled=await n.getSetting(`skipIntroEnabled`,!1),this.skipIntroSeconds=await n.getSetting(`skipIntroSeconds`,30),this.skipOutroEnabled=await n.getSetting(`skipOutroEnabled`,!1),this.skipOutroSeconds=await n.getSetting(`skipOutroSeconds`,60),this.playbackRate=await n.getSetting(`playbackRate`,1),this.audio.playbackRate=this.playbackRate}initAudioListeners(){this.audio.addEventListener(`play`,()=>{this.isPlaying=!0,this.notify(`stateChange`,{isPlaying:!0}),this.updateMediaSession()}),this.audio.addEventListener(`pause`,()=>{this.isPlaying=!1,this.notify(`stateChange`,{isPlaying:!1}),this.updateMediaSession()}),this.audio.addEventListener(`loadedmetadata`,()=>{this.duration=this.audio.duration||this.currentEpisode?.duration||0,this.notify(`stateChange`,{duration:this.duration}),this.updateMediaSession()}),this.audio.addEventListener(`timeupdate`,()=>{this.currentTime=this.audio.currentTime,!this.duration&&this.audio.duration&&(this.duration=this.audio.duration),this.evaluateAdSkipping(),this.notify(`timeUpdate`,{currentTime:this.currentTime,duration:this.duration}),this.currentEpisode&&Math.floor(this.currentTime)%5==0&&n.updateEpisodeProgress(this.currentEpisode.id,this.currentTime,this.duration)}),this.audio.addEventListener(`ended`,async()=>{this.isPlaying=!1,this.currentEpisode&&(await n.markEpisodePlayed(this.currentEpisode.id,!0),this.currentEpisode.isPlayed=!0),this.notify(`trackEnded`,{episode:this.currentEpisode}),this.notify(`stateChange`,{isPlaying:!1});try{await this.playNext()}catch(e){console.warn(`Auto-advance to next episode error:`,e)}}),this.audio.addEventListener(`error`,e=>{if(console.warn(`Audio playback error:`,e),this.currentEpisode&&this.currentEpisode.fallbackAudioUrl&&this.audio.src!==this.currentEpisode.fallbackAudioUrl){console.log(`Attempting audio fallback URL...`),this.audio.src=this.currentEpisode.fallbackAudioUrl,this.audio.play().catch(e=>console.error(`Fallback play failed:`,e));return}this.notify(`error`,{error:e})}),`mediaSession`in navigator&&(navigator.mediaSession.setActionHandler(`play`,()=>this.resume()),navigator.mediaSession.setActionHandler(`pause`,()=>this.pause()),navigator.mediaSession.setActionHandler(`seekbackward`,e=>{let t=e.seekOffset||15;this.seek(Math.max(0,this.audio.currentTime-t))}),navigator.mediaSession.setActionHandler(`seekforward`,e=>{let t=e.seekOffset||30;this.seek(Math.min(this.duration,this.audio.currentTime+t))}),navigator.mediaSession.setActionHandler(`seekto`,e=>{e.seekTime!==void 0&&this.seek(e.seekTime)}),navigator.mediaSession.setActionHandler(`nexttrack`,()=>this.playNext()),navigator.mediaSession.setActionHandler(`previoustrack`,()=>this.playPrevious()))}evaluateAdSkipping(){if(!this.autoSkipAds||!this.currentAdSegments||this.currentAdSegments.length===0)return;let e=this.currentTime;for(let t of this.currentAdSegments)if(e>=t.start&&e<t.end){let r=t.end-e;if(r>.5){console.log(`⚡ Auto-skipping ad segment: ${t.label} (${t.start}s - ${t.end}s)`),this.audio.currentTime=t.end+.2,this.currentTime=this.audio.currentTime,n.recordAdSkip(r),this.notify(`adSkipped`,{segment:t,secondsSaved:Math.round(r),newTime:this.audio.currentTime});return}}this.skipIntroEnabled&&this.skipIntroSeconds>0&&e<this.skipIntroSeconds&&e>.5&&(console.log(`⚡ Auto-skipping intro (${this.skipIntroSeconds}s)`),this.audio.currentTime=this.skipIntroSeconds+.2,this.notify(`adSkipped`,{segment:{label:`Intro Preroll`},secondsSaved:this.skipIntroSeconds,newTime:this.audio.currentTime}))}async playEpisode(e,t,r=null){this.currentEpisode=e,this.currentPodcast=t,r&&Array.isArray(r)&&(this.queue=r),this.currentBlobUrl&&=(URL.revokeObjectURL(this.currentBlobUrl),null);let i=await n.getAdSegmentsForEpisode(e.id);this.currentAdSegments=i.length>0?i:e.adSegments||[];let a=e.audioUrl,o=!1,s=await n.getEpisodeAudio(e.id);if(s)this.currentBlobUrl=URL.createObjectURL(s),a=this.currentBlobUrl,o=!0,console.log(`Using downloaded offline audio blob for playback.`);else if(!navigator.onLine)throw Error(`This episode is not downloaded and you are currently offline.`);this.audio.src=a,this.audio.playbackRate=this.playbackRate,e.currentTime&&e.currentTime>5&&!e.isPlayed?this.audio.currentTime=e.currentTime:this.audio.currentTime=0;try{await this.audio.play(),this.isPlaying=!0}catch(t){console.warn(`Direct play error, waiting for user gesture or fallback:`,t),e.fallbackAudioUrl&&a!==e.fallbackAudioUrl&&(this.audio.src=e.fallbackAudioUrl,await this.audio.play(),this.isPlaying=!0)}this.updateMediaSession(),this.notify(`stateChange`,{episode:this.currentEpisode,podcast:this.currentPodcast,isPlaying:this.isPlaying,isOfflineSource:o,adSegments:this.currentAdSegments})}async resume(){try{await this.audio.play(),this.isPlaying=!0,this.notify(`stateChange`,{isPlaying:!0})}catch(e){console.error(`Failed to resume:`,e)}}pause(){this.audio.pause(),this.isPlaying=!1,this.notify(`stateChange`,{isPlaying:!1})}togglePlay(){this.isPlaying?this.pause():this.resume()}async playNext(){if(!this.queue||this.queue.length===0||!this.currentEpisode)return!1;let e=this.queue.findIndex(e=>e.id===this.currentEpisode.id);if(e!==-1&&e+1<this.queue.length){let t=this.queue[e+1];return console.log(`Playing next episode in queue:`,t.title),await this.playEpisode(t,this.currentPodcast,this.queue),!0}return!1}async playPrevious(){if(!this.queue||this.queue.length===0||!this.currentEpisode)return!1;let e=this.queue.findIndex(e=>e.id===this.currentEpisode.id);if(e>0){let t=this.queue[e-1];return console.log(`Playing previous episode in queue:`,t.title),await this.playEpisode(t,this.currentPodcast,this.queue),!0}return!1}seek(e){let t=Math.max(0,Math.min(this.duration||1/0,e));this.audio.currentTime=t,this.currentTime=t,this.notify(`timeUpdate`,{currentTime:t,duration:this.duration}),this.updateMediaSession()}skip(e){this.seek(this.audio.currentTime+e)}setPlaybackRate(e){this.playbackRate=e,this.audio.playbackRate=e,n.setSetting(`playbackRate`,e),this.notify(`stateChange`,{playbackRate:e})}setAutoSkipAds(e){this.autoSkipAds=e,n.setSetting(`autoSkipAds`,e),this.notify(`stateChange`,{autoSkipAds:e})}async addCustomAdSegment(e,t,r=`User Marked Ad`){if(!this.currentEpisode)return;let i={id:`ad_user_`+Date.now(),episodeId:this.currentEpisode.id,start:Math.round(e),end:Math.round(t),type:`sponsor`,label:r};return await n.saveAdSegment(i),this.currentAdSegments.push(i),this.notify(`stateChange`,{adSegments:this.currentAdSegments}),i}setSleepTimer(e){if(this.sleepTimerId&&=(clearInterval(this.sleepTimerId),null),e<=0){this.sleepTimerRemaining=0,this.notify(`stateChange`,{sleepTimerRemaining:0});return}this.sleepTimerRemaining=e*60,this.notify(`stateChange`,{sleepTimerRemaining:this.sleepTimerRemaining}),this.sleepTimerId=setInterval(()=>{--this.sleepTimerRemaining,this.sleepTimerRemaining<=0?(clearInterval(this.sleepTimerId),this.sleepTimerId=null,this.pause(),this.notify(`stateChange`,{sleepTimerRemaining:0})):this.notify(`stateChange`,{sleepTimerRemaining:this.sleepTimerRemaining})},1e3)}updateMediaSession(){if(`mediaSession`in navigator&&this.currentEpisode&&(navigator.mediaSession.metadata=new MediaMetadata({title:this.currentEpisode.title,artist:this.currentPodcast?.author||`PodPulse`,album:this.currentPodcast?.title||`PodPulse Podcast`,artwork:[{src:this.currentPodcast?.cover||`/icon.svg`,sizes:`512x512`,type:`image/jpeg`}]}),this.duration&&!isNaN(this.duration)))try{navigator.mediaSession.setPositionState({duration:this.duration,playbackRate:this.audio.playbackRate,position:Math.min(this.currentTime,this.duration)})}catch{}}on(e,t){this.listeners[e]&&this.listeners[e].push(t)}off(e,t){this.listeners[e]&&(this.listeners[e]=this.listeners[e].filter(e=>e!==t))}notify(e,t){this.listeners[e]&&this.listeners[e].forEach(n=>{try{n(t)}catch(t){console.error(`Error in ${e} listener:`,t)}})}},o=class{constructor(e){this.onSelectPodcast=e,this.container=document.createElement(`div`),this.container.className=`view-container fade-in`}async render(){return this.container.innerHTML=`
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
    `,await this.loadData(),this.container}async loadData(){let e=await n.getAllPodcasts(),t=this.container.querySelector(`#series-hero-container`),r=this.container.querySelector(`#podcasts-grid`);if(e.length===0){r.innerHTML=`
        <div class="empty-state" style="grid-column: 1 / -1;">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"/>
          </svg>
          <h3>No podcasts subscribed yet</h3>
          <p>Explore the Discover tab or search to add your favorite shows.</p>
        </div>
      `,t.innerHTML=``;return}let a=e[0],o=await i.getPodcastSeriesStats(a.id);t.innerHTML=`
      <div class="series-stats-card" id="hero-card-${a.id}">
        <div class="stats-header">
          <div>
            <span class="stats-title">Featured Series Tracker</span>
            <div class="stats-highlight">${o.unplayedCount} ${o.unplayedCount===1?`Episode`:`Episodes`} Left</div>
          </div>
          <span class="podcast-card-badge">${o.percentComplete}% Finished</span>
        </div>
        <div class="stats-subtext">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span><strong>${o.formattedRemainingTime}</strong> remaining in <em>${a.title}</em></span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${o.percentComplete}%;"></div>
        </div>
      </div>
    `,t.querySelector(`.series-stats-card`)?.addEventListener(`click`,()=>{this.onSelectPodcast(a)}),r.innerHTML=``;for(let t of e){let e=await i.getPodcastSeriesStats(t.id),a=document.createElement(`div`);a.className=`podcast-card`,a.innerHTML=`
        <div style="position: relative;">
          <img class="podcast-card-cover" src="${t.cover}" alt="${t.title}" loading="lazy"/>
          <button class="card-action-overlay-btn card-remove-btn" title="Remove from library">
            ✕
          </button>
        </div>
        <div class="podcast-card-title">${t.title}</div>
        <div class="podcast-card-author">${t.author||``}</div>
        <div class="podcast-card-badge">
          ${e.unplayedCount} left
        </div>
      `,a.querySelector(`.card-remove-btn`).addEventListener(`click`,async e=>{e.stopPropagation(),e.preventDefault(),a.style.transition=`all 0.18s ease`,a.style.opacity=`0`,a.style.transform=`scale(0.8)`,await n.deletePodcast(t.id),setTimeout(()=>{this.loadData()},180)}),a.addEventListener(`click`,()=>{this.onSelectPodcast(t)}),r.appendChild(a)}}},s=class{constructor(e,t,n,r=null){this.podcast=e,this.onBack=t,this.onPlayEpisode=n,this.initialEpisodes=r,this.container=document.createElement(`div`),this.container.className=`view-container fade-in`,this.episodes=r||[],this.hidePlayed=!1,this.activeFilter=`all`,this.sortOrder=`newest`,this.selectedSeason=null,this.downloadingEpisodes=new Set,this.isSubscribed=!1}async render(){this.hidePlayed=await n.getSetting(`hidePlayed_${this.podcast.id}`,!1),this.sortOrder=await n.getSetting(`sortOrder_${this.podcast.id}`,`newest`);let e=await n.getPodcast(this.podcast.id);return this.isSubscribed=!!e,this.container.innerHTML=`
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
            <span class="podcast-card-badge">${(this.podcast.genres||[`Podcast`])[0]}</span>
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
          <button class="filter-chip ${this.activeFilter===`all`?`active`:``}" data-filter="all">All</button>
          <button class="filter-chip ${this.activeFilter===`unplayed`?`active`:``}" data-filter="unplayed">Unplayed</button>
          <button class="filter-chip ${this.activeFilter===`downloaded`?`active`:``}" data-filter="downloaded">Downloaded</button>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Sort Order Toggle Button -->
          <button class="sort-toggle-btn ${this.sortOrder===`oldest`?`active`:``}" id="btn-toggle-sort" title="Toggle date order: Oldest First vs Newest First">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M7 15l5 5 5-5"/>
              <path d="M7 9l5-5 5 5"/>
            </svg>
            <span id="sort-order-label">${this.sortOrder===`oldest`?`Oldest First`:`Newest First`}</span>
          </button>

          <!-- Option to remove/hide played episodes from specific podcast view -->
          <div class="ios-toggle-container" id="toggle-hide-played">
            <span class="ios-toggle-label">Hide Played</span>
            <div class="ios-switch ${this.hidePlayed?`checked`:``}" id="switch-hide-played">
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
    `,this.initEventListeners(),this.updateSubscriptionButtons(),await this.loadEpisodes(),this.container}updateSubscriptionButtons(){let e=this.container.querySelector(`#subscription-actions-mount`);if(e){if(this.isSubscribed){e.innerHTML=`
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="podcast-card-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--shield-light); font-size: 11px; padding: 4px 8px;">
            ✓ In Library
          </span>
          <button class="btn-remove-library" id="btn-remove-podcast" title="Remove from My Podcasts library">
            ✕ Remove
          </button>
        </div>
      `;let t=e.querySelector(`#btn-remove-podcast`);t.addEventListener(`click`,async e=>{e.stopPropagation(),e.preventDefault(),t.disabled=!0,t.textContent=`Removing...`,await n.deletePodcast(this.podcast.id),this.isSubscribed=!1,this.updateSubscriptionButtons()})}else e.innerHTML=`
        <button class="btn-add-library" id="btn-add-podcast">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          + Add to My Podcasts
        </button>
      `,e.querySelector(`#btn-add-podcast`).addEventListener(`click`,async()=>{await n.savePodcast(this.podcast),this.episodes.length>0&&await n.saveEpisodes(this.episodes),this.isSubscribed=!0,this.updateSubscriptionButtons()})}}initEventListeners(){this.container.querySelector(`#btn-back`).addEventListener(`click`,()=>{this.onBack()});let e=this.container.querySelector(`#toggle-hide-played`),t=this.container.querySelector(`#switch-hide-played`);e.addEventListener(`click`,async()=>{this.hidePlayed=!this.hidePlayed,t.classList.toggle(`checked`,this.hidePlayed),await n.setSetting(`hidePlayed_${this.podcast.id}`,this.hidePlayed),this.renderEpisodesList()});let r=this.container.querySelector(`#btn-toggle-sort`),i=this.container.querySelector(`#sort-order-label`);r&&r.addEventListener(`click`,async()=>{this.sortOrder=this.sortOrder===`newest`?`oldest`:`newest`,r.classList.toggle(`active`,this.sortOrder===`oldest`),i&&(i.textContent=this.sortOrder===`oldest`?`Oldest First`:`Newest First`),await n.setSetting(`sortOrder_${this.podcast.id}`,this.sortOrder),this.renderEpisodesList()});let a=this.container.querySelectorAll(`.filter-chip`);a.forEach(e=>{e.addEventListener(`click`,()=>{a.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),this.activeFilter=e.dataset.filter,this.renderEpisodesList()})})}async loadEpisodes(){if((!this.episodes||this.episodes.length===0)&&(this.episodes=await n.getEpisodesByPodcast(this.podcast.id)),!this.episodes||this.episodes.length===0){let e=this.podcast.itunesId;!e&&this.podcast.id&&this.podcast.id.startsWith(`itunes_`)&&(e=this.podcast.id.replace(`itunes_`,``));try{let t=await i.fetchPodcastWithEpisodesFromITunes(e||1348470106,this.podcast);this.podcast=t.podcast,this.episodes=t.episodes}catch(e){console.warn(`Episode loading error, generating fallback episodes:`,e),this.episodes=i.generatePlaceholderEpisodes(this.podcast,12)}}this.episodes&&this.episodes.length>0&&(this.episodes.forEach(e=>{e.podcastId=this.podcast.id}),this.isSubscribed&&await n.saveEpisodes(this.episodes));let e=this.container.querySelector(`#hero-ep-count`);e&&(e.textContent=`${this.episodes.length} Episodes Total`),this.renderSeasonTabs(),await this.updateSeriesStatsBanner(),this.renderEpisodesList()}getDetectedSeasons(){let e=new Set;return this.episodes.forEach(t=>{let n=t.title.match(/(?:^|\s)(?:S|Season\s*)(\d+)\b/i);n&&e.add(parseInt(n[1],10))}),Array.from(e).sort((e,t)=>e-t)}renderSeasonTabs(){let e=this.container.querySelector(`#season-pills-container`),t=this.getDetectedSeasons();if(t.length<=1){e.style.display=`none`;return}e.style.display=`block`,e.innerHTML=`
      <div style="font-size: 11px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 6px;">
        Filter by Season
      </div>
      <div class="category-scroll-bar">
        <button class="category-pill ${this.selectedSeason===null?`active`:``}" data-season="all">
          All Seasons (${this.episodes.length})
        </button>
        ${t.map(e=>`
          <button class="category-pill ${this.selectedSeason===e?`active`:``}" data-season="${e}">
            Season ${e}
          </button>
        `).join(``)}
      </div>
    `,e.querySelectorAll(`.category-pill`).forEach(t=>{t.addEventListener(`click`,()=>{e.querySelectorAll(`.category-pill`).forEach(e=>e.classList.remove(`active`)),t.classList.add(`active`);let n=t.dataset.season;this.selectedSeason=n===`all`?null:parseInt(n,10),this.renderEpisodesList()})})}async updateSeriesStatsBanner(){let e=this.container.querySelector(`#series-stats-container`),t=this.episodes.length,r=this.episodes.filter(e=>e.isPlayed).length,a=this.episodes.filter(e=>!e.isPlayed),o=a.length,s=a.reduce((e,t)=>{let n=t.duration||360,r=t.currentTime||0;return e+Math.max(0,n-r)},0),c=t>0?Math.round(r/t*100):0,l=i.formatDurationDetailed(s);e.innerHTML=`
      <div class="series-stats-card">
        <div class="stats-header">
          <div>
            <span class="stats-title">Series Remaining Tracker</span>
            <div class="stats-highlight">${o} ${o===1?`Episode`:`Episodes`} Left</div>
          </div>
          <span class="podcast-card-badge">${c}% Completed</span>
        </div>
        <div class="stats-subtext">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span><strong>${l}</strong> of listening time left in entire series</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${c}%;"></div>
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
    `;let u=e.querySelector(`#hero-btn-play-oldest`);u&&u.addEventListener(`click`,async()=>{this.sortOrder=`oldest`;let e=this.container.querySelector(`#btn-toggle-sort`),t=this.container.querySelector(`#sort-order-label`);e&&e.classList.add(`active`),t&&(t.textContent=`Oldest First`),await n.setSetting(`sortOrder_${this.podcast.id}`,`oldest`);let r=[...this.episodes].sort((e,t)=>{let n=e.pubDate?new Date(e.pubDate).getTime():0,r=t.pubDate?new Date(t.pubDate).getTime():0;if(n!==r)return n-r;let i=e.title.match(/(?:E|EP|Episode)\s*(\d+)/i),a=t.title.match(/(?:E|EP|Episode)\s*(\d+)/i);return i&&a?parseInt(i[1],10)-parseInt(a[1],10):0}),i=r.find(e=>!e.isPlayed)||r[0];i&&(this.renderEpisodesList(),this.onPlayEpisode(i,this.podcast,r))})}renderEpisodesList(){let e=this.container.querySelector(`#episodes-container`);if(!e)return;let t=[...this.episodes];if(this.selectedSeason!==null&&(t=t.filter(e=>{let t=e.title.match(/(?:^|\s)(?:S|Season\s*)(\d+)\b/i);return t&&parseInt(t[1],10)===this.selectedSeason})),this.hidePlayed&&(t=t.filter(e=>!e.isPlayed)),this.activeFilter===`unplayed`?t=t.filter(e=>!e.isPlayed):this.activeFilter===`downloaded`&&(t=t.filter(e=>e.isDownloaded)),t.sort((e,t)=>{let n=e.pubDate?new Date(e.pubDate).getTime():0,r=t.pubDate?new Date(t.pubDate).getTime():0;if(n!==r)return this.sortOrder===`oldest`?n-r:r-n;let i=e.title.match(/(?:E|EP|Episode)\s*(\d+)/i),a=t.title.match(/(?:E|EP|Episode)\s*(\d+)/i);if(i&&a){let e=parseInt(i[1],10),t=parseInt(a[1],10);return this.sortOrder===`oldest`?e-t:t-e}return 0}),t.length===0){e.innerHTML=`
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M5 13l4 4L19 7"/>
          </svg>
          <h3>No episodes to show</h3>
          <p>${this.hidePlayed?`All played episodes are hidden. Turn off "Hide Played" to view past episodes.`:`No episodes match the selected filter.`}</p>
        </div>
      `;return}e.innerHTML=``,t.forEach(r=>{let o=a.currentEpisode?.id===r.id&&a.isPlaying,s=(r.adSegments||[]).length,c=this.downloadingEpisodes.has(r.id),l=document.createElement(`div`);l.className=`episode-item ${r.isPlayed?`played`:``}`,l.id=`ep-card-${r.id}`,l.innerHTML=`
        <div class="episode-top-row">
          <span class="episode-date">${r.pubDate?new Date(r.pubDate).toLocaleDateString(void 0,{month:`short`,day:`numeric`,year:`numeric`}):``}</span>
          <button class="played-toggle-btn" title="Toggle Played Status">
            ${r.isPlayed?`Mark Unplayed`:`Mark Played`}
          </button>
        </div>

        <h3 class="episode-title">${r.title}</h3>
        <p class="episode-desc">${r.description}</p>

        <div class="episode-actions-row">
          <button class="episode-play-pill ${o?`playing`:``}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              ${o?`<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`:`<polygon points="5 3 19 12 5 21 5 3"/>`}
            </svg>
            <span>${o?`Playing`:i.formatTimeShort(r.duration)}</span>
          </button>

          <div class="episode-item-badges">
            ${s>0?`
              <span class="ad-skip-tag" title="Automatic ad skip enabled">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Ad-Free
              </span>
            `:``}

            <!-- Prominent Download Button -->
            <button class="download-pill-btn ${r.isDownloaded?`downloaded`:``} ${c?`downloading`:``}" title="${r.isDownloaded?`Downloaded (Tap to remove)`:`Download for Offline`}">
              ${c?`
                <div class="download-spinner"></div>
                <span>Downloading...</span>
              `:r.isDownloaded?`
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span>Downloaded</span>
              `:`
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
      `,l.querySelector(`.episode-play-pill`).addEventListener(`click`,()=>{this.onPlayEpisode(r,this.podcast,t)});let u=l.querySelector(`.played-toggle-btn`);u.addEventListener(`click`,async e=>{e.stopPropagation();let t=!r.isPlayed;await n.markEpisodePlayed(r.id,t),r.isPlayed=t,await this.updateSeriesStatsBanner(),this.hidePlayed||this.activeFilter===`unplayed`?this.renderEpisodesList():(l.classList.toggle(`played`,t),u.textContent=t?`Mark Unplayed`:`Mark Played`)}),l.querySelector(`.download-pill-btn`).addEventListener(`click`,async e=>{if(e.stopPropagation(),r.isDownloaded){await n.deleteEpisodeAudio(r.id),r.isDownloaded=!1,this.renderEpisodesList();return}this.downloadingEpisodes.add(r.id),this.renderEpisodesList();try{await i.downloadEpisode(r)}catch{alert(`Download completed with offline audio stream.`)}finally{this.downloadingEpisodes.delete(r.id),this.renderEpisodesList()}}),e.appendChild(l)})}},c=[{id:`trending`,label:`🔥 Trending`,query:null},{id:`kids`,label:`👶 Kids & Family`,query:`Kids & Family`},{id:`fiction`,label:`📚 Fiction & Stories`,query:`Fiction Audio Drama`},{id:`crime`,label:`🔪 True Crime`,query:`True Crime`},{id:`tech`,label:`💻 Technology`,query:`Technology`},{id:`comedy`,label:`🎙️ Comedy`,query:`Comedy`},{id:`news`,label:`📰 News & Politics`,query:`News`},{id:`science`,label:`🔬 Science`,query:`Science`},{id:`health`,label:`💪 Health & Fitness`,query:`Health`},{id:`business`,label:`💼 Business`,query:`Business`}],l=class{constructor(e){this.onSelectPodcast=e,this.container=document.createElement(`div`),this.container.className=`view-container fade-in`,this.activeCategory=`trending`}async render(){return this.container.innerHTML=`
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
        ${c.map(e=>`
          <button class="category-pill ${e.id===this.activeCategory?`active`:``}" data-cat-id="${e.id}">
            ${e.label}
          </button>
        `).join(``)}
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
    `,this.initEventListeners(),this.renderCuratedList(),this.container}initEventListeners(){let e=this.container.querySelector(`#podcast-search-input`),t=null;e.addEventListener(`input`,e=>{clearTimeout(t);let n=e.target.value.trim();if(!n){this.selectCategory(this.activeCategory);return}t=setTimeout(()=>{this.performSearch(n)},400)});let r=this.container.querySelectorAll(`.category-pill`);r.forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.catId;r.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),this.activeCategory=t,this.selectCategory(t)})});let a=this.container.querySelector(`#rss-import-btn`),o=this.container.querySelector(`#rss-feed-input`);a.addEventListener(`click`,async()=>{let e=o.value.trim();if(e){a.disabled=!0,a.textContent=`Importing...`;try{let{podcast:t,episodes:r}=await i.fetchAndParseFeed(e);await n.savePodcast(t),await n.saveEpisodes(r),o.value=``,this.onSelectPodcast(t)}catch(e){alert(`Could not import RSS feed: `+(e.message||`Check URL and try again.`))}finally{a.disabled=!1,a.textContent=`Import`}}})}async selectCategory(e){let t=c.find(t=>t.id===e);if(!t)return;if(!t.query){this.renderCuratedList();return}let n=this.container.querySelector(`#discover-grid`),r=this.container.querySelector(`#discover-section-title`),a=this.container.querySelector(`#discover-count-badge`);if(!n)return;r.textContent=t.label,a.textContent=`Top Shows`,n.innerHTML=`
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="download-spinner"></div>
        <p>Loading ${t.label} podcasts...</p>
      </div>
    `;let o=await i.searchPodcasts(t.query);this.renderPodcastCards(o,n)}renderCuratedList(){let e=this.container.querySelector(`#discover-grid`),t=this.container.querySelector(`#discover-section-title`),n=this.container.querySelector(`#discover-count-badge`);e&&(t.textContent=`Trending Series`,n.textContent=`${r.length} Featured`,this.renderPodcastCards(r,e))}async performSearch(e){let t=this.container.querySelector(`#discover-grid`),n=this.container.querySelector(`#discover-section-title`),r=this.container.querySelector(`#discover-count-badge`);if(!t)return;n.textContent=`Results: "${e}"`,r.textContent=`Searching...`,t.innerHTML=`
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="download-spinner"></div>
        <p>Searching iTunes directory...</p>
      </div>
    `;let a=await i.searchPodcasts(e);if(r.textContent=`${a.length} found`,a.length===0){t.innerHTML=`
        <div class="empty-state" style="grid-column: 1 / -1;">
          <p>No podcasts found matching "${e}". Try another term or paste an RSS feed URL above.</p>
        </div>
      `;return}this.renderPodcastCards(a,t)}async renderPodcastCards(e,t){t.innerHTML=``;for(let r of e){let e=!!await n.getPodcast(r.id),a=document.createElement(`div`);a.className=`podcast-card`,a.innerHTML=`
        <div style="position: relative;">
          <img class="podcast-card-cover" src="${r.cover}" alt="${r.title}" loading="lazy" />
          <button class="card-action-overlay-btn card-add-btn ${e?`added`:``}" id="add-btn-${r.id}" title="${e?`In Library`:`Add to My Podcasts`}">
            ${e?`✓`:`+`}
          </button>
        </div>
        <div class="podcast-card-title">${r.title}</div>
        <div class="podcast-card-author">${r.author||``}</div>
        <div class="podcast-card-badge">${(r.genres||[])[0]||`Podcast`}</div>
      `;let o=a.querySelector(`.card-add-btn`);o.addEventListener(`click`,async e=>{if(e.stopPropagation(),e.preventDefault(),o.classList.contains(`added`)){await n.deletePodcast(r.id),o.classList.remove(`added`),o.textContent=`+`,o.title=`Add to My Podcasts`;return}o.innerHTML=`<div class="download-spinner" style="width:10px;height:10px;"></div>`;try{let e=r,t=[];if(r.itunesId){let n=await i.fetchPodcastWithEpisodesFromITunes(r.itunesId,r);e=n.podcast,t=n.episodes}else t=r.episodes?r.episodes:i.generatePlaceholderEpisodes(r,6);await n.savePodcast(e),t&&t.length>0&&await n.saveEpisodes(t),o.classList.add(`added`),o.textContent=`✓`,o.title=`In Library`}catch(e){o.textContent=`+`,console.error(`Error adding podcast:`,e)}}),a.addEventListener(`click`,async()=>{a.style.opacity=`0.6`,a.style.pointerEvents=`none`;let e=a.querySelector(`.podcast-card-badge`);e&&(e.textContent=`Loading...`);try{let e=r,t=[];if(r.itunesId){let n=await i.fetchPodcastWithEpisodesFromITunes(r.itunesId,r);e=n.podcast,t=n.episodes}else if(r.episodes)t=r.episodes;else if(r.feedUrl)try{let n=await i.fetchAndParseFeed(r.feedUrl);e=n.podcast,t=n.episodes}catch{t=i.generatePlaceholderEpisodes(r,6)}else t=i.generatePlaceholderEpisodes(r,6);await this.onSelectPodcast(e,t)}catch(e){console.error(`Error opening podcast:`,e),alert(`Could not load episodes for this podcast: `+(e.message||`Please try again.`))}finally{a.style.opacity=`1`,a.style.pointerEvents=`auto`,e&&(e.textContent=(r.genres||[])[0]||`Podcast`)}}),t.appendChild(a)}}},u=class{constructor(e){this.onPlayEpisode=e,this.container=document.createElement(`div`),this.container.className=`view-container fade-in`,this.isSimulatingOffline=!1}async render(){return this.container.innerHTML=`
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
    `,this.initEventListeners(),await this.loadDownloadedEpisodes(),this.container}initEventListeners(){let e=this.container.querySelector(`#switch-simulate-offline`);e.addEventListener(`click`,()=>{this.isSimulatingOffline=!this.isSimulatingOffline,e.classList.toggle(`checked`,this.isSimulatingOffline);let t=document.getElementById(`offline-banner`);t&&(t.classList.toggle(`hidden`,!this.isSimulatingOffline&&navigator.onLine),t.textContent=this.isSimulatingOffline?`⚡ Airplane Mode (Offline Simulation) Active — Playing from Local Blobs`:`Offline Mode — Playing from local downloads`)}),this.container.querySelector(`#clear-all-downloads-btn`).addEventListener(`click`,async()=>{if(confirm(`Delete all offline downloaded episodes to free device storage?`)){let e=await n.getAllDownloadedAudios();for(let t of e)await n.deleteEpisodeAudio(t.episodeId);await this.loadDownloadedEpisodes()}})}async loadDownloadedEpisodes(){let e=this.container.querySelector(`#downloaded-episodes-container`),t=this.container.querySelector(`#storage-used-label`),r=this.container.querySelector(`#download-count-label`),i=(await n.getAllEpisodes()).filter(e=>e.isDownloaded);if(t.textContent=`${(await n.getTotalStorageUsage()/1048576).toFixed(1)} MB Used`,r.textContent=`${i.length} episode${i.length===1?``:`s`} downloaded`,i.length===0){e.innerHTML=`
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          <h3>No offline downloads yet</h3>
          <p>Tap the download icon on any episode to save it for listening without internet.</p>
        </div>
      `;return}e.innerHTML=``;for(let t of i){let r=await n.getPodcast(t.podcastId),i=document.createElement(`div`);i.className=`episode-item`;let o=a.currentEpisode?.id===t.id&&a.isPlaying;i.innerHTML=`
        <div class="episode-top-row">
          <span class="episode-date" style="color: var(--shield-light);">✓ Offline Ready</span>
          <button class="played-toggle-btn" style="color: #f87171;" id="delete-dl-${t.id}">
            Delete
          </button>
        </div>

        <h3 class="episode-title">${t.title}</h3>
        <p class="episode-desc">${r?r.title:`Podcast`}</p>

        <div class="episode-actions-row">
          <button class="episode-play-pill ${o?`playing`:``}" id="play-dl-${t.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              ${o?`<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`:`<polygon points="5 3 19 12 5 21 5 3"/>`}
            </svg>
            <span>${o?`Playing`:`Play Offline`}</span>
          </button>

          <span class="ad-skip-tag">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Ad-Free
          </span>
        </div>
      `,i.querySelector(`#play-dl-${t.id}`).addEventListener(`click`,()=>{this.onPlayEpisode(t,r||{title:`Downloaded Show`,cover:`/icon.svg`})}),i.querySelector(`#delete-dl-${t.id}`).addEventListener(`click`,async()=>{await n.deleteEpisodeAudio(t.id),await this.loadDownloadedEpisodes()}),e.appendChild(i)}}},d=class{constructor(e){this.onPlayEpisode=e,this.container=document.createElement(`div`),this.container.className=`view-container fade-in`}async render(){let e=await n.getAdStats(),t=await n.getSetting(`autoSkipAds`,!0),r=await n.getSetting(`skipIntroEnabled`,!1),a=await n.getSetting(`skipIntroSeconds`,30),o=await n.getSetting(`skipOutroEnabled`,!1),s=await n.getSetting(`skipOutroSeconds`,60),c=i.formatDurationDetailed(e.totalSecondsSaved||0);return this.container.innerHTML=`
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
          <div class="metric-value" id="stat-time-saved">${c}</div>
          <span style="font-size: 11px; color: var(--text-tertiary);">Zero commercial downtime</span>
        </div>
        <div class="shield-metric-card">
          <span class="metric-label">Ads Skipped</span>
          <div class="metric-value" id="stat-ads-skipped">${e.totalAdsSkipped||0}</div>
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
          <div class="ios-switch ${t?`checked`:``}" id="switch-auto-skip">
            <div class="thumb"></div>
          </div>
        </div>

        <!-- Skip Intro Preroll -->
        <div class="shield-setting-row">
          <div>
            <div class="setting-title">Skip Intro Preroll (${a}s)</div>
            <div class="setting-desc">Jump past repetitive opening theme music and network announcements</div>
          </div>
          <div class="ios-switch ${r?`checked`:``}" id="switch-skip-intro">
            <div class="thumb"></div>
          </div>
        </div>

        <!-- Skip Outro Postroll -->
        <div class="shield-setting-row">
          <div>
            <div class="setting-title">Skip Outro Credits (${s}s)</div>
            <div class="setting-desc">Skip end-of-episode credits, disclaimers, and trailing promo plugs</div>
          </div>
          <div class="ios-switch ${o?`checked`:``}" id="switch-skip-outro">
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
    `,this.initEventListeners(),this.container}initEventListeners(){let e=this.container.querySelector(`#switch-auto-skip`);e.addEventListener(`click`,async()=>{let t=!e.classList.contains(`checked`);e.classList.toggle(`checked`,t),a.setAutoSkipAds(t),await n.setSetting(`autoSkipAds`,t)});let t=this.container.querySelector(`#switch-skip-intro`);t.addEventListener(`click`,async()=>{let e=!t.classList.contains(`checked`);t.classList.toggle(`checked`,e),a.skipIntroEnabled=e,await n.setSetting(`skipIntroEnabled`,e)});let r=this.container.querySelector(`#switch-skip-outro`);r.addEventListener(`click`,async()=>{let e=!r.classList.contains(`checked`);r.classList.toggle(`checked`,e),a.skipOutroEnabled=e,await n.setSetting(`skipOutroEnabled`,e)}),this.container.querySelector(`#btn-reset-stats`).addEventListener(`click`,async()=>{confirm(`Reset saved time and ads skipped counters?`)&&(await n.setSetting(`adStats`,{totalAdsSkipped:0,totalSecondsSaved:0}),this.container.querySelector(`#stat-time-saved`).textContent=`0 mins`,this.container.querySelector(`#stat-ads-skipped`).textContent=`0`)}),this.container.querySelector(`#btn-test-ad-skip`).addEventListener(`click`,async()=>{await this.onPlayEpisode({id:`ep-test-demo`,podcastId:`pod-huberman`,title:`⚡ Live Ad-Skip Test Track (Demo)`,description:`This demo contains a marked sponsor ad break at 00:02 to 00:08. Watch the player automatically detect and jump right past it!`,duration:30,audioUrl:`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`,currentTime:0,isPlayed:!1,isDownloaded:!1,adSegments:[{id:`ad-demo-test`,episodeId:`ep-test-demo`,start:2,end:8,type:`sponsor`,label:`Test Sponsor: HyperSpeed VPN (6s Ad)`}]},{id:`pod-demo`,title:`PodPulse Ad-Shield Live Demo`,author:`Ad-Free Demonstration`,cover:`/icon.svg`})})}},f=class{constructor(e){this.onExpand=e,this.container=document.createElement(`div`),this.container.className=`mini-player-container hidden`,this.container.id=`app-mini-player`,this.render(),this.initListeners()}render(){return this.container.innerHTML=`
      <img class="mini-cover" id="mini-cover" src="/icon.svg" alt="Cover" />
      <div class="mini-info">
        <div class="mini-title" id="mini-title">No episode playing</div>
        <div class="mini-subtitle">
          <span id="mini-subtitle">PodPulse</span>
          <span>•</span>
          <span class="ad-free-tag">⚡ Ad-Free</span>
        </div>
      </div>
      <div class="mini-controls">
        <button class="mini-btn play-btn" id="mini-play-btn" aria-label="Play/Pause">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" id="mini-play-icon">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </button>
        <button class="mini-btn" id="mini-forward-btn" aria-label="Skip 30 seconds">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="13 17 18 12 13 7"/>
            <polyline points="6 17 11 12 6 7"/>
          </svg>
        </button>
      </div>
      <div class="mini-progress-bar">
        <div class="mini-progress-fill" id="mini-progress-fill"></div>
      </div>
    `,this.container}initListeners(){this.container.addEventListener(`click`,e=>{e.target.closest(`.mini-btn`)||this.onExpand()}),this.container.querySelector(`#mini-play-btn`).addEventListener(`click`,e=>{e.stopPropagation(),a.togglePlay()}),this.container.querySelector(`#mini-forward-btn`).addEventListener(`click`,e=>{e.stopPropagation(),a.skip(30)}),a.on(`stateChange`,()=>{this.updateUI()}),a.on(`timeUpdate`,({currentTime:e,duration:t})=>{if(t>0){let n=e/t*100,r=this.container.querySelector(`#mini-progress-fill`);r&&(r.style.width=`${n}%`)}})}updateUI(){let e=a.currentEpisode,t=a.currentPodcast;if(!e){this.container.classList.add(`hidden`);return}this.container.classList.remove(`hidden`);let n=this.container.querySelector(`#mini-cover`),r=this.container.querySelector(`#mini-title`),i=this.container.querySelector(`#mini-subtitle`),o=this.container.querySelector(`#mini-play-icon`);n&&(n.src=t?.cover||`/icon.svg`),r&&(r.textContent=e.title),i&&(i.textContent=t?.title||`Podcast`),o&&(o.innerHTML=a.isPlaying?`<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`:`<polygon points="5 3 19 12 5 21 5 3"/>`)}},p=class{constructor(){this.container=document.createElement(`div`),this.container.className=`player-sheet-modal`,this.container.id=`full-player-sheet`,this.isOpen=!1,this.isDragging=!1,this.render(),this.initListeners()}render(){return this.container.innerHTML=`
      <div class="ambient-background-blur" id="player-ambient-bg"></div>

      <div class="player-sheet-content">
        <!-- Top Bar with iOS Drag Handle -->
        <div class="player-sheet-top-bar">
          <button class="sheet-close-btn" id="btn-sheet-close" aria-label="Close player">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div class="sheet-drag-handle"></div>
          <div style="width: 36px;"></div> <!-- balance spacer -->
        </div>

        <!-- Big Cover Art -->
        <div class="player-artwork-wrapper" id="player-artwork-wrapper">
          <img class="player-artwork-img" id="player-cover-img" src="/icon.svg" alt="Episode Cover" />
          <div class="player-ad-shield-badge">
            <div class="shield-pulse"></div>
            <span>Ad Shield Active</span>
          </div>
        </div>

        <!-- Track Metadata -->
        <div class="player-meta-container">
          <h2 class="player-track-title" id="player-track-title">Episode Title</h2>
          <div class="player-track-podcast" id="player-track-podcast">Podcast Show</div>
          <div class="player-track-author" id="player-track-author">Author / Host</div>
        </div>

        <!-- Scrubber Section with Ad Highlights -->
        <div class="scrubber-section">
          <div class="scrubber-track-container" id="scrubber-touch-area">
            <div class="scrubber-track-bg" id="scrubber-bg">
              <!-- Ad Highlight Marker Blocks will be inserted here dynamically -->
              <div class="scrubber-progress-fill" id="scrubber-fill"></div>
            </div>
            <div class="scrubber-thumb" id="scrubber-thumb"></div>
          </div>
          <div class="scrubber-timestamps">
            <span id="player-time-current">0:00</span>
            <span id="player-time-remaining">-0:00</span>
          </div>
        </div>

        <!-- Main Transport Controls -->
        <div class="transport-controls-row">
          <button class="transport-btn skip-btn" id="btn-skip-back-15" aria-label="Rewind 15 seconds">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M1 4v6h6"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
            <span class="skip-sec-badge">15</span>
          </button>

          <button class="transport-btn play-pause-big" id="btn-player-play-pause" aria-label="Play / Pause">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" id="player-big-icon">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>

          <button class="transport-btn skip-btn" id="btn-skip-fwd-30" aria-label="Forward 30 seconds">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M23 4v6h-6"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span class="skip-sec-badge">30</span>
          </button>
        </div>

        <!-- Secondary Toolbar (Speed, Sleep Timer, Mark Ad) -->
        <div class="player-secondary-toolbar">
          <button class="tool-pill-btn" id="btn-speed-toggle">
            <span id="btn-speed-label">1.0x</span>
          </button>

          <button class="tool-pill-btn" id="btn-sleep-toggle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span id="btn-sleep-label">Timer</span>
          </button>

          <button class="tool-pill-btn" id="btn-mark-ad-marker">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span>+ Mark Ad</span>
          </button>
        </div>

        <!-- Detected Ad Segments in this Episode -->
        <div class="player-segments-section" id="player-segments-section">
          <div class="segments-header">
            <span>⚡ Detected Sponsor Segments</span>
            <span style="font-size: 11px; color: var(--shield-light);">Auto-Skip Enabled</span>
          </div>
          <div id="player-ad-cards-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
      </div>
    `,this.container}initListeners(){this.container.querySelector(`#btn-sheet-close`).addEventListener(`click`,()=>{this.close()}),this.container.querySelector(`#btn-player-play-pause`).addEventListener(`click`,()=>{a.togglePlay()}),this.container.querySelector(`#btn-skip-back-15`).addEventListener(`click`,()=>{a.skip(-15)}),this.container.querySelector(`#btn-skip-fwd-30`).addEventListener(`click`,()=>{a.skip(30)});let e=[.8,1,1.25,1.5,2],t=this.container.querySelector(`#btn-speed-toggle`),n=this.container.querySelector(`#btn-speed-label`);t.addEventListener(`click`,()=>{let t=e.indexOf(a.playbackRate);t===-1&&(t=1);let r=e[(t+1)%e.length];a.setPlaybackRate(r),n.textContent=`${r}x`});let r=[0,15,30,45,60],o=this.container.querySelector(`#btn-sleep-toggle`),s=this.container.querySelector(`#btn-sleep-label`),c=0;o.addEventListener(`click`,()=>{c=(c+1)%r.length;let e=r[c];a.setSleepTimer(e),s.textContent=e>0?`${e}m`:`Timer`,o.classList.toggle(`active`,e>0)}),this.container.querySelector(`#btn-mark-ad-marker`).addEventListener(`click`,async()=>{let e=Math.floor(a.currentTime),t=e+45,n=prompt(`Mark sponsor ad segment (e.g. "Sponsor: Athletic Greens"):`,`Sponsor Break`);n&&(await a.addCustomAdSegment(e,t,n),this.renderAdMarkersOnScrubber(),this.renderAdSegmentsList(),alert(`Ad segment bookmarked at ${i.formatTimeShort(e)} - ${i.formatTimeShort(t)}. Will auto-skip seamlessly!`))});let l=this.container.querySelector(`#scrubber-touch-area`),u=e=>{let t=l.getBoundingClientRect(),n=e.touches?e.touches[0].clientX:e.clientX,r=Math.max(0,Math.min(1,(n-t.left)/t.width));a.duration>0&&a.seek(r*a.duration)};l.addEventListener(`mousedown`,e=>{this.isDragging=!0,u(e);let t=e=>{this.isDragging&&u(e)},n=()=>{this.isDragging=!1,window.removeEventListener(`mousemove`,t),window.removeEventListener(`mouseup`,n)};window.addEventListener(`mousemove`,t),window.addEventListener(`mouseup`,n)}),l.addEventListener(`touchstart`,e=>{this.isDragging=!0,u(e)},{passive:!0}),l.addEventListener(`touchmove`,e=>{this.isDragging&&u(e)},{passive:!0}),l.addEventListener(`touchend`,()=>{this.isDragging=!1}),a.on(`stateChange`,()=>{this.updateTrackInfo()}),a.on(`timeUpdate`,({currentTime:e,duration:t})=>{this.updateScrubber(e,t)})}open(){this.isOpen=!0,this.container.classList.add(`open`),this.updateTrackInfo()}close(){this.isOpen=!1,this.container.classList.remove(`open`)}updateTrackInfo(){let e=a.currentEpisode,t=a.currentPodcast;if(!e)return;let n=this.container.querySelector(`#player-ambient-bg`),r=this.container.querySelector(`#player-cover-img`),i=this.container.querySelector(`#player-track-title`),o=this.container.querySelector(`#player-track-podcast`),s=this.container.querySelector(`#player-track-author`),c=this.container.querySelector(`#player-big-icon`),l=this.container.querySelector(`#player-artwork-wrapper`),u=t?.cover||`/icon.svg`;n.style.backgroundImage=`url(${u})`,r.src=u,i.textContent=e.title,o.textContent=t?.title||`Podcast`,s.textContent=t?.author||``,a.isPlaying?(l.classList.add(`playing`),c.innerHTML=`<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`):(l.classList.remove(`playing`),c.innerHTML=`<polygon points="5 3 19 12 5 21 5 3"/>`),this.renderAdMarkersOnScrubber(),this.renderAdSegmentsList()}renderAdMarkersOnScrubber(){let e=this.container.querySelector(`#scrubber-bg`),t=a.duration||a.currentEpisode?.duration||1;e.querySelectorAll(`.ad-segment-marker-block`).forEach(e=>e.remove()),(a.currentAdSegments||[]).forEach(n=>{if(n.start!==void 0&&n.end!==void 0&&t>0){let r=n.start/t*100,a=Math.max(1,(n.end-n.start)/t*100),o=document.createElement(`div`);o.className=`ad-segment-marker-block`,o.style.left=`${r}%`,o.style.width=`${a}%`,o.title=`${n.label} (${i.formatTimeShort(n.start)} - ${i.formatTimeShort(n.end)})`,e.appendChild(o)}})}renderAdSegmentsList(){let e=this.container.querySelector(`#player-ad-cards-list`),t=a.currentAdSegments||[];if(t.length===0){e.innerHTML=`
        <div style="font-size: 12px; color: var(--text-tertiary); padding: 8px 0;">
          No sponsor segments detected in this episode.
        </div>
      `;return}e.innerHTML=``,t.forEach(t=>{let n=document.createElement(`div`);n.className=`ad-card-item`,n.innerHTML=`
        <div class="ad-card-info">
          <span class="ad-card-label">${t.label||`Sponsor Break`}</span>
          <span class="ad-card-time">
            ${i.formatTimeShort(t.start)} – ${i.formatTimeShort(t.end)}
            (${Math.round(t.end-t.start)}s)
          </span>
        </div>
        <button class="ad-jump-btn" id="btn-jump-${t.id||t.start}">
          Skip Ahead
        </button>
      `,n.querySelector(`#btn-jump-${t.id||t.start}`).addEventListener(`click`,()=>{a.seek(t.end+.2)}),e.appendChild(n)})}updateScrubber(e,t){if(this.isDragging)return;let n=this.container.querySelector(`#player-time-current`),r=this.container.querySelector(`#player-time-remaining`),a=this.container.querySelector(`#scrubber-fill`),o=this.container.querySelector(`#scrubber-thumb`);n.textContent=i.formatTimeShort(e);let s=Math.max(0,t-e);if(r.textContent=`-${i.formatTimeShort(s)}`,t>0){let n=e/t*100;a.style.width=`${n}%`,o.style.left=`${n}%`}}},m=class{constructor(){this.container=document.createElement(`div`),this.container.className=`modal-overlay`,this.container.id=`ios-install-modal`,this.render()}render(){let e=window.location.origin.includes(`localhost`)?`http://192.168.0.120:5173`:window.location.origin,t=`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(e)}&bgcolor=090B10&color=8b5cf6&margin=1`;this.container.innerHTML=`
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
              <img src="${t}" width="140" height="140" alt="Scan with iPhone Camera" style="display: block; border-radius: 8px;" />
            </div>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
            Scan with your <strong>iPhone Camera</strong> or type in <strong>Safari</strong>:
          </div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 8px;">
            <code style="background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 6px; color: #a5b4fc; font-size: 13px; font-weight: 600;">${e}</code>
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
    `,this.container.querySelector(`#close-install-modal`).addEventListener(`click`,()=>this.close()),this.container.querySelector(`#got-it-install-btn`).addEventListener(`click`,()=>this.close());let n=this.container.querySelector(`#copy-pwa-url-btn`);return n&&n.addEventListener(`click`,()=>{navigator.clipboard.writeText(e),n.textContent=`Copied!`,setTimeout(()=>n.textContent=`Copy`,2e3)}),this.container.addEventListener(`click`,e=>{e.target===this.container&&this.close()}),this.container}open(){this.container.classList.add(`open`)}close(){this.container.classList.remove(`open`)}},h=class{constructor(){this.viewport=document.getElementById(`main-viewport`),this.currentTab=`library`,this.currentView=null,this.miniPlayer=null,this.playerModal=null,this.installPrompt=null,this.init()}async init(){if(`serviceWorker`in navigator&&window.location.protocol.startsWith(`http`))try{await navigator.serviceWorker.register(`./sw.js`),console.log(`PodPulse Service Worker registered.`)}catch(e){console.warn(`Service worker registration failed:`,e)}this.playerModal=new p,document.getElementById(`player-modal-mount`).appendChild(this.playerModal.container),this.miniPlayer=new f(()=>{this.playerModal.open()}),document.getElementById(`mini-player-mount`).appendChild(this.miniPlayer.container),this.installPrompt=new m,document.getElementById(`install-modal-mount`).appendChild(this.installPrompt.container),this.initGlobalListeners(),this.initNetworkListeners(),this.initAdSkipHUD(),await this.switchTab(`library`)}initGlobalListeners(){document.querySelectorAll(`.tab-button`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.tab;this.switchTab(t)})}),document.getElementById(`brand-home-btn`).addEventListener(`click`,()=>{this.switchTab(`library`)}),document.getElementById(`header-shield-pill`).addEventListener(`click`,()=>{this.switchTab(`adshield`)}),document.getElementById(`header-install-btn`).addEventListener(`click`,()=>{this.installPrompt.open()})}initNetworkListeners(){let e=document.getElementById(`offline-banner`),t=()=>{if(!navigator.onLine)e.classList.remove(`hidden`),e.textContent=`Offline Mode — Playing from local downloads`;else{let t=document.getElementById(`switch-simulate-offline`);(!t||!t.classList.contains(`checked`))&&e.classList.add(`hidden`)}};window.addEventListener(`online`,t),window.addEventListener(`offline`,t),t()}initAdSkipHUD(){let e=document.getElementById(`hud-toast-container`);a.on(`adSkipped`,({segment:t,secondsSaved:n})=>{let r=document.createElement(`div`);r.className=`hud-toast`,r.innerHTML=`
        <svg class="bolt-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        <span>Auto-Skipped ${n}s Ad (${t.label||`Sponsor Read`})</span>
      `,e.appendChild(r),setTimeout(()=>{r.style.opacity=`0`,r.style.transform=`translateY(-20px)`,r.style.transition=`all 0.3s ease`,setTimeout(()=>r.remove(),300)},3500)})}async switchTab(e){this.currentTab=e,document.querySelectorAll(`.tab-button`).forEach(t=>{t.classList.toggle(`active`,t.dataset.tab===e)}),this.viewport.innerHTML=``,e===`library`?this.currentView=new o(e=>{this.openPodcastDetail(e)}):e===`discover`?this.currentView=new l((e,t)=>{this.openPodcastDetail(e,t)}):e===`downloads`?this.currentView=new u((e,t)=>{this.playEpisode(e,t)}):e===`adshield`&&(this.currentView=new d((e,t)=>{this.playEpisode(e,t)}));let t=await this.currentView.render();this.viewport.appendChild(t)}async openPodcastDetail(e,t=null){let n=this.currentTab;try{let r=new s(e,()=>this.switchTab(n||`discover`),(e,t,n)=>this.playEpisode(e,t,n),t),i=await r.render();this.currentView=r,this.viewport.innerHTML=``,this.viewport.appendChild(i)}catch(e){console.error(`Failed to open podcast detail:`,e),this.viewport.innerHTML=`
        <div class="view-container">
          <button class="back-btn" id="error-back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back
          </button>
          <div class="empty-state">
            <h3>Could not load show</h3>
            <p>${e.message||`An unexpected error occurred while loading this podcast.`}</p>
          </div>
        </div>
      `,this.viewport.querySelector(`#error-back-btn`)?.addEventListener(`click`,()=>{this.switchTab(n||`discover`)})}}async playEpisode(e,t,n=null){try{await a.playEpisode(e,t,n),this.miniPlayer.updateUI()}catch(e){alert(e.message||`Unable to start audio playback.`)}}};document.addEventListener(`DOMContentLoaded`,()=>{window.app=new h});