import * as THREE from 'three';

const VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

const FRAG = `
  uniform sampler2D tFrom;
  uniform sampler2D tTo;
  uniform float uProgress;
  uniform float uTime;
  varying vec2 vUv;

  vec2 wave(vec2 uv, float amp, float freq, float t) {
    return uv + vec2(
      sin(uv.y * freq + t * 2.0) * amp,
      cos(uv.x * freq * 0.7 + t * 1.5) * amp
    );
  }

  void main() {
    float t = uProgress;
    float amp = sin(t * 3.14159) * 0.04;
    vec2 uvA = wave(vUv, amp, 6.0, uTime);
    vec2 uvB = wave(vUv, amp * 0.7, 8.0, uTime + 1.57);
    vec4 a = texture2D(tFrom, clamp(uvA, 0.001, 0.999));
    vec4 b = texture2D(tTo,   clamp(uvB, 0.001, 0.999));
    gl_FragColor = mix(a, b, smoothstep(0.0, 1.0, t));
  }
`;

export class LiquidMorph {
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

    const loader = new THREE.TextureLoader();
    const [tFrom, tTo] = await Promise.all([
      new Promise(r => loader.load(imgA, t => { t.colorSpace = THREE.SRGBColorSpace; r(t); })),
      new Promise(r => loader.load(imgB, t => { t.colorSpace = THREE.SRGBColorSpace; r(t); })),
    ]);

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        tFrom: { value: tFrom },
        tTo: { value: tTo },
        uProgress: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.scene.add(mesh);

    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const elapsed = (ts - start) / 1000;
      const t = Math.min(elapsed / duration, 1);
      mat.uniforms.uProgress.value = t;
      mat.uniforms.uTime.value = elapsed;
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
