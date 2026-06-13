const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = `${window.location.origin}${import.meta.env.BASE_URL}`;
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-top-read',
  'playlist-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64urlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateCodeVerifier() {
  const arr = new Uint8Array(64);
  crypto.getRandomValues(arr);
  return base64urlEncode(arr.buffer);
}

export async function initiateSpotifyLogin() {
  const verifier = generateCodeVerifier();
  const challenge = base64urlEncode(await sha256(verifier));

  sessionStorage.setItem('spotify_verifier', verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function exchangeCodeForToken(code) {
  const verifier = sessionStorage.getItem('spotify_verifier');
  if (!verifier) throw new Error('No PKCE verifier found');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) throw new Error('Token exchange failed');
  const data = await res.json();
  sessionStorage.removeItem('spotify_verifier');

  const expiry = Date.now() + data.expires_in * 1000;
  localStorage.setItem('spotify_token', JSON.stringify({ ...data, expiry }));
  return data.access_token;
}

export function getSavedToken() {
  try {
    const saved = JSON.parse(localStorage.getItem('spotify_token') || 'null');
    if (saved && Date.now() < saved.expiry - 60000) return saved.access_token;
    return null;
  } catch {
    return null;
  }
}

export function clearToken() {
  localStorage.removeItem('spotify_token');
}

async function spotifyFetch(endpoint, token) {
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify API ${res.status}: ${endpoint}`);
  return res.json();
}

export async function fetchProfile(token) {
  return spotifyFetch('/me', token);
}

export async function fetchTopTracks(token, limit = 50) {
  const data = await spotifyFetch(`/me/top/tracks?limit=${limit}&time_range=medium_term`, token);
  return data.items || [];
}

export async function fetchTrackFeatures(trackIds, token) {
  const ids = trackIds.slice(0, 100).join(',');
  const data = await spotifyFetch(`/audio-features?ids=${ids}`, token);
  return data.audio_features || [];
}

export function matchTracksToPhoto(tracks, features, analysis) {
  if (!analysis || !tracks.length) return tracks;

  const { music_energy = 0.5, music_valence = 0.5, mood } = analysis;

  const scored = tracks.map((track, i) => {
    const f = features[i];
    if (!f) return { track, score: 0 };

    const energyDiff = Math.abs((f.energy || 0.5) - music_energy);
    const valenceDiff = Math.abs((f.valence || 0.5) - music_valence);
    const score = 1 - (energyDiff + valenceDiff) / 2;

    return { track, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.track);
}
