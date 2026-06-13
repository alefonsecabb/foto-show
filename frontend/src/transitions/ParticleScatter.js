import * as THREE from 'three';

export class ParticleScatter {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;
    this.particles = null;
    this.animId = null;
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  async run(imgA, imgB, duration, onComplete) {
    this._cleanup();
    const { w, h } = { w: this.canvas.clientWidth, h: this.canvas.clientHeight };
    this.resize(w, h);

    const COUNT = 12000;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const targets = new Float32Array(COUNT * 3);
    const randoms = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = 0;
      targets[i * 3] = (Math.random() - 0.5) * 2;
      targets[i * 3 + 1] = (Math.random() - 0.5) * 2;
      targets[i * 3 + 2] = 0;
      randoms[i * 3] = Math.random();
      randoms[i * 3 + 1] = Math.random() * 2 - 1;
      randoms[i * 3 + 2] = Math.random() * 6.28;
      colors[i * 3] = Math.random();
      colors[i * 3 + 1] = Math.random() * 0.3;
      colors[i * 3 + 2] = 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 3));

    const mat = new THREE.ShaderMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      uniforms: { uProgress: { value: 0 }, uSize: { value: 3 * window.devicePixelRatio } },
      vertexShader: `
        attribute vec3 aTarget;
        attribute vec3 aRandom;
        uniform float uProgress;
        uniform float uSize;
        varying float vAlpha;
        void main() {
          float t = uProgress;
          float explode = sin(t * 3.14159) * 0.5;
          vec3 scatter = vec3(
            sin(aRandom.z + t * 4.0) * explode,
            cos(aRandom.z * 1.3 + t * 3.0) * explode,
            0.0
          );
          vec3 pos = mix(position, aTarget, t) + scatter;
          vAlpha = 1.0 - abs(t - 0.5) * 1.8;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = uSize * (1.0 + sin(aRandom.y + t * 6.0) * 0.5);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(0.55, 0.37, 0.95, vAlpha * (1.0 - d * 2.0));
        }
      `,
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);

    const bg = this._makeImagePlane(imgA);
    const fg = this._makeImagePlane(imgB);
    fg.material.opacity = 0;
    this.scene.add(bg, fg);

    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / (duration * 1000), 1);
      mat.uniforms.uProgress.value = t;
      bg.material.opacity = 1 - t;
      fg.material.opacity = t;
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

  _makeImagePlane(imgSrc) {
    const tex = new THREE.TextureLoader().load(imgSrc);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    return mesh;
  }

  _cleanup() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.scene.clear();
    this.particles = null;
  }

  dispose() {
    this._cleanup();
    this.renderer.dispose();
  }
}
