import { usePresentationStore } from '../store/presentationStore';
import styles from './AnimationApproval.module.css';

export default function AnimationApproval() {
  const { photos, analyses } = usePresentationStore();

  const previewSamples = photos
    .filter((p) => analyses[p.name]?.comedy_suggestion?.character_0)
    .slice(0, 3);

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        <span className={styles.badge}>✨</span>
        <div>
          <p className={styles.headline}>
            Humor sarcástico aplicado em <strong>todas as {photos.length}</strong> fotos
          </p>
          <p className={styles.subtitle}>
            A IA vai gerar uma legenda ou balão de fala ácido e debochado para cada foto.
          </p>
        </div>
      </div>

      {previewSamples.length > 0 && (
        <>
          <p className={styles.previewLabel}>Prévia do tom:</p>
          <div className={styles.grid}>
            {previewSamples.map((photo) => {
              const a = analyses[photo.name];
              return (
                <div key={photo.name} className={styles.card}>
                  <div className={styles.imageWrap}>
                    <img src={photo.url} alt={photo.name} />
                    <div className={styles.dialoguePreview}>
                      {a?.comedy_suggestion?.character_0 && (
                        <div className={styles.bubble}>
                          {a.comedy_suggestion.character_0}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
