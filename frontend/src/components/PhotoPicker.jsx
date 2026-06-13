import { useState } from 'react';
import { usePresentationStore, STEPS } from '../store/presentationStore';
import { readPhotoFiles, createObjectURL, resizeAndEncode, extractExif } from '../services/photoAnalysis';
import { analyzePhoto } from '../services/gemini';
import styles from './PhotoPicker.module.css';

export default function PhotoPicker() {
  const [dragging, setDragging] = useState(false);
  const { setPhotos, setStep, setAnalysis, setAnalysisTotal } = usePresentationStore();

  const isSupported = 'showDirectoryPicker' in window;

  async function handlePick() {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
      await processDirectory(dirHandle);
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  }

  async function processDirectory(dirHandle) {
    setStep(STEPS.PICKING);
    const files = await readPhotoFiles(dirHandle);

    if (!files.length) {
      alert('Nenhuma foto encontrada nessa pasta. Tente com JPG, PNG ou WEBP.');
      setStep(STEPS.HOME);
      return;
    }

    const photos = files.map((file) => ({
      name: file.name,
      url: createObjectURL(file),
      file,
      size: file.size,
    }));

    setPhotos(photos);
    setAnalysisTotal(photos.length);
    setStep(STEPS.ANALYZING);

    const CONCURRENCY = 5;
    for (let i = 0; i < photos.length; i += CONCURRENCY) {
      const batch = photos.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (p) => {
          try {
            const [imageBase64, exif] = await Promise.all([
              resizeAndEncode(p.file),
              extractExif(p.file),
            ]);
            const analysis = await analyzePhoto(imageBase64, p.name, exif);
            setAnalysis(p.name, analysis);
          } catch (e) {
            console.warn(`Falha ao analisar ${p.name}:`, e.message);
            setAnalysis(p.name, null);
          }
        })
      );
    }

    setStep(STEPS.SETUP);
  }

  if (!isSupported) {
    return (
      <div className={styles.unsupported}>
        <p>Seu navegador não suporta acesso a pastas.</p>
        <p>Use Chrome ou Edge (versão 86+).</p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); }}
      onClick={handlePick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handlePick()}
    >
      <div className={styles.icon}>📁</div>
      <h2>Abrir pasta de fotos</h2>
      <p>Clique para selecionar uma pasta no seu dispositivo</p>
      <span className={styles.hint}>JPG · PNG · WEBP · HEIC</span>
    </div>
  );
}
