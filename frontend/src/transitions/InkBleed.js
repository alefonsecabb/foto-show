import * as THREE from 'three';

const VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = `
  uniform sampler2D tFrom;
  uniform sampler2D tTo;
  uniform float uProgress;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1,0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float n = fbm(uv * 3.0 + uProgress * 2.0);
    float edge = uProgress + n * 0.35 - 0.17;
    float mask = smoothstep(0.0, 0.08, edge - (1.0 - uv.y));

    vec4 from = texture2D(tFrom, uv);
    vec4 to   = texture2D(tTo, uv);

    // ink drip darkening at the edge
    float inkEdge = smoothstep(0.0, 0.12, abs(edge - (1.0 - uv.y)));
    vec4 ink = vec4(0.05, 0.02, 0.08, 1.0);

    gl_FragColor = mix(mix(from, ink, (1.0 - inkEdge) * 0.6), to, mask);
  }
`;

export class InkBleed {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: false });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;
    this.animId = null;
    this.mesh = null;
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  async run(imgA, imgB, duration, onComplete) {
    this._cleanup();
    const { w, h } = { w: this.canvas.clientWidth, h: this.canvas.clientHeight };
    this.resize(w, h);

    const loader = new THREE.TextureLoader();
    const [tFrom, tTo] = await Promise.all([
      new Promise(r => loader.load(imgA, t => { t.colorSpace = THREE.SRGBColorSpace; r(t); })),
      new Promise(r => loader.load(imgB, t => { t.colorSpace = THREE.SRGBColorSpace; r(t); })),
    ]);

    const mat = new THREE.ShaderMaterial({
      uniforms: { tFrom: { value: tFrom }, tTo: { value: tTo }, uProgress: { value: 0 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
    });

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.scene.add(this.mesh);

    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / (duration * 1000), 1);
      mat.uniforms.uProgress.value = t;
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
    this.mesh = null;
  }

  dispose() {
    this._cleanup();
    this.renderer.dispose();
  }
}
