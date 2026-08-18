import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];

    // Shared Geometries & Materials
    this.sparkGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    this.bloodGeo = new THREE.SphereGeometry(0.12, 4, 4);
    this.smokeGeo = new THREE.SphereGeometry(0.4, 6, 6);
  }

  spawnHitParticles(position, colorHex, count = 8) {
    this.spawnSparks(position, colorHex, count);
  }

  spawnSparks(position, colorHex, count = 8) {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 12
      );

      this.scene.add(mesh);

      this.particles.push({
        mesh: mesh,
        velocity: vel,
        gravity: -25,
        life: 0.2 + Math.random() * 0.25,
        maxLife: 0.45
      });
    }
  }

  spawnMuzzleFlash(position, colorHex) {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), mat);
    mesh.position.copy(position);

    const light = new THREE.PointLight(colorHex, 2.5, 8);
    mesh.add(light);

    this.scene.add(mesh);

    this.particles.push({
      mesh: mesh,
      velocity: new THREE.Vector3(),
      gravity: 0,
      life: 0.05,
      maxLife: 0.05
    });
  }

  spawnBlood(position, count = 10) {
    const mat = new THREE.MeshBasicMaterial({ color: 0xaa0022 });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.bloodGeo, mat);
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 1,
        (Math.random() - 0.5) * 8
      );

      this.scene.add(mesh);

      this.particles.push({
        mesh: mesh,
        velocity: vel,
        gravity: -20,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5
      });
    }
  }

  spawnExplosion(position) {
    // Fire Embers
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    for (let i = 0; i < 24; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, emberMat);
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        Math.random() * 12 + 4,
        (Math.random() - 0.5) * 20
      );

      this.scene.add(mesh);

      this.particles.push({
        mesh: mesh,
        velocity: vel,
        gravity: -15,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8
      });
    }

    // Flash Light
    const expLight = new THREE.PointLight(0xff4400, 5, 20);
    expLight.position.copy(position);
    this.scene.add(expLight);

    setTimeout(() => {
      this.scene.remove(expLight);
    }, 150);
  }

  spawnDashTrail(position) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), mat);
    mesh.position.copy(position);
    this.scene.add(mesh);

    this.particles.push({
      mesh: mesh,
      velocity: new THREE.Vector3(0, 0, 0),
      gravity: 0,
      life: 0.15,
      maxLife: 0.15
    });
  }

  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      p.velocity.y += p.gravity * delta;
      p.mesh.position.addScaledVector(p.velocity, delta);

      // Fade scale / opacity
      const ratio = p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.01, ratio));

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }
}
