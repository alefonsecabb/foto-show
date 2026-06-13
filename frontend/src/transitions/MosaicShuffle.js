import * as THREE from 'three';

const VERT = `
  varying vec2 vUv;
  attribute vec2 aTileOffset;
  attribute float aTileDelay;
  uniform float uProgress;
  uniform vec2 uTileSize;

  void main() {
    vUv = uv;
    float t = clamp((uProgress - aTileDelay) / (1.0 - aTileDelay + 0.001), 0.0, 1.0);
    float ease = t < 0.5 ? 2.0*t*t : -1.0+(4.0-2.0*t)*t;
    vec3 pos = position;
    pos.xy += aTileOffset * (1.0 - ease);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAG = `
  uniform sampler2D tFrom;
  uniform sampler2D tTo;
  uniform float uProgress;
  varying vec2 vUv;
  void main() {
    vec4 a = texture2D(tFrom, vUv);
    vec4 b = texture2D(tTo, vUv);
    gl_FragColor = mix(a, b, smoothstep(0.4, 0.6, uProgress));
  }
`;

export class MosaicShuffle {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: false });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;
    this.animId = null;
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  async run(imgA, imgB, duration, onComplete) {
    this._cleanup();
    this.resize(this.canvas.clientWidth, this.canvas.clientHeight);

    const COLS = 8, ROWS = 6;
    const loader = new THREE.TextureLoader();
    const [tFrom, tTo] = await Promise.all([
      new Promise(r => loader.load(imgA, t => { t.colorSpace = THREE.SRGBColorSpace; r(t); })),
      new Promise(r => loader.load(imgB, t => { t.colorSpace = THREE.SRGBColorSpace; r(t); })),
    ]);

    const tileW = 2 / COLS, tileH = 2 / ROWS;
    const group = new THREE.Group();

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const geo = new THREE.PlaneGeometry(tileW - 0.01, tileH - 0.01);

        const uvAttr = geo.attributes.uv;
        for (let i = 0; i < uvAttr.count; i++) {
          uvAttr.setXY(
            i,
            (col + uvAttr.getX(i)) / COLS,
            (row + uvAttr.getY(i)) / ROWS
          );
        }

        const offsetX = (Math.random() - 0.5) * 3;
        const offsetY = (Math.random() - 0.5) * 3;
        const delay = Math.random() * 0.5;

        const tileOffsets = new Float32Array(4 * 2).fill(0);
        for (let i = 0; i < 4; i++) {
          tileOffsets[i * 2] = offsetX;
          tileOffsets[i * 2 + 1] = offsetY;
        }
        const delayArr = new Float32Array(4).fill(delay);
        geo.setAttribute('aTileOffset', new THREE.BufferAttribute(tileOffsets, 2));
        geo.setAttribute('aTileDelay', new THREE.BufferAttribute(delayArr, 1));

        const mat = new THREE.ShaderMaterial({
          uniforms: {
            tFrom: { value: tFrom },
            tTo: { value: tTo },
            uProgress: { value: 0 },
          },
          vertexShader: VERT,
          fragmentShader: FRAG,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(-1 + col * tileW + tileW / 2, -1 + row * tileH + tileH / 2, 0);
        group.add(mesh);
      }
    }

    this.scene.add(group);

    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / (duration * 1000), 1);
      group.children.forEach((c) => { c.material.uniforms.uProgress.value = t; });
      this.renderer.render(this.scene, this.camera);
      if (t < 1) {
        this.animId = requestAnimationFrame(animate);
      } else {
        this._cleanup();
        onComplete?.();
      }
    };
    this.animId = requestAnimationFrame(animate);
  }

  _cleanup() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.scene.clear();
  }

  dispose() {
    this._cleanup();
    this.renderer.dispose();
  }
}
