export class UIManager {
  constructor() {
    // DOM Elements
    this.healthBar = document.getElementById('health-bar');
    this.healthText = document.getElementById('health-text');
    this.shieldBar = document.getElementById('shield-bar');
    this.shieldText = document.getElementById('shield-text');

    this.waveNumText = document.getElementById('wave-num');
    this.enemyLeftText = document.getElementById('enemy-left');
    this.scoreValText = document.getElementById('score-val');
    this.multValText = document.getElementById('mult-val');

    this.dashCd = document.getElementById('dash-cd');

    this.banner = document.getElementById('banner');
    this.bannerTitle = document.getElementById('banner-title');
    this.bannerSub = document.getElementById('banner-sub');

    this.upgradeModal = document.getElementById('upgrade-modal');
    this.startScreen = document.getElementById('start-screen');
    this.gameOverScreen = document.getElementById('game-over-screen');

    // Minimap Radar Canvas
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas.getContext('2d');

    // Weapon HUD Cards
    this.weaponCards = [
      document.getElementById('weapon-1'),
      document.getElementById('weapon-2'),
      document.getElementById('weapon-3')
    ];
    this.ammoTexts = [
      document.getElementById('ammo-1'),
      document.getElementById('ammo-2'),
      document.getElementById('ammo-3')
    ];
  }

  showBanner(title, subtitle, duration = 3000) {
    this.bannerTitle.innerText = title;
    this.bannerSub.innerText = subtitle;
    this.banner.classList.remove('hidden');

    setTimeout(() => {
      this.banner.classList.add('hidden');
    }, duration);
  }

  showUpgradeModal(onSelectUpgrade) {
    this.upgradeModal.classList.remove('hidden');

    const buttons = this.upgradeModal.querySelectorAll('.upgrade-btn');
    buttons.forEach(btn => {
      const handler = (e) => {
        const type = btn.getAttribute('data-upgrade');
        this.upgradeModal.classList.add('hidden');
        // Remove listeners
        buttons.forEach(b => b.replaceWith(b.cloneNode(true)));
        onSelectUpgrade(type);
      };
      btn.addEventListener('click', handler, { once: true });
    });
  }

  showGameOver(wave, kills, score) {
    document.getElementById('final-wave').innerText = wave;
    document.getElementById('final-kills').innerText = kills;
    document.getElementById('final-score').innerText = score.toLocaleString();
    this.gameOverScreen.classList.remove('hidden');
  }

  hideStartScreen() {
    this.startScreen.classList.add('hidden');
  }

  updateHUD(game) {
    const p = game.player;

    // 1. Health & Shield Bars
    const hPct = Math.max(0, (p.health / p.maxHealth) * 100);
    const sPct = Math.max(0, (p.shield / p.maxShield) * 100);
    this.healthBar.style.width = `${hPct}%`;
    this.healthText.innerText = `${Math.ceil(p.health)} / ${p.maxHealth}`;
    this.shieldBar.style.width = `${sPct}%`;
    this.shieldText.innerText = `${Math.ceil(p.shield)} / ${p.maxShield}`;

    // 2. Wave & Score
    this.waveNumText.innerText = game.currentWave;
    if (game.isIntermission) {
      this.enemyLeftText.innerText = `NEXT WAVE: ${Math.ceil(game.intermissionTimer)}s`;
      this.enemyLeftText.style.color = '#00f3ff';
    } else {
      this.enemyLeftText.innerText = `MUTANTS: ${game.enemies.length}`;
      this.enemyLeftText.style.color = '';
    }
    this.scoreValText.innerText = game.score.toLocaleString().padStart(6, '0');
    this.multValText.innerText = `x${game.multiplier.toFixed(1)}`;

    // 3. Dash Cooldown
    const cdPct = p.dashCooldownTimer > 0 ? (p.dashCooldownTimer / p.dashCooldown) * 100 : 0;
    this.dashCd.style.height = `${cdPct}%`;

    // 4. Weapon Slots
    game.weapons.weapons.forEach((w, idx) => {
      if (idx === game.input.selectedWeaponIndex) {
        this.weaponCards[idx].classList.add('active');
      } else {
        this.weaponCards[idx].classList.remove('active');
      }

      if (w.isReloading) {
        const dots = '.'.repeat((Math.floor(Date.now() * 0.003) % 3) + 1);
        this.ammoTexts[idx].innerText = `RELOADING${dots}`;
        this.ammoTexts[idx].style.color = '#ffaa00';
      } else if (w.isInfiniteReserve) {
        this.ammoTexts[idx].innerText = `${w.ammo} / ∞`;
        this.ammoTexts[idx].style.color = '';
      } else {
        this.ammoTexts[idx].innerText = `${w.ammo} / ${w.maxAmmo}`;
        this.ammoTexts[idx].style.color = w.ammo === 0 ? '#ff3344' : '';
      }
    });

    // 5. Draw Tactical Minimap
    this.drawMinimap(game);
  }

  drawMinimap(game) {
    const ctx = this.radarCtx;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const center = w / 2;
    const scale = w / game.level.mapSize; // Radar scale (pixels per world unit)

    const playerPos = game.player.position;
    const px = playerPos.x;
    const pz = playerPos.z;

    ctx.clearRect(0, 0, w, h);

    // 1. World Grid Lines (Scrolling with player movement)
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 20; // 20 units per grid line
    const startX = Math.floor((px - game.level.mapSize) / gridSize) * gridSize;
    const endX = Math.ceil((px + game.level.mapSize) / gridSize) * gridSize;
    const startZ = Math.floor((pz - game.level.mapSize) / gridSize) * gridSize;
    const endZ = Math.ceil((pz + game.level.mapSize) / gridSize) * gridSize;

    for (let gx = startX; gx <= endX; gx += gridSize) {
      const rx = center + (gx - px) * scale;
      if (rx >= 0 && rx <= w) {
        ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, h); ctx.stroke();
      }
    }
    for (let gz = startZ; gz <= endZ; gz += gridSize) {
      const ry = center + (gz - pz) * scale;
      if (ry >= 0 && ry <= h) {
        ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(w, ry); ctx.stroke();
      }
    }

    // 2. Fixed Radar Crosshair (Centered on player)
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(center, 0); ctx.lineTo(center, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, center); ctx.lineTo(w, center); ctx.stroke();

    // 3. Draw Outer Map Perimeter Boundary
    const halfMap = game.level.mapSize / 2;
    const mapMinX = center + (-halfMap - px) * scale;
    const mapMinY = center + (-halfMap - pz) * scale;
    const mapSizePx = game.level.mapSize * scale;

    ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mapMinX, mapMinY, mapSizePx, mapSizePx);

    // 4. Draw Internal Wall Colliders
    ctx.fillStyle = 'rgba(0, 243, 255, 0.15)';
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let col of game.level.colliders) {
      const rx = center + (col.min.x - px) * scale;
      const ry = center + (col.min.z - pz) * scale;
      const rw = (col.max.x - col.min.x) * scale;
      const rh = (col.max.z - col.min.z) * scale;

      ctx.fillRect(rx, ry, Math.max(rw, 2), Math.max(rh, 2));
      ctx.strokeRect(rx, ry, Math.max(rw, 2), Math.max(rh, 2));
    }

    // 5. Draw Explosive Barrels
    ctx.fillStyle = '#ffaa00';
    for (let b of game.level.barrels) {
      if (!b.destroyed) {
        const rx = center + (b.position.x - px) * scale;
        const ry = center + (b.position.z - pz) * scale;
        ctx.fillRect(rx - 2, ry - 2, 4, 4);
      }
    }

    // 6. Draw Terminal Pod (if active)
    if (game.level.terminalPod) {
      const tx = center + (game.level.terminalPod.position.x - px) * scale;
      const ty = center + (game.level.terminalPod.position.z - pz) * scale;

      ctx.fillStyle = '#00f3ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(tx - 4, ty - 4, 8, 8);
      ctx.shadowBlur = 0;
    }

    // 7. Draw Enemies (Red Dots / Brutes)
    for (let e of game.enemies) {
      if (!e.isDead) {
        const rx = center + (e.position.x - px) * scale;
        const ry = center + (e.position.z - pz) * scale;

        ctx.fillStyle = e.type === 'brute' ? '#ff0033' : '#ff0055';
        ctx.beginPath();
        ctx.arc(rx, ry, e.type === 'brute' ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 8. Draw Player (Always at Radar Center)
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(center, center, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 9. Direction / Aim Line from Player Center
    const aimVector = game.input.aimPointWorld.clone().sub(playerPos);
    aimVector.y = 0;
    if (aimVector.lengthSq() > 0.001) {
      aimVector.normalize().multiplyScalar(14);
      const ax = center + aimVector.x;
      const ay = center + aimVector.z;

      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(ax, ay);
      ctx.stroke();
    }
  }
}
