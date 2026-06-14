import { useEffect, useRef, useState, useCallback } from 'react';
import { usePresentationStore, STEPS } from '../store/presentationStore';
import SpeechBubble from '../overlays/SpeechBubble';
import EmojiFloat from '../overlays/EmojiFloat';
import { generateDialogue } from '../services/gemini';
import { resizeAndEncode } from '../services/photoAnalysis';
import styles from './Presentation.module.css';

const PHOTO_DURATION = 5;
const TRANSITION_DURATION = 1.6;

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });
}

export default function Presentation() {
  const { photos, analyses, selectedTracks, spotifyToken, setStep } =
    usePresentationStore();

  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const timerRef = useRef(null);
  const dialogueCache = useRef(new Map());
  const transitioningRef = useRef(false);

  // Two stacked layers — slot A and slot B. We crossfade between them.
  const [layerA, setLayerA] = useState(() => photos[0] || null);
  const [layerB, setLayerB] = useState(null);
  const [activeLayer, setActiveLayer] = useState('A'); // which one is visible
  const [transitioning, setTransitioning] = useState(false);

  const [idx, setIdx] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [currentDialogue, setCurrentDialogue] = useState(null);
  const [showOverlays, setShowOverlays] = useState(false);
  const controlsTimer = useRef(null);

  const photo = photos[idx];
  const analysis = photo ? analyses[photo.name] : null;

  // Load Spotify Web Playback SDK and play matching track
  useEffect(() => {
    if (!spotifyToken || !selectedTracks.length) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'FotoShow',
        getOAuthToken: (cb) => cb(spotifyToken),
        volume: 0.6,
      });
      player.connect();
      playerRef.current = player;
    };

    return () => {
      playerRef.current?.disconnect();
      document.body.removeChild(script);
    };
  }, [spotifyToken]);

  const playTrack = useCallback(async (trackIdx) => {
    const track = selectedTracks[trackIdx % selectedTracks.length];
    if (!track || !spotifyToken) return;

    if (track.preview_url && !playerRef.current?.isReady) {
      const audio = new Audio(track.preview_url);
      audio.volume = 0.5;
      audio.play().catch(() => {});
      playerRef.current = { audioEl: audio, disconnect: () => audio.pause() };
    }
  }, [selectedTracks, spotifyToken]);

  const fetchDialogue = useCallback(async (photoEntry) => {
    if (!photoEntry) return null;
    const cached = dialogueCache.current.get(photoEntry.name);
    if (cached !== undefined) return cached;

    try {
      const b64 = await resizeAndEncode(photoEntry.file);
      const a = analyses[photoEntry.name];
      const d = await generateDialogue(b64, {
        people_count: a?.people_count ?? 0,
        scene: a?.scene ?? 'uma foto misteriosa',
        mood: a?.mood ?? 'neutro',
      });
      dialogueCache.current.set(photoEntry.name, d);
      return d;
    } catch {
      dialogueCache.current.set(photoEntry.name, null);
      return null;
    }
  }, [analyses]);

  const goTo = useCallback(async (nextIdx) => {
    if (transitioningRef.current) return;
    const next = photos[nextIdx];
    if (!next) return;

    transitioningRef.current = true;
    clearTimeout(timerRef.current);
    setShowOverlays(false);

    await preloadImage(next.url);

    // Place the next photo on the inactive layer, then flip activeLayer
    // to trigger CSS crossfade.
    if (activeLayer === 'A') {
      setLayerB(next);
      // small delay so React commits the new img before changing opacity
      requestAnimationFrame(() => {
        setActiveLayer('B');
        setTransitioning(true);
      });
    } else {
      setLayerA(next);
      requestAnimationFrame(() => {
        setActiveLayer('A');
        setTransitioning(true);
      });
    }

    setIdx(nextIdx);

    setTimeout(async () => {
      setTransitioning(false);
      transitioningRef.current = false;
      setShowOverlays(true);

      const d = await fetchDialogue(next);
      setCurrentDialogue(d);

      await playTrack(nextIdx);

      if (nextIdx + 1 < photos.length) {
        fetchDialogue(photos[nextIdx + 1]);
      }

      timerRef.current = setTimeout(
        () => nextIdx + 1 < photos.length && goTo(nextIdx + 1),
        PHOTO_DURATION * 1000
      );
    }, TRANSITION_DURATION * 1000);
  }, [activeLayer, photos, fetchDialogue, playTrack]);

  // Initial load — show first photo, fetch its dialogue, schedule next
  useEffect(() => {
    if (!photos.length) return;
    setShowOverlays(true);

    (async () => {
      const d = await fetchDialogue(photos[0]);
      setCurrentDialogue(d);
      if (photos.length > 1) fetchDialogue(photos[1]);
    })();

    playTrack(0);

    timerRef.current = setTimeout(
      () => photos.length > 1 && goTo(1),
      PHOTO_DURATION * 1000
    );

    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMouseMove() {
    setShowControls(true);
    clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  }

  function handlePrev() {
    if (idx > 0) goTo(idx - 1);
  }

  function handleNext() {
    if (idx < photos.length - 1) goTo(idx + 1);
  }

  function handleExit() {
    clearTimeout(timerRef.current);
    playerRef.current?.disconnect?.();
    setStep(STEPS.SETUP);
  }

  const currentEmojis =
    currentDialogue?.floating_emojis ||
    analysis?.comedy_suggestion?.emoji_overlay;

  const visiblePhoto = activeLayer === 'A' ? layerA : layerB;

  return (
    <div
      ref={containerRef}
      className={styles.root}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      {/* Blurred backdrop of the currently visible photo */}
      {visiblePhoto && (
        <img
          src={visiblePhoto.url}
          alt=""
          className={styles.blurBg}
          aria-hidden
        />
      )}

      {/* Layer A */}
      {layerA && (
        <img
          src={layerA.url}
          alt=""
          className={`${styles.slide} ${activeLayer === 'A' ? styles.slideActive : ''}`}
        />
      )}

      {/* Layer B */}
      {layerB && (
        <img
          src={layerB.url}
          alt=""
          className={`${styles.slide} ${activeLayer === 'B' ? styles.slideActive : ''}`}
        />
      )}

      {/* Gradient veil pulses during transition */}
      <div
        className={`${styles.gradientVeil} ${transitioning ? styles.veilActive : ''}`}
        aria-hidden
      />

      {/* Comic overlays — always shown when a photo is settled */}
      {showOverlays && (
        <div className={styles.overlayLayer}>
          <SpeechBubble dialogue={currentDialogue} visible={showOverlays} />
          <EmojiFloat emojis={currentEmojis} visible={showOverlays} />
        </div>
      )}

      {/* Controls */}
      <div className={`${styles.controls} ${showControls ? styles.controlsVisible : ''}`}>
        <button className={styles.ctrl} onClick={handlePrev} disabled={idx === 0}>‹</button>

        <div className={styles.center}>
          <span className={styles.counter}>{idx + 1} / {photos.length}</span>
          {analysis && (
            <span className={styles.mood}>{analysis.mood} · {analysis.event_type}</span>
          )}
        </div>

        <button className={styles.ctrl} onClick={handleNext} disabled={idx === photos.length - 1}>›</button>

        <button className={styles.exitBtn} onClick={handleExit} title="Sair">✕</button>
      </div>

      {/* Dots */}
      <div className={`${styles.dots} ${showControls ? styles.dotsVisible : ''}`}>
        {photos.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
