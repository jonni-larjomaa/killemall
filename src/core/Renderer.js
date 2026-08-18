import * as THREE from 'three';

export class EngineRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // 1. Scene with Clear Atmospheric Deck Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1320);
    this.scene.fog = new THREE.FogExp2(0x0b1320, 0.007);

    // 2. Camera (Top-down view)
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 250);
    this.cameraOffset = new THREE.Vector3(0, 28, 16);
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.camera.position.copy(this.cameraOffset);
    this.camera.lookAt(this.cameraTarget);

    // Screen Shake variables
    this.shakeIntensity = 0;
    this.shakeDecay = 5.0;

    // 3. WebGLRenderer (High-Performance 60+ FPS Optimization)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(1); // Standard 1:1 pixel ratio for smooth 60-120+ FPS
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Smooth realistic shadow dimming
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;

    this.container.appendChild(this.renderer.domElement);

    // 4. High-Visibility Lighting Setup
    this.setupLighting();

    // 5. Window Resize Handling
    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    // Clear Ambient Light
    const ambientLight = new THREE.AmbientLight(0x284266, 1.4);
    this.scene.add(ambientLight);

    // Overhead Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0x4080ff, 0x1a2838, 1.2);
    this.scene.add(hemiLight);

    // Directional Deck Light (Optimized Shadow Bounds for 60-120+ FPS)
    const dirLight = new THREE.DirectionalLight(0x77b5ff, 1.8);
    dirLight.position.set(30, 60, -25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    this.scene.add(dirLight);

    // Overhead Central Warning Light
    const warningLight = new THREE.PointLight(0xff4400, 1.2, 45);
    warningLight.position.set(0, 10, 0);
    this.scene.add(warningLight);
    this.warningLight = warningLight;
  }

  triggerShake(intensity = 0.5) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  updateCamera(targetPos, delta) {
    // Smooth camera target lerp
    this.cameraTarget.lerp(targetPos, 0.1);

    const desiredCamPos = this.cameraTarget.clone().add(this.cameraOffset);

    // Apply Screen Shake if active
    if (this.shakeIntensity > 0) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
      const offsetZ = (Math.random() - 0.5) * this.shakeIntensity;
      desiredCamPos.x += offsetX;
      desiredCamPos.z += offsetZ;

      this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * delta);
    }

    this.camera.position.copy(desiredCamPos);
    this.camera.lookAt(this.cameraTarget);

    // Pulse warning light subtly
    if (this.warningLight) {
      this.warningLight.intensity = 0.6 + Math.sin(Date.now() * 0.003) * 0.4;
    }
  }

  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
