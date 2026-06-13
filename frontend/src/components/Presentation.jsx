import { useEffect, useRef, useState, useCallback } from 'react';
import { usePresentationStore, STEPS } from '../store/presentationStore';
import { ParticleScatter } from '../transitions/ParticleScatter';
import { InkBleed } from '../transitions/InkBleed';
import { LiquidMorph } from '../transitions/LiquidMorph';
import { WormholeZoom } from '../transitions/WormholeZoom';
import { MosaicShuffle } from '../transitions/MosaicShuffle';
import SpeechBubble from '../overlays/SpeechBubble';
import EmojiFloat from '../overlays/EmojiFloat';
import { generateDialogue } from '../services/gemini';
import { resizeAndEncode } from '../services/photoAnalysis';
import styles from './Presentation.module.css';

const MOOD_TO_TRANSITION = {
  alegre:      ['ParticleScatter', 'MosaicShuffle'],
  festivo:     ['ParticleScatter', 'MosaicShuffle'],
  aventureiro: ['WormholeZoom', 'ParticleScatter'],
  viagem:      ['WormholeZoom', 'InkBleed'],
  natureza:    ['InkBleed', 'LiquidMorph'],
  íntimo:      ['LiquidMorph', 'InkBleed'],
  nostálgico:  ['LiquidMorph', 'InkBleed'],
  emotivo:     ['LiquidMorph', 'InkBleed'],
  tranquilo:   ['InkBleed', 'LiquidMorph'],
};

const TRANSITION_CLASSES = { ParticleScatter, InkBleed, LiquidMorph, WormholeZoom, MosaicShuffle };

function pickTransition(analysis) {
  const mood = analysis?.mood || analysis?.event_type || 'alegre';
  const opts = MOOD_TO_TRANSITION[mood] || ['LiquidMorph', 'InkBleed'];
  return opts[Math.floor(Math.random() * opts.length)];
}

const PHOTO_DURATION = 5;
const TRANSITION_DURATION = 2.2;

export default function Presentation() {
  const { photos, analyses, approvedAnimations, selectedTracks, spotifyToken, setStep } =
    usePresentationStore();

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const transitionRef = useRef(null);
  const playerRef = useRef(null);
  const timerRef = useRef(null);

  const [idx, setIdx] = useState(0);
  const [inTransition, setInTransition] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentDialogue, setCurrentDialogue] = useState(null);
  const [showOverlays, setShowOverlays] = useState(false);
  const controlsTimer = useRef(null);

  const photo = photos[idx];
  const analysis = photo ? analyses[photo.name] : null;
  const hasAnimation = photo && approvedAnimations[photo.name] === true;

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

  const goTo = useCallback(async (nextIdx) => {
    if (inTransition || !canvasRef.current) return;
    setInTransition(true);
    setShowOverlays(false);
    clearTimeout(timerRef.current);

    const current = photos[idx];
    const next = photos[nextIdx];
    if (!next) {
      setInTransition(false);
      return;
    }

    const nextAnalysis = analyses[next.name];
    const transName = pickTransition(nextAnalysis);
    const TransClass = TRANSITION_CLASSES[transName];

    if (transitionRef.current) transitionRef.current.dispose();
    transitionRef.current = new TransClass(canvasRef.current);

    await transitionRef.current.run(
      current?.url || next.url,
      next.url,
      TRANSITION_DURATION,
      async () => {
        setIdx(nextIdx);
        setInTransition(false);
        setShowOverlays(true);

        if (approvedAnimations[next.name] === true) {
          try {
            const b64 = await resizeAndEncode(next.file);
            const a = analyses[next.name];
            const d = await generateDialogue(b64, {
              people_count: a?.people_count,
              scene: a?.scene,
              mood: a?.mood,
            });
            setCurrentDialogue(d);
          } catch {
            setCurrentDialogue(null);
          }
        } else {
          setCurrentDialogue(null);
        }

        await playTrack(nextIdx);

        timerRef.current = setTimeout(
          () => nextIdx + 1 < photos.length && goTo(nextIdx + 1),
          PHOTO_DURATION * 1000
        );
      }
    );
  }, [idx, inTransition, photos, analyses, approvedAnimations, playTrack]);

  useEffect(() => {
    setShowOverlays(true);
    timerRef.current = setTimeout(
      () => photos.length > 1 && goTo(1),
      PHOTO_DURATION * 1000
    );
    playTrack(0);
    return () => clearTimeout(timerRef.current);
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
    transitionRef.current?.dispose();
    playerRef.current?.disconnect?.();
    setStep(STEPS.SETUP);
  }

  const currentEmojis = analysis?.comedy_suggestion?.emoji_overlay;

  return (
    <div
      ref={containerRef}
      className={styles.root}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      {/* Background photo (shown during transition) */}
      <img
        src={photo?.url}
        alt=""
        className={styles.bgPhoto}
        aria-hidden
      />

      {/* WebGL canvas for transitions */}
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Comic overlays */}
      {showOverlays && hasAnimation && (
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
