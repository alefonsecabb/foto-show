import { useEffect, useState } from 'react';
import styles from './SpeechBubble.module.css';

const POSITIONS = {
  'top-left':     { top: '10%', left: '5%' },
  'top-right':    { top: '10%', right: '5%' },
  'bottom-left':  { bottom: '18%', left: '5%' },
  'bottom-right': { bottom: '18%', right: '5%' },
};

export default function SpeechBubble({ dialogue, visible }) {
  const [shown, setShown] = useState([]);

  useEffect(() => {
    if (!visible || !dialogue?.dialogues?.length) return;
    setShown([]);
    dialogue.dialogues.forEach((d, i) => {
      setTimeout(() => setShown((prev) => [...prev, i]), 1500 + i * 800);
    });
  }, [visible, dialogue]);

  if (!dialogue?.dialogues?.length) return null;

  return (
    <>
      {dialogue.dialogues.map((d, i) =>
        shown.includes(i) ? (
          <div
            key={i}
            className={`${styles.bubble} ${styles[d.position?.replace('-', '') || 'topleft']}`}
            style={POSITIONS[d.position] || POSITIONS['top-left']}
          >
            <span className={styles.text}>{d.text}</span>
            <div className={styles.tail} />
          </div>
        ) : null
      )}

      {dialogue.caption && shown.length >= dialogue.dialogues.length && (
        <div className={styles.caption}>{dialogue.caption}</div>
      )}
    </>
  );
}
