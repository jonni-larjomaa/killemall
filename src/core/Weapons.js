import * as THREE from 'three';

export class WeaponSystem {
  constructor(scene, soundEngine, particleSystem) {
    this.scene = scene;
    this.sound = soundEngine;
    this.particles = particleSystem;

    this.projectiles = []; // Active projectiles array

    // Weapon Definitions
    this.weapons = [
      {
        id: 'handgun',
        name: 'PLASMA HANDGUN',
        fireRate: 0.18,   // Semi-automatic single shots
        lastFired: 0,
        damage: 48,       // Crisp powerful single-shot plasma bolts
        speed: 65,
        color: 0x00f3ff,
        ammo: 10,
        maxAmmo: 10,
        isInfiniteReserve: true,
        spread: 0.01,     // Pinpoint accuracy
        type: 'bolt'
      },
      {
        id: 'shotgun',
        name: 'SCATTER SHOTGUN',
        fireRate: 0.55,
        lastFired: 0,
        damage: 28,       // 6 pellets * 28 = 168 damage
        speed: 50,
        color: 0xff6600,
        ammo: 24,
        maxAmmo: 24,
        isInfiniteReserve: false,
        pellets: 6,
        spread: 0.22,
        type: 'spread'
      },
      {
        id: 'railgun',
        name: 'PLASMA RAILGUN',
        fireRate: 0.9,
        lastFired: 0,
        damage: 180,      // Piercing beam
        speed: 100,
        color: 0xff0055,
        ammo: 8,
        maxAmmo: 8,
        isInfiniteReserve: false,
        pierce: true,
        type: 'beam'
      }
    ];
    this.grenades = [];
    this.grenadeCooldown = 3.5;
    this.lastGrenadeTime = 0;
  }

  getCurrentWeapon(index) {
    return this.weapons[index] || this.weapons[0];
  }

  reloadWeapon(index, soundEngine) {
    const w = this.weapons[index];
    if (!w || w.isReloading || w.ammo >= w.maxAmmo) return false;

    w.isReloading = true;
    w.reloadTimer = 1.5;
    if (soundEngine) soundEngine.playReload();
    return true;
  }

  updateReload(delta) {
    this.weapons.forEach(w => {
      if (w.isReloading) {
        w.reloadTimer -= delta;
        if (w.reloadTimer <= 0) {
          w.isReloading = false;
          w.reloadTimer = 0;
          w.ammo = w.maxAmmo;
        }
      }
    });
  }

  fire(index, muzzlePos, aimDir, player) {
    const w = this.weapons[index];
    const now = Date.now() * 0.001;
    const adjustedFireRate = w.fireRate / player.fireRateMultiplier;

    if (now - w.lastFired < adjustedFireRate) return false;
    if (w.isReloading) return false;
    if (w.ammo <= 0) {
      w.lastFired = now;
      if (this.sound) this.sound.playEmptyClick();
      return false;
    }

    w.lastFired = now;
    w.ammo--;
    if (w.isInfiniteReserve && w.ammo < 0) w.ammo = 0;

    const totalDamage = w.damage * player.damageMultiplier;

    try {
      if (w.type === 'bolt') {
        this.spawnProjectile(muzzlePos, aimDir, w.speed, totalDamage, w.color, w.spread, false);
        if (this.sound) this.sound.playPulseRifle();
      } else if (w.type === 'spread') {
        for (let i = 0; i < w.pellets; i++) {
          this.spawnProjectile(muzzlePos, aimDir, w.speed, totalDamage, w.color, w.spread, false);
        }
        if (this.sound) this.sound.playShotgun();
      } else if (w.type === 'beam') {
        this.spawnProjectile(muzzlePos, aimDir, w.speed, totalDamage, w.color, 0.01, true);
        if (this.sound) this.sound.playRailgun();
      }
    } catch (err) {
      console.warn("Weapon fire audio error:", err);
    }

    this.particles.spawnMuzzleFlash(muzzlePos, w.color);

    // Trigger Procedural Weapon Recoil Kick on Player
    const recoilAmount = w.type === 'spread' ? 0.24 : (w.type === 'beam' ? 0.32 : 0.14);
    if (player && player.triggerRecoil) player.triggerRecoil(recoilAmount);

    return true;
  }

  spawnProjectile(origin, direction, speed, damage, colorHex, spreadAmount, isPierce) {
    const dir = direction.clone();
    dir.x += (Math.random() - 0.5) * spreadAmount;
    dir.z += (Math.random() - 0.5) * spreadAmount;
    dir.normalize();

    const length = isPierce ? 2.5 : 0.8;
    const geo = new THREE.CylinderGeometry(0.12, 0.12, length, 8);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      direction: dir,
      speed,
      damage,
      color: colorHex,
      isPierce,
      hitEnemies: new Set(),
      lifeTime: 2.0
    });
  }

  throwGrenade(originPos, targetPos, renderer) {
    const now = Date.now() * 0.001;
    if (now - this.lastGrenadeTime < this.grenadeCooldown) return false;

    this.lastGrenadeTime = now;

    // Create 3D Glowing Frag Pod
    const geo = new THREE.SphereGeometry(0.35, 12, 12);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff3300,
      emissive: 0xff6600,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.8
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(originPos);
    this.scene.add(mesh);

    // Glowing point light attached to grenade
    const light = new THREE.PointLight(0xff6600, 1.5, 8);
    mesh.add(light);

    this.grenades.push({
      mesh,
      light,
      startPos: originPos.clone(),
      targetPos: targetPos.clone(),
      time: 0,
      flightDuration: 0.75,
      renderer
    });

    this.sound.playDodge();
    return true;
  }

  updateGrenades(delta, level, enemies, onKillCallback) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.time += delta;
      const pct = Math.min(1.0, g.time / g.flightDuration);

      // Lerp position along XZ and parabolic arc on Y
      const currentPos = new THREE.Vector3().lerpVectors(g.startPos, g.targetPos, pct);
      currentPos.y = Math.sin(pct * Math.PI) * 4.0 + 0.5;
      g.mesh.position.copy(currentPos);
      g.mesh.rotation.x += delta * 10;
      g.mesh.rotation.y += delta * 15;

      // Detonation on impact or flight end
      if (pct >= 1.0) {
        this.scene.remove(g.mesh);
        this.grenades.splice(i, 1);

        const explodePos = g.targetPos.clone();
        explodePos.y = 0.5;

        // Big Radial Plasma Explosion
        this.particles.spawnExplosion(explodePos);
        this.sound.playExplosion();
        if (g.renderer) g.renderer.triggerShake(1.2);

        // Splash Damage to all enemies within 8.0 units (240 DMG!)
        enemies.forEach(enemy => {
          if (!enemy.isDead && enemy.position.distanceTo(explodePos) < 8.0) {
            enemy.takeDamage(240, onKillCallback);
          }
        });

        // Detonate nearby barrels
        level.barrels.forEach(b => {
          if (!b.destroyed && b.position.distanceTo(explodePos) < 8.0) {
            b.health = 0;
            b.destroyed = true;
            b.mesh.visible = false;
            if (b.light) level.scene.remove(b.light);
            this.particles.spawnExplosion(b.position);
          }
        });
      }
    }
  }

  update(delta, level, enemies, onKillCallback) {
    this.updateReload(delta);
    this.updateGrenades(delta, level, enemies, onKillCallback);

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifeTime -= delta;

      const step = p.direction.clone().multiplyScalar(p.speed * delta);
      p.mesh.position.add(step);

      let shouldDestroy = false;

      // 1. Level Wall / Barrel Collision
      if (level.checkCollision(p.mesh.position, 0.3)) {
        shouldDestroy = true;
        this.particles.spawnSparks(p.mesh.position, p.color, 10);
        this.sound.playHit();

        // Check if hit explosive barrel
        for (let b of level.barrels) {
          if (!b.destroyed && b.position.distanceTo(p.mesh.position) < 2.0) {
            b.health -= p.damage;
            if (b.health <= 0) {
              b.destroyed = true;
              b.mesh.visible = false;
              if (b.light) level.scene.remove(b.light);
              this.particles.spawnExplosion(b.position);
              this.sound.playExplosion();

              // Barrel splash damage to enemies
              for (let enemy of enemies) {
                if (enemy.position.distanceTo(b.position) < 8.0) {
                  enemy.takeDamage(150, onKillCallback);
                }
              }
            }
          }
        }
      }

      // 2. Enemy Hit Collision (2D XZ plane check for 100% reliable hit registration)
      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (enemy.isDead) continue;

        const dx = p.mesh.position.x - enemy.position.x;
        const dz = p.mesh.position.z - enemy.position.z;
        const dist2D = Math.hypot(dx, dz);
        const hitThreshold = enemy.radius + 0.6; // Generous hit radius

        if (dist2D < hitThreshold) {
          if (!p.hitEnemies.has(enemy.id)) {
            p.hitEnemies.add(enemy.id);
            enemy.takeDamage(p.damage, onKillCallback);
            this.particles.spawnBlood(p.mesh.position, 12);
            this.sound.playHit();

            if (!p.isPierce) {
              shouldDestroy = true;
              break;
            }
          }
        }
      }

      if (shouldDestroy || p.lifeTime <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }
}
