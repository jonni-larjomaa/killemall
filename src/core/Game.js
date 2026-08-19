import * as THREE from 'three';
import { EngineRenderer } from './Renderer.js';
import { InputManager } from './Input.js';
import { SoundEngine } from './Audio.js';
import { LevelMap } from './Level.js';
import { Player } from './Player.js';
import { WeaponSystem } from './Weapons.js';
import { HumanoidEnemy } from './Enemy.js';
import { ParticleSystem } from './Particles.js';
import { UIManager } from './UI.js';

export class Game {
  constructor() {
    this.state = 'START'; // 'START' | 'PLAYING' | 'UPGRADE' | 'PAUSED' | 'GAME_OVER'

    // Core Systems
    this.renderer = new EngineRenderer('canvas-container');
    this.input = new InputManager(this.renderer);
    this.sound = new SoundEngine();
    this.particles = new ParticleSystem(this.renderer.scene);
    this.level = new LevelMap(this.renderer.scene);
    this.player = new Player(this.renderer.scene);
    this.weapons = new WeaponSystem(this.renderer.scene, this.sound, this.particles);
    this.ui = new UIManager();

    this.enemies = [];
    this.enemyProjectiles = [];
    this.currentWave = 0;
    this.totalKills = 0;
    this.score = 0;
    this.multiplier = 1.0;
    this.lastKillTime = 0;

    this.clock = new THREE.Clock();

    this.initEventListeners();
  }

  initEventListeners() {
    document.getElementById('btn-start').addEventListener('click', async () => {
      await this.sound.init();
      this.ui.hideStartScreen();
      this.startNewGame();
    });

    document.getElementById('btn-restart').addEventListener('click', async () => {
      await this.sound.init();
      document.getElementById('game-over-screen').classList.add('hidden');
      this.startNewGame();
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.togglePause(false);
    });

    document.getElementById('btn-pause-restart').addEventListener('click', async () => {
      await this.sound.init();
      document.getElementById('pause-screen').classList.add('hidden');
      this.startNewGame();
    });

    document.getElementById('btn-pause').addEventListener('click', () => {
      if (this.state === 'PLAYING' || this.state === 'PAUSED') {
        this.togglePause();
      }
    });

    document.getElementById('btn-audio').addEventListener('click', async (e) => {
      await this.sound.init();
      const isMuted = this.sound.toggleMute();
      e.target.innerText = isMuted ? '🔇 AUDIO: OFF' : '🔊 AUDIO: ON';
    });

    const btnFlashlight = document.getElementById('btn-flashlight');
    if (btnFlashlight) {
      btnFlashlight.addEventListener('click', () => {
        this.toggleFlashlightState();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
        this.togglePause();
      }
    });
  }

  toggleFlashlightState() {
    const isOn = this.player.toggleFlashlight();
    this.sound.playFlashlightClick();
    const btn = document.getElementById('btn-flashlight');
    if (btn) {
      btn.innerText = isOn ? '🔦 FLASHLIGHT: ON [F]' : '🔦 FLASHLIGHT: OFF [F]';
    }
  }

  togglePause(overrideState) {
    if (overrideState !== undefined) {
      this.state = overrideState ? 'PAUSED' : 'PLAYING';
    } else {
      this.state = this.state === 'PLAYING' ? 'PAUSED' : 'PLAYING';
    }

    const pauseScreen = document.getElementById('pause-screen');
    if (this.state === 'PAUSED') {
      pauseScreen.classList.remove('hidden');
      this.sound.pauseTechnoTrack();
    } else {
      pauseScreen.classList.add('hidden');
      this.sound.resumeTechnoTrack();
    }
  }

  startNewGame() {
    // Reset Player
    this.player.health = 100;
    this.player.maxHealth = 100;
    this.player.shield = 100;
    this.player.maxShield = 100;
    this.player.fireRateMultiplier = 1.0;
    this.player.damageMultiplier = 1.0;
    this.player.position.set(0, 1, 0);

    // Reset Weapons Ammo
    this.weapons.weapons.forEach(w => w.ammo = w.maxAmmo);

    // Clear Enemies & Enemy Projectiles
    this.enemies.forEach(e => this.renderer.scene.remove(e.mesh));
    this.enemies = [];
    if (this.enemyProjectiles) {
      this.enemyProjectiles.forEach(p => this.renderer.scene.remove(p.mesh));
    }
    this.enemyProjectiles = [];

    this.currentWave = 0;
    this.totalKills = 0;
    this.score = 0;
    this.multiplier = 1.0;
    this.terminalSpawned = false;
    this.level.removeTerminalPod();

    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('interact-prompt').classList.add('hidden');
    this.state = 'PLAYING';
    this.sound.startTechnoTrack();
    this.nextWave();
  }

  nextWave() {
    this.currentWave++;
    this.terminalSpawned = false;
    this.level.removeTerminalPod();
    this.ui.showBanner(`CONTAINMENT BREACH - WAVE ${this.currentWave}`, 'HUMANOID HOSTILES INBOUND!');

    // Refill player ammo between waves
    this.weapons.weapons.forEach(w => w.ammo = w.maxAmmo);

    // Spawn Enemies based on wave number with multi-entry points
    const count = 6 + this.currentWave * 4;
    for (let i = 0; i < count; i++) {
      // Pick random spawn mode: 40% Floor, 30% Wall, 30% Ceiling
      const randMode = Math.random();
      let spawnMode = 'floor';
      let spawnPt;

      if (randMode < 0.4) {
        spawnMode = 'floor';
        spawnPt = this.level.floorSpawns[Math.floor(Math.random() * this.level.floorSpawns.length)];
      } else if (randMode < 0.7) {
        spawnMode = 'wall';
        spawnPt = this.level.wallSpawns[Math.floor(Math.random() * this.level.wallSpawns.length)];
      } else {
        spawnMode = 'ceiling';
        spawnPt = this.level.ceilingSpawns[Math.floor(Math.random() * this.level.ceilingSpawns.length)];
      }

      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        0,
        (Math.random() - 0.5) * 3
      );

      let type = 'crawler';
      const randType = Math.random();
      if (this.currentWave >= 2 && randType > 0.6) type = 'spitter';
      if (this.currentWave >= 3 && randType > 0.85) type = 'brute';

      const enemy = new HumanoidEnemy(this.renderer.scene, type, spawnPt.clone().add(offset), spawnMode);
      this.enemies.push(enemy);
    }
  }

  onEnemyKilled(enemy) {
    this.totalKills++;
    const now = Date.now() * 0.001;

    // Multiplier combo mechanic (Kills within 3 seconds boost multiplier)
    if (now - this.lastKillTime < 3.0) {
      this.multiplier = Math.min(5.0, this.multiplier + 0.2);
    } else {
      this.multiplier = 1.0;
    }
    this.lastKillTime = now;

    this.score += Math.floor(enemy.scoreValue * this.multiplier);

    // Screen Shake on kill
    this.renderer.triggerShake(enemy.type === 'brute' ? 0.8 : 0.25);
  }

  applyUpgrade(type) {
    if (type === 'health') {
      this.player.maxHealth += 30;
      this.player.health = this.player.maxHealth;
    } else if (type === 'shield') {
      this.player.maxShield += 25;
      this.player.shield = this.player.maxShield;
    } else if (type === 'fireRate') {
      this.player.fireRateMultiplier += 0.25;
    } else if (type === 'damage') {
      this.player.damageMultiplier += 0.2;
    }

    this.level.removeTerminalPod();
    this.state = 'PLAYING';
    this.nextWave();
  }

  run() {
    this.renderer.renderer.setAnimationLoop(() => this.update());
  }

  update() {
    const delta = Math.min(0.1, this.clock.getDelta());

    if (this.state === 'PLAYING') {
      // 1. Raycast Aim Target
      this.input.updateAimPoint();

      // Flashlight Toggle Trigger
      if (this.input.consumeFlashlight()) {
        this.toggleFlashlightState();
      }

      // 2. Dodge Dash Trigger
      if (this.input.consumeDash()) {
        const moveDir = this.input.getMovementVector(this.renderer.camera);
        if (this.player.triggerDash(moveDir)) {
          this.sound.playDodge();
          this.particles.spawnDashTrail(this.player.position);
        }
      }

      // 3. Grenade Throw Trigger
      if (this.input.consumeGrenade()) {
        this.weapons.throwGrenade(this.player.position, this.input.aimPointWorld, this.renderer);
      }

      // 4. Reload Trigger
      if (this.input.consumeReload()) {
        const started = this.weapons.reloadWeapon(this.input.selectedWeaponIndex, this.sound);
        if (started) this.player.startReloadAnimation();
      }

      // Check for weapon selection switch
      if (this.input.selectedWeaponIndex !== this.player.currentWeaponIndex && !this.player.isSwitchingWeapon) {
        this.player.switchWeapon(this.input.selectedWeaponIndex, this.sound);
      }

      // 5. Weapon Firing Trigger
      if (this.input.isFiring && !this.player.isSwitchingWeapon) {
        const muzzlePos = this.player.getMuzzleWorldPosition();
        const aimDir = this.input.aimPointWorld.clone().sub(muzzlePos);
        aimDir.y = 0;
        aimDir.normalize();

        this.weapons.fire(this.input.selectedWeaponIndex, muzzlePos, aimDir, this.player);
      }

      // 5. Update Player & Camera
      this.player.update(delta, this.input, this.level, this.renderer.camera);
      this.renderer.updateCamera(this.player.position, delta);

      // 6. Update Projectiles & Enemies
      this.weapons.update(delta, this.level, this.enemies, (enemy) => this.onEnemyKilled(enemy));

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.isDead) {
          this.enemies.splice(i, 1);
        } else {
          e.update(delta, this.player, this.level, this.sound, this.particles, this.enemyProjectiles);
        }
      }

      // Update Enemy Projectiles (Dodgeable Attacks)
      for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        const p = this.enemyProjectiles[i];
        p.lifeTime += delta;

        const step = p.direction.clone().multiplyScalar(p.speed * delta);
        p.position.add(step);
        p.mesh.position.copy(p.position);

        let remove = false;

        if (this.level.checkCollision(p.position, p.radius) || p.lifeTime > 4.0) {
          remove = true;
          this.particles.spawnSparks(p.position, p.color);
        } else {
          const distToPlayer = p.position.distanceTo(this.player.position);
          if (distToPlayer < (0.8 + p.radius)) {
            remove = true;
            if (this.player.isDashing) {
              // DODGED!
              this.particles.spawnDashTrail(this.player.position);
              this.sound.playDodge();
              this.ui.showBanner("PROJECTILE EVADED!", "PERFECT DODGE EXECUTION (+25 SHIELD RECHARGE)");
              this.player.shield = Math.min(this.player.maxShield, this.player.shield + 25);
            } else {
              // HIT!
              this.player.takeDamage(p.damage);
              this.sound.playHit();
              this.particles.spawnSparks(this.player.position, 0xff0044);
              this.renderer.triggerShake(0.35);
            }
          }
        }

        if (remove) {
          if (p.isExplosive) {
            this.particles.spawnExplosion(p.position);
            this.sound.playExplosion();
          }
          this.renderer.scene.remove(p.mesh);
          this.enemyProjectiles.splice(i, 1);
        }
      }

      // 7. Update Particles
      this.particles.update(delta);

      // 8. Terminal Pod & Wave Clear Check
      if (this.enemies.length === 0 && !this.terminalSpawned) {
        this.terminalSpawned = true;
        this.level.spawnTerminalPod(new THREE.Vector3(0, 0, 0));
        this.ui.showBanner("WAVE CLEARED!", "UPGRADE TERMINAL DEPLOYED AT DECK CENTER (PRESS E)");
      }

      if (this.level.terminalPod) {
        this.level.terminalPod.update(delta);
        const distToTerminal = this.player.position.distanceTo(this.level.terminalPod.position);
        const promptEl = document.getElementById('interact-prompt');

        if (distToTerminal < 3.5) {
          promptEl.classList.remove('hidden');
          if (this.input.consumeInteract()) {
            promptEl.classList.add('hidden');
            this.sound.playDodge();
            this.state = 'UPGRADE';
            this.ui.showUpgradeModal((type) => this.applyUpgrade(type));
          }
        } else {
          promptEl.classList.add('hidden');
        }
      }

      // 9. Player Death Check
      if (this.player.health <= 0) {
        document.getElementById('interact-prompt').classList.add('hidden');
        this.state = 'GAME_OVER';
        this.sound.stopTechnoTrack();
        this.sound.playExplosion();
        this.renderer.triggerShake(1.5);
        this.ui.showGameOver(this.currentWave, this.totalKills, this.score);
      }
    }

    // Always Update HUD & Render Scene
    this.ui.updateHUD(this);
    this.renderer.render();
  }
}
