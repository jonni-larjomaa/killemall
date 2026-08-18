import * as THREE from 'three';

let enemyIdCounter = 0;

export class HumanoidEnemy {
  constructor(scene, type = 'crawler', spawnPos = new THREE.Vector3(), spawnMode = 'floor') {
    this.scene = scene;
    this.id = ++enemyIdCounter;
    this.type = type;
    this.spawnMode = spawnMode;
    this.isSpawning = (spawnMode === 'ceiling' || spawnMode === 'wall');

    this.position = spawnPos.clone();
    if (spawnMode === 'ceiling') {
      this.position.y = 11.5;
    } else if (spawnMode === 'wall') {
      this.position.y = 2.8;
    }

    this.velocity = new THREE.Vector3();
    this.isDead = false;
    this.radius = 0.9;
    this.animTime = Math.random() * 100;

    // Configure High-Visibility Stats & Colors based on Humanoid Type
    if (type === 'crawler') {
      this.maxHealth = 45;
      this.speed = 4.8;        // Moderate swarming pace
      this.damage = 15;
      this.scoreValue = 100;
      this.attackRange = 1.6;
      this.attackCooldown = 0.9;
      this.colorHex = 0xff0044; // Bright Neon Crimson
      this.emissiveHex = 0x880022;
    } else if (type === 'spitter') {
      this.maxHealth = 85;
      this.speed = 3.8;        // Ranged tactical pace
      this.damage = 25;
      this.scoreValue = 200;
      this.attackRange = 14.0;
      this.attackCooldown = 2.0;
      this.colorHex = 0xaa00ff; // High-contrast Neon Purple
      this.emissiveHex = 0x5500aa;
    } else if (type === 'brute') {
      this.maxHealth = 280;
      this.speed = 2.4;        // Heavy lumbering tank
      this.damage = 40;
      this.scoreValue = 500;
      this.attackRange = 2.5;
      this.attackCooldown = 1.8;
      this.radius = 1.4;
      this.colorHex = 0xff6600; // Fiery High-visibility Orange
      this.emissiveHex = 0xaa3300;
    }

    this.health = this.maxHealth;
    this.lastAttackTime = 0;

    this.mesh = this.createHumanoidMesh();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  createHumanoidMesh() {
    const group = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: this.colorHex,
      emissive: this.emissiveHex,
      emissiveIntensity: 0.12, // Subtle emissive glow so environmental shadows dim hostiles
      roughness: 0.5,
      metalness: 0.3
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    if (this.type === 'crawler') {
      // Crawling Humanoid (Hunched, elongated limbs)
      const torsoGeo = new THREE.BoxGeometry(0.9, 0.6, 1.2);
      const torso = new THREE.Mesh(torsoGeo, skinMat);
      torso.position.y = 0.5;
      group.add(torso);

      const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.set(0, 0.7, 0.7);
      group.add(head);

      // Glowing Eyes
      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.1), eyeMat);
      const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.1), eyeMat);
      eyeL.position.set(-0.12, 0.75, 0.95);
      eyeR.position.set(0.12, 0.75, 0.95);
      group.add(eyeL); group.add(eyeR);

      // Limbs for animation
      this.leftArm = this.createLimb(0.2, 0.9, skinMat, [-0.55, 0.5, 0.3]);
      this.rightArm = this.createLimb(0.2, 0.9, skinMat, [0.55, 0.5, 0.3]);
      this.leftLeg = this.createLimb(0.2, 0.9, skinMat, [-0.4, 0.4, -0.4]);
      this.rightLeg = this.createLimb(0.2, 0.9, skinMat, [0.4, 0.4, -0.4]);

      group.add(this.leftArm); group.add(this.rightArm);
      group.add(this.leftLeg); group.add(this.rightLeg);
    } else {
      // Upright Cybernetic Humanoid (Spitter / Brute)
      const scale = this.type === 'brute' ? 1.5 : 1.0;

      const torsoGeo = new THREE.BoxGeometry(0.8 * scale, 1.2 * scale, 0.6 * scale);
      const torso = new THREE.Mesh(torsoGeo, skinMat);
      torso.position.y = 1.0 * scale;
      group.add(torso);

      const headGeo = new THREE.SphereGeometry(0.35 * scale, 8, 8);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.8 * scale;
      group.add(head);

      // Glowing Red Eye Visor
      const eyeGeo = new THREE.BoxGeometry(0.4 * scale, 0.1 * scale, 0.2 * scale);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(0, 1.85 * scale, 0.25 * scale);
      group.add(eye);

      // Limbs
      this.leftArm = this.createLimb(0.2 * scale, 1.0 * scale, skinMat, [-0.55 * scale, 1.2 * scale, 0]);
      this.rightArm = this.createLimb(0.2 * scale, 1.0 * scale, skinMat, [0.55 * scale, 1.2 * scale, 0]);
      this.leftLeg = this.createLimb(0.25 * scale, 1.0 * scale, skinMat, [-0.3 * scale, 0.5 * scale, 0]);
      this.rightLeg = this.createLimb(0.25 * scale, 1.0 * scale, skinMat, [0.3 * scale, 0.5 * scale, 0]);

      group.add(this.leftArm); group.add(this.rightArm);
      group.add(this.leftLeg); group.add(this.rightLeg);
    }

    // Enable shadow casting AND shadow receiving on all enemy meshes
    group.traverse(child => {
      if (child.isMesh && !(child.material instanceof THREE.MeshBasicMaterial)) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  createLimb(w, h, mat, pos) {
    const geo = new THREE.BoxGeometry(w, h, w);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  takeDamage(amount, onKillCallback) {
    if (this.isDead) return;

    this.health -= amount;

    // Flash white on hit safely
    this.mesh.traverse(child => {
      if (child.isMesh && child.material && child.material.color) {
        if (child.userData.origColor === undefined) {
          child.userData.origColor = child.material.color.getHex();
        }
        child.material.color.setHex(0xffffff);
        setTimeout(() => {
          if (!this.isDead && child.material && child.material.color) {
            child.material.color.setHex(child.userData.origColor);
          }
        }, 50);
      }
    });

    if (this.health <= 0) {
      this.isDead = true;
      this.scene.remove(this.mesh);
      if (onKillCallback) onKillCallback(this);
    }
  }

  update(delta, player, level, soundEngine, particleSystem, enemyProjectiles) {
    if (this.isDead) return;

    // Handling Spawn Entry Animations (Ceiling Drop / Wall Vent Leap)
    if (this.isSpawning) {
      if (this.spawnMode === 'ceiling') {
        this.position.y -= delta * 24.0;
        if (this.position.y <= 0) {
          this.position.y = 0;
          this.isSpawning = false;
          // Slam Impact Effect on deck floor
          if (particleSystem) particleSystem.spawnExplosion(this.position);
          if (soundEngine) soundEngine.playHumanoidGrowl();
        }
      } else if (this.spawnMode === 'wall') {
        // Leap out from wall vent towards deck center
        const toCenter = new THREE.Vector3(0, 0, 0).sub(this.position);
        toCenter.y = 0;
        toCenter.normalize();
        this.position.add(toCenter.multiplyScalar(delta * 8.0));
        this.position.y -= delta * 6.0;

        if (this.position.y <= 0) {
          this.position.y = 0;
          this.isSpawning = false;
        }
      }
      this.mesh.position.copy(this.position);
      return;
    }

    this.animTime += delta * 6.0;

    // Vector to Player
    const toPlayer = player.position.clone().sub(this.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();

    if (distance > 0.1) {
      toPlayer.normalize();

      // Look towards player
      const aimPos = player.position.clone();
      aimPos.y = this.position.y;
      this.mesh.lookAt(aimPos);

      // Move towards player if not in immediate attack range
      if (distance > this.attackRange * 0.8) {
        const step = toPlayer.clone().multiplyScalar(this.speed * delta);
        const nextPos = this.position.clone().add(step);
        if (!level.checkCollision(nextPos, this.radius)) {
          this.position.copy(nextPos);
        } else {
          // Slide along free axis
          const nextX = this.position.clone().add(new THREE.Vector3(step.x, 0, 0));
          const nextZ = this.position.clone().add(new THREE.Vector3(0, 0, step.z));
          if (!level.checkCollision(nextX, this.radius)) this.position.copy(nextX);
          else if (!level.checkCollision(nextZ, this.radius)) this.position.copy(nextZ);
        }
      }
    }

    this.mesh.position.copy(this.position);

    // Procedural Limb Animation (Walk / Crawl cycles)
    if (this.leftArm && this.rightArm) {
      const swing = Math.sin(this.animTime);
      this.leftArm.rotation.x = swing * 0.6;
      this.rightArm.rotation.x = -swing * 0.6;
      this.leftLeg.rotation.x = -swing * 0.6;
      this.rightLeg.rotation.x = swing * 0.6;
    }

    // Attack Behavior
    const now = Date.now() * 0.001;
    if (distance <= this.attackRange && (now - this.lastAttackTime > this.attackCooldown)) {
      this.lastAttackTime = now;

      if (this.type === 'spitter' || this.type === 'brute') {
        // Fire dodgeable projectile towards player
        const shootOrigin = this.position.clone();
        shootOrigin.y = this.type === 'brute' ? 1.8 : 1.2;

        const dir = player.position.clone().add(new THREE.Vector3(0, 0.6, 0)).sub(shootOrigin).normalize();

        const speed = this.type === 'brute' ? 11.0 : 16.0;
        const projRadius = this.type === 'brute' ? 0.45 : 0.25;
        const color = this.colorHex;

        // Projectile Mesh
        const geo = new THREE.SphereGeometry(projRadius, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(shootOrigin);
        this.scene.add(mesh);

        if (enemyProjectiles) {
          enemyProjectiles.push({
            mesh,
            position: shootOrigin,
            direction: dir,
            speed,
            damage: this.damage,
            radius: projRadius,
            color,
            isExplosive: this.type === 'brute',
            lifeTime: 0
          });
        }

        if (soundEngine) soundEngine.playHumanoidGrowl();
        if (particleSystem) particleSystem.spawnMuzzleFlash(shootOrigin, color);
      } else {
        // Crawler Melee Attack
        player.takeDamage(this.damage);
        if (soundEngine) soundEngine.playHumanoidGrowl();
      }
    }
  }
}
