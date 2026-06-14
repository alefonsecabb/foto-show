import { useState } from 'react';
import { usePresentationStore, STEPS } from './store/presentationStore';
import PhotoPicker from './components/PhotoPicker';
import AnalysisLoader from './components/AnalysisLoader';
import SpotifyConnect from './components/SpotifyConnect';
import AnimationApproval from './components/AnimationApproval';
import Presentation from './components/Presentation';
import { getApiKey, saveApiKey } from './services/gemini';
import styles from './App.module.css';

function ApiKeyBanner() {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function handleSave() {
    if (key.trim().length < 10) { setError('Cole sua chave de API aqui.'); return; }
    saveApiKey(key.trim());
    setSaved(true);
    setError('');
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <div className={styles.apiKeyBanner}>
      <div className={styles.apiKeyIcon}>🔑</div>
      <div className={styles.apiKeyBody}>
        <p className={styles.apiKeyTitle}>Chave de API Gemini necessária</p>
        <p className={styles.apiKeyDesc}>
          Obtenha gratuitamente em{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
            aistudio.google.com
          </a>{' '}
          e cole abaixo para ativar a IA cômica.
        </p>
        <div className={styles.apiKeyRow}>
          <input
            type="password"
            className={styles.apiKeyInput}
            placeholder="AIza..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            className={`${styles.apiKeySave} ${saved ? styles.apiKeySaved : ''}`}
            onClick={handleSave}
          >
            {saved ? '✓ Salvo!' : 'Salvar'}
          </button>
        </div>
        {error && <p className={styles.apiKeyError}>{error}</p>}
      </div>
    </div>
  );
}

function ApiKeyStatus() {
  const [changing, setChanging] = useState(false);
  const [newKey, setNewKey] = useState('');

  if (changing) {
    return (
      <div className={styles.apiKeyStatus}>
        <input
          type="password"
          className={styles.apiKeyInput}
          placeholder="Nova chave AIza..."
          value={newKey}
          autoFocus
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newKey.trim()) {
              saveApiKey(newKey.trim());
              window.location.reload();
            }
            if (e.key === 'Escape') setChanging(false);
          }}
        />
        <button className={styles.apiKeySave} onClick={() => { if (newKey.trim()) { saveApiKey(newKey.trim()); window.location.reload(); } }}>
          Salvar
        </button>
        <button className={styles.apiKeyChange} onClick={() => setChanging(false)}>Cancelar</button>
      </div>
    );
  }

  return (
    <div className={styles.apiKeyStatus}>
      <span className={styles.apiKeyOk}>✓ IA ativa</span>
      <button className={styles.apiKeyChange} onClick={() => setChanging(true)}>
        Trocar chave
      </button>
    </div>
  );
}

function HomeScreen() {
  const hasKey = Boolean(getApiKey());

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

      {hasKey ? <ApiKeyStatus /> : <ApiKeyBanner />}

      <PhotoPicker disabled={!hasKey} />

      <p className={styles.footer}>
        Funciona no Chrome e Edge · Suas fotos nunca saem do seu dispositivo
      </p>
    </div>
  );
}

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
