# FotoShow

**Suas fotos. Como cinema.**

FotoShow transforma um álbum de fotos comum em uma apresentação cinematográfica com IA e trilha sonora. A inteligência artificial analisa cada foto, gera legendas sarcásticas e ácidas no estilo stand-up brasileiro, e o Spotify escolhe a música perfeita para o momento. Tudo acontece no navegador — nenhuma foto é enviada para a nuvem.

---

## Como funciona

```
Pasta de fotos
     │
     ▼
Análise com Gemini 2.0 Flash
(cena, clima, pessoas, potencial cômico)
     │
     ▼
Tela de Setup
(conectar Spotify + prévia do humor)
     │
     ▼
Apresentação cinematográfica
(crossfade suave · blur background · balões cômicos · emojis flutuantes)
```

---

## Funcionalidades

### Análise de fotos com IA
- Cada foto é analisada pela API Gemini antes da apresentação
- A IA detecta: cena, clima emocional, número de pessoas, tipo de evento, localização inferida
- Gera automaticamente uma sugestão de humor para cada foto

### Humor sarcástico automático
- Durante a apresentação, a IA gera em tempo real um comentário **ácido, sarcástico e debochado** sobre cada foto — estilo stand-up brasileiro
- Aparece como balão de fala (SpeechBubble) e emojis flutuantes (EmojiFloat)
- Funciona para todas as fotos, inclusive sem pessoas
- Prefetch do diálogo da próxima foto enquanto a atual é exibida (sem espera)

### Transições cinematográficas
- Crossfade suave entre fotos com `cubic-bezier`, duração 1.6s
- Duas camadas de imagem empilhadas (slot A/B) com troca de opacidade — sem cortes bruscos, sem mosaico, sem PowerPoint
- Veu gradiente radial/linear sutil pulsa durante a troca para efeito "sweep" de cinema

### Fotos sem esticar
- Todas as fotos respeitam a proporção original com `object-fit: contain`
- Fundo blur dinâmico (Apple Photos style): a própria foto esmaecida preenche as barras pretas em telas wide, eliminando o letterbox feio em fotos portrait

### Integração com Spotify
- Conecta via OAuth PKCE sem servidor próprio
- Seleciona faixas baseado no clima emocional detectado pela IA (energy + valence)
- Preview de 30s disponível mesmo sem conta Spotify Premium

---

## Arquitetura

```
foto-show/
├── api/                        # Serverless functions (Vercel)
│   ├── analyze.js              # POST /api/analyze — análise da foto com Gemini
│   └── dialogue.js             # POST /api/dialogue — geração de humor sarcástico
│
└── frontend/                   # React 19 + Vite 8
    └── src/
        ├── components/
        │   ├── Presentation.jsx       # Player principal da apresentação
        │   ├── Presentation.module.css
        │   ├── AnimationApproval.jsx  # Card informativo de humor automático
        │   ├── PhotoPicker.jsx        # Seleção de pasta (File System Access API)
        │   ├── AnalysisLoader.jsx     # Barra de progresso da análise
        │   └── SpotifyConnect.jsx     # OAuth + seleção de trilha
        ├── overlays/
        │   ├── SpeechBubble.jsx       # Balões de fala cômicos
        │   └── EmojiFloat.jsx         # Emojis flutuantes animados
        ├── services/
        │   ├── gemini.js              # Cliente das APIs /analyze e /dialogue
        │   ├── photoAnalysis.js       # Resize, encode, EXIF extraction
        │   └── spotify.js             # PKCE flow + busca de faixas
        ├── store/
        │   └── presentationStore.js   # Estado global (Zustand)
        └── App.jsx                    # Roteamento entre telas
```

### Stack
| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite 8, CSS Modules |
| Estado | Zustand 5 |
| IA | Google Gemini 2.0 Flash |
| Backend | Vercel Serverless Functions (Node 20) |
| Música | Spotify Web API + Web Playback SDK |
| Metadados | exifr |

---

## Setup local

### Pré-requisitos
- Node.js 20+
- Conta Google Cloud com Gemini API habilitada
- Conta Spotify Developer (opcional, para trilha sonora)
- Vercel CLI (para rodar as funções serverless localmente)

### 1. Clone e instale

```bash
git clone https://github.com/alefonsecabb/foto-show.git
cd foto-show
npm install                    # dependências das funções API
cd frontend && npm install     # dependências do frontend
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto (copie de `.env.example`):

```env
GEMINI_API_KEY=sua_chave_gemini_aqui
VITE_SPOTIFY_CLIENT_ID=seu_client_id_spotify
VITE_API_BASE_URL=http://localhost:3000
```

Para obter a chave Gemini: [Google AI Studio](https://aistudio.google.com/app/apikey)

Para o Spotify: crie um app em [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) e adicione `http://localhost:5173` como Redirect URI.

### 3. Rode localmente

Em dois terminais:

```bash
# Terminal 1 — funções serverless
npx vercel dev --listen 3000

# Terminal 2 — frontend
cd frontend
npm run dev
```

Abra `http://localhost:5173` no Chrome ou Edge.

### 4. Build de produção

```bash
cd frontend && npm run build
```

---

## Deploy (Vercel)

O projeto está configurado para deploy automático na Vercel.

Configure as variáveis de ambiente no painel da Vercel:
- `GEMINI_API_KEY`
- `VITE_SPOTIFY_CLIENT_ID`
- `VITE_API_BASE_URL` → URL do seu deploy (ex: `https://foto-show.vercel.app`)

O `vercel.json` já configura as funções Node 20 e os headers CORS para o domínio do frontend.

---

## Requisitos do navegador

- **Chrome 86+** ou **Edge 86+** — necessário para a [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
- Firefox e Safari não suportam a seleção de pasta via `showDirectoryPicker`

---

## Privacidade

- As fotos **nunca saem do seu dispositivo** para o armazenamento
- As imagens são redimensionadas e enviadas **temporariamente** apenas para a API Gemini durante a análise (processamento em memória)
- Nenhum dado é persistido em servidor

---

## Licença

MIT
