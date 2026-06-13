import * as THREE from 'three';

const VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

const FRAG = `
  uniform sampler2D tFrom;
  uniform sampler2D tTo;
  uniform float uProgress;
  varying vec2 vUv;

  void main() {
    float t = uProgress;
    vec2 center = vec2(0.5, 0.5);
    vec2 uv = vUv;

    // Zoom into center for exit
    float zoomOut = 1.0 + t * 8.0;
    vec2 uvZoomOut = (uv - center) / zoomOut + center;

    // Zoom from center for entrance
    float zoomIn = (1.0 - t) * 8.0 + 1.0;
    vec2 uvZoomIn = (uv - center) / zoomIn + center;

    bool inBoundsOut = uvZoomOut.x > 0.0 && uvZoomOut.x < 1.0 && uvZoomOut.y > 0.0 && uvZoomOut.y < 1.0;
    bool inBoundsIn  = uvZoomIn.x  > 0.0 && uvZoomIn.x  < 1.0 && uvZoomIn.y  > 0.0 && uvZoomIn.y  < 1.0;

    vec4 from = inBoundsOut ? texture2D(tFrom, uvZoomOut) : vec4(0.0);
    vec4 to   = inBoundsIn  ? texture2D(tTo,   uvZoomIn)  : vec4(0.0);

    float blend = smoothstep(0.3, 0.7, t);
    gl_FragColor = mix(from, to, blend);
  }
`;

export class WormholeZoom {
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
      uniforms: { tFrom: { value: tFrom }, tTo: { value: tTo }, uProgress: { value: 0 } },
      vertexShader: VERT,
      fragmentShader: FRAG,
    });

    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

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
  }

  dispose() {
    this._cleanup();
    this.renderer.dispose();
  }
}
