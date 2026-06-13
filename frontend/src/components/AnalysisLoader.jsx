import { usePresentationStore } from '../store/presentationStore';
import styles from './AnalysisLoader.module.css';

const MOOD_MESSAGES = {
  alegre: 'detectando alegria...',
  nostálgico: 'sentindo nostalgia...',
  íntimo: 'capturando momentos íntimos...',
  aventureiro: 'explorando aventuras...',
  festivo: 'sentindo a festa...',
  tranquilo: 'absorvendo a calma...',
  emotivo: 'processando emoções...',
};

export default function AnalysisLoader() {
  const { analysisProgress, analyses, photos } = usePresentationStore();
  const { done, total } = analysisProgress;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const recentMoods = Object.values(analyses)
    .slice(-3)
    .map((a) => a?.mood)
    .filter(Boolean);

  const latestMood = recentMoods[recentMoods.length - 1];
  const statusMsg = latestMood ? MOOD_MESSAGES[latestMood] : 'analisando fotos com IA...';

  const recentPhotos = photos
    .filter((p) => analyses[p.name])
    .slice(-5)
    .reverse();

  return (
    <div className={styles.container}>
      <div className={styles.sparkles}>✨</div>
      <h2 className={styles.title}>Analisando suas fotos</h2>
      <p className={styles.subtitle}>{statusMsg}</p>

      <div className={styles.progressWrap}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          <div className={styles.progressGlow} style={{ left: `${pct}%` }} />
        </div>
        <span className={styles.counter}>{done} / {total}</span>
      </div>

      {recentPhotos.length > 0 && (
        <div className={styles.thumbnails}>
          {recentPhotos.map((p) => (
            <div key={p.name} className={styles.thumb}>
              <img src={p.url} alt={p.name} />
              <div className={styles.thumbOverlay}>
                <span>{analyses[p.name]?.mood}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.pills}>
        {Object.values(analyses).slice(0, 12).map((a, i) =>
          a ? (
            <span key={i} className={styles.pill} data-mood={a.mood}>
              {a.event_type}
            </span>
          ) : null
        )}
      </div>
    </div>
  );
}
