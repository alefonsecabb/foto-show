import { useEffect, useState } from 'react';
import styles from './EmojiFloat.module.css';

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

export default function EmojiFloat({ emojis, visible }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (!visible || !emojis?.length) { setParticles([]); return; }

    const items = [];
    emojis.forEach((emoji, i) => {
      for (let j = 0; j < 3; j++) {
        items.push({
          id: `${i}-${j}`,
          emoji,
          left: randomBetween(5, 90),
          delay: randomBetween(0.5, 3),
          duration: randomBetween(3, 6),
          size: randomBetween(24, 48),
          rotate: randomBetween(-30, 30),
        });
      }
    });
    setParticles(items);
  }, [visible, emojis]);

  return (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          className={styles.emoji}
          style={{
            left: `${p.left}%`,
            bottom: '-10%',
            fontSize: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--rotate': `${p.rotate}deg`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </>
  );
}
