import * as THREE from 'three';

export class InputManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.keys = {};
    this.mouseScreen = new THREE.Vector2();
    this.aimPointWorld = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.isFiring = false;
    this.justDashed = false;
    this.justReloaded = false;
    this.selectedWeaponIndex = 0; // 0: Pulse Rifle, 1: Shotgun, 2: Railgun

    this.create3DReticle();
    this.initListeners();
  }

  create3DReticle() {
    const group = new THREE.Group();
    
    // Outer ring
    const ringGeo = new THREE.RingGeometry(0.6, 0.75, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);

    // Center dot
    const dotGeo = new THREE.CircleGeometry(0.12, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xff0055, side: THREE.DoubleSide });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.rotation.x = -Math.PI / 2;
    group.add(dot);

    group.position.y = 0.08;
    this.reticleMesh = group;
    this.renderer.scene.add(group);
  }

  initListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.justDashed = true;
      }
      if (e.code === 'KeyF') {
        this.justFlashlight = true;
      }
      if (e.code === 'KeyG' || e.code === 'KeyQ') {
        this.justGrenade = true;
      }
      if (e.code === 'KeyR') {
        this.justReloaded = true;
      }
      if (e.code === 'KeyE') {
        this.justInteracted = true;
      }
      if (e.code === 'Digit1') this.selectedWeaponIndex = 0;
      if (e.code === 'Digit2') this.selectedWeaponIndex = 1;
      if (e.code === 'Digit3') this.selectedWeaponIndex = 2;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseScreen.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseScreen.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isFiring = true;
      } else if (e.button === 2) {
        this.justGrenade = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isFiring = false;
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('wheel', (e) => {
      if (e.deltaY > 0) {
        this.selectedWeaponIndex = (this.selectedWeaponIndex + 1) % 3;
      } else if (e.deltaY < 0) {
        this.selectedWeaponIndex = (this.selectedWeaponIndex + 2) % 3;
      }
    });
  }

  updateAimPoint() {
    this.raycaster.setFromCamera(this.mouseScreen, this.renderer.camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, target);
    if (target) {
      this.aimPointWorld.copy(target);
      if (this.reticleMesh) {
        this.reticleMesh.position.x = target.x;
        this.reticleMesh.position.z = target.z;
        this.reticleMesh.rotation.y += 0.02;
      }
    }
  }

  getMovementVector(camera) {
    const move = new THREE.Vector3(0, 0, 0);

    // Viewport / Screen-Relative Movement Directions
    let forward = new THREE.Vector3(0, 0, -1); // Up on Screen
    let right = new THREE.Vector3(1, 0, 0);   // Right on Screen

    if (camera) {
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      camDir.y = 0;
      if (camDir.lengthSq() > 0.001) {
        forward.copy(camDir.normalize());
      }

      // Viewport Right vector
      const camRight = new THREE.Vector3();
      camera.matrix.extractBasis(camRight, new THREE.Vector3(), new THREE.Vector3());
      camRight.y = 0;
      if (camRight.lengthSq() > 0.001) {
        right.copy(camRight.normalize());
      }
    }

    if (this.keys['KeyW'] || this.keys['ArrowUp']) move.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) move.sub(forward);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) move.sub(right);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.add(right);

    if (move.lengthSq() > 0) {
      move.normalize();
    }
    return move;
  }

  consumeDash() {
    const dashed = this.justDashed;
    this.justDashed = false;
    return dashed;
  }

  consumeReload() {
    const reloaded = this.justReloaded;
    this.justReloaded = false;
    return reloaded;
  }

  consumeInteract() {
    const interacted = this.justInteracted;
    this.justInteracted = false;
    return interacted;
  }

  consumeGrenade() {
    const g = this.justGrenade;
    this.justGrenade = false;
    return g;
  }

  consumeFlashlight() {
    const f = this.justFlashlight;
    this.justFlashlight = false;
    return f;
  }
}
