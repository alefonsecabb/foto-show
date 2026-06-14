import { usePresentationStore, STEPS } from './store/presentationStore';
import PhotoPicker from './components/PhotoPicker';
import AnalysisLoader from './components/AnalysisLoader';
import SpotifyConnect from './components/SpotifyConnect';
import AnimationApproval from './components/AnimationApproval';
import Presentation from './components/Presentation';
import styles from './App.module.css';

function SetupScreen() {
  const { setStep, photos, analyses } = usePresentationStore();
  const analyzed = Object.keys(analyses).length;
  const ready = analyzed >= photos.length;

  return (
    <div className={styles.setupRoot}>
      <header className={styles.header}>
        <h1 className={styles.logo}>FotoShow</h1>
        <p className={styles.logoSub}>{photos.length} fotos carregadas · {analyzed} analisadas</p>
      </header>

      <div className={styles.setupGrid}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Trilha sonora</h2>
          <SpotifyConnect />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Animações cômicas</h2>
          <AnimationApproval />
        </section>
      </div>

      <div className={styles.startWrap}>
        <button
          className={styles.startBtn}
          onClick={() => setStep(STEPS.PRESENTING)}
          disabled={!ready}
        >
          {ready ? 'Iniciar Apresentação' : `Analisando... (${analyzed}/${photos.length})`}
        </button>
        <button className={styles.backBtn} onClick={() => setStep(STEPS.HOME)}>
          ← Nova pasta
        </button>
      </div>
    </div>
  );
}

function HomeScreen() {
  return (
    <div className={styles.homeRoot}>
      <div className={styles.homeHero}>
        <div className={styles.filmStrip}>
          {['🏖️', '🎉', '🌄', '👨‍👩‍👧', '✈️', '🎂'].map((e, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.4}s` }}>{e}</span>
          ))}
        </div>
        <h1 className={styles.title}>
          <span>Suas fotos.</span>
          <em> Como cinema.</em>
        </h1>
        <p className={styles.desc}>
          IA analisa cada momento, Spotify escolhe a trilha perfeita,
          e transições cinematográficas transformam seu álbum em uma experiência.
        </p>
      </div>
      <PhotoPicker />
      <p className={styles.footer}>
        Funciona no Chrome e Edge · Suas fotos nunca saem do seu dispositivo
      </p>
    </div>
  );
}

export default function App() {
  const { step } = usePresentationStore();

  if (step === STEPS.PRESENTING) return <Presentation />;

  return (
    <div className={styles.app}>
      {step === STEPS.HOME || step === STEPS.PICKING ? <HomeScreen /> : null}
      {step === STEPS.ANALYZING ? (
        <div className={styles.center}>
          <AnalysisLoader />
        </div>
      ) : null}
      {step === STEPS.SETUP ? <SetupScreen /> : null}
    </div>
  );
}
