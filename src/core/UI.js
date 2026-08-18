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
    this.enemyLeftText.innerText = game.enemies.length;
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
    const scale = w / game.level.mapSize; // Map to radar scale

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(center, 0); ctx.lineTo(center, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, center); ctx.lineTo(w, center); ctx.stroke();

    // Draw Barrels
    ctx.fillStyle = '#ffaa00';
    for (let b of game.level.barrels) {
      if (!b.destroyed) {
        const rx = center + b.position.x * scale;
        const ry = center + b.position.z * scale;
        ctx.fillRect(rx - 2, ry - 2, 4, 4);
      }
    }

    // Draw Enemies (Red Dots)
    ctx.fillStyle = '#ff0055';
    for (let e of game.enemies) {
      if (!e.isDead) {
        const rx = center + e.position.x * scale;
        const ry = center + e.position.z * scale;
        ctx.beginPath();
        ctx.arc(rx, ry, e.type === 'brute' ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Player (Cyan Icon with Direction Cone)
    const px = center + game.player.position.x * scale;
    const py = center + game.player.position.z * scale;

    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Direction line to mouse target
    const aimVector = game.input.aimPointWorld.clone().sub(game.player.position);
    aimVector.y = 0;
    aimVector.normalize().multiplyScalar(12);
    const ax = px + aimVector.x * scale;
    const ay = py + aimVector.z * scale;

    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ax, ay);
    ctx.stroke();
  }
}
