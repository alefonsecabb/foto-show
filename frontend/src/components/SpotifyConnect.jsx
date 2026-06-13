import { useEffect, useState } from 'react';
import { usePresentationStore } from '../store/presentationStore';
import {
  getSavedToken,
  initiateSpotifyLogin,
  exchangeCodeForToken,
  fetchProfile,
  fetchTopTracks,
  fetchTrackFeatures,
  matchTracksToPhoto,
  clearToken,
} from '../services/spotify';
import styles from './SpotifyConnect.module.css';

export default function SpotifyConnect() {
  const { spotifyToken, spotifyProfile, analyses, photos, setSpotifyToken, setSpotifyProfile, setSelectedTracks } =
    usePresentationStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      window.history.replaceState({}, '', window.location.pathname);
      handleCodeExchange(code);
    } else {
      const saved = getSavedToken();
      if (saved) loadProfile(saved);
    }
  }, []);

  async function handleCodeExchange(code) {
    setLoading(true);
    try {
      const token = await exchangeCodeForToken(code);
      await loadProfile(token);
    } catch (e) {
      setError('Falha ao conectar com o Spotify. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile(token) {
    setLoading(true);
    try {
      const profile = await fetchProfile(token);
      const tracks = await fetchTopTracks(token);
      const ids = tracks.map((t) => t.id);
      const features = await fetchTrackFeatures(ids, token);

      const firstAnalysis = Object.values(analyses)[0];
      const sorted = matchTracksToPhoto(tracks, features, firstAnalysis);

      setSpotifyToken(token);
      setSpotifyProfile(profile);
      setSelectedTracks(sorted.slice(0, 20));
    } catch (e) {
      setError('Erro ao carregar dados do Spotify.');
      clearToken();
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    clearToken();
    setSpotifyToken(null);
    setSpotifyProfile(null);
    setSelectedTracks([]);
  }

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.spinner} />
        <p>Conectando ao Spotify...</p>
      </div>
    );
  }

  if (spotifyProfile) {
    return (
      <div className={styles.card + ' ' + styles.connected}>
        <div className={styles.connectedHeader}>
          <img
            src={spotifyProfile.images?.[0]?.url || ''}
            alt={spotifyProfile.display_name}
            className={styles.avatar}
            onError={(e) => e.target.style.display = 'none'}
          />
          <div>
            <p className={styles.connectedLabel}>Spotify conectado</p>
            <p className={styles.userName}>{spotifyProfile.display_name}</p>
          </div>
          <div className={styles.badge}>✓</div>
        </div>
        <p className={styles.hint}>
          Músicas selecionadas com base no mood das suas fotos
        </p>
        <button className={styles.disconnect} onClick={handleDisconnect}>
          Desconectar
        </button>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.spotifyLogo}>
        <svg viewBox="0 0 24 24" width="32" height="32" fill="#1DB954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      </div>
      <h3 className={styles.cardTitle}>Trilha sonora inteligente</h3>
      <p className={styles.cardDesc}>
        Conecte seu Spotify para que a IA selecione músicas que combinam com o mood de cada foto.
      </p>
      <button className={styles.connectBtn} onClick={initiateSpotifyLogin}>
        Conectar com Spotify
      </button>
      <p className={styles.skip}>
        Sem Spotify? A apresentação roda sem música.
      </p>
    </div>
  );
}
