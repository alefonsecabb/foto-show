import { useState } from 'react';
import { usePresentationStore } from '../store/presentationStore';
import styles from './AnimationApproval.module.css';

export default function AnimationApproval() {
  const { getComedyPhotos, analyses, setApprovedAnimation, approvedAnimations } =
    usePresentationStore();

  const comedyPhotos = getComedyPhotos();
  const [preview, setPreview] = useState(null);

  if (!comedyPhotos.length) {
    return (
      <div className={styles.empty}>
        <span>🎭</span>
        <p>Nenhuma foto foi identificada com alto potencial cômico.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <p className={styles.subtitle}>
        A IA selecionou <strong>{comedyPhotos.length}</strong> foto{comedyPhotos.length > 1 ? 's' : ''} com
        potencial para animações divertidas. Aprove as que quiser incluir.
      </p>

      <div className={styles.grid}>
        {comedyPhotos.map((photo) => {
          const analysis = analyses[photo.name];
          const approved = approvedAnimations[photo.name];
          const isApproved = approved !== false && approved !== undefined ? true : false;

          return (
            <div
              key={photo.name}
              className={`${styles.card} ${isApproved ? styles.cardApproved : styles.cardRejected}`}
            >
              <div className={styles.imageWrap} onClick={() => setPreview(photo)}>
                <img src={photo.url} alt={photo.name} />
                <div className={styles.overlay}>
                  {analysis?.comedy_suggestion?.emoji_overlay?.map((e, i) => (
                    <span key={i} className={styles.overlayEmoji} style={{ animationDelay: `${i * 0.15}s` }}>
                      {e}
                    </span>
                  ))}
                </div>
                <div className={styles.dialoguePreview}>
                  {analysis?.comedy_suggestion?.character_0 && (
                    <div className={styles.bubble}>{analysis.comedy_suggestion.character_0}</div>
                  )}
                </div>
              </div>

              <div className={styles.meta}>
                <span className={styles.filename}>{photo.name}</span>
                <span className={styles.potential}>
                  {Math.round((analysis?.comedy_potential || 0) * 100)}% cômico
                </span>
              </div>

              <div className={styles.actions}>
                <button
                  className={`${styles.btn} ${isApproved ? styles.btnActive : ''}`}
                  onClick={() => setApprovedAnimation(photo.name, true)}
                >
                  ✓ Incluir
                </button>
                <button
                  className={`${styles.btn} ${approved === false ? styles.btnReject : ''}`}
                  onClick={() => setApprovedAnimation(photo.name, false)}
                >
                  ✕ Pular
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div className={styles.modal} onClick={() => setPreview(null)}>
          <img src={preview.url} alt={preview.name} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
