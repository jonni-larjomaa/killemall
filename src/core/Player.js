import * as THREE from 'three';

export class Player {
  constructor(scene) {
    this.scene = scene;

    // Player stats & state
    this.maxHealth = 100;
    this.health = 100;
    this.maxShield = 100;
    this.shield = 100;
    this.shieldRechargeDelay = 3.0; // Seconds before shield recharges
    this.lastDamageTime = 0;

    this.baseSpeed = 12;
    this.speed = 12;
    this.velocity = new THREE.Vector3();
    this.position = new THREE.Vector3(0, 1, 0);

    // Dodge Dash
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDuration = 0.2;
    this.dashCooldown = 1.2;
    this.dashCooldownTimer = 0;
    this.dashDirection = new THREE.Vector3();

    // Animation state
    this.walkAnimTime = 0;
    this.isReloadingAnim = false;
    this.reloadAnimTime = 0;
    this.reloadAnimDuration = 1.5;

    // Weapon Switching Animation
    this.isSwitchingWeapon = false;
    this.switchAnimTime = 0;
    this.switchAnimDuration = 0.35;
    this.targetWeaponIndex = 0;
    this.hasSwappedModelInAnim = false;

    // Weapon Sway & Recoil
    this.recoilOffset = 0;
    this.recoilRotation = 0;
    this.gunSwayX = 0;
    this.gunSwayY = 0;

    this.mesh = this.createMarineMesh();
    this.scene.add(this.mesh);

    this.createTerminalPointer();
    this.setupFlashlight();
  }

  createTerminalPointer() {
    const group = new THREE.Group();

    // Sleek glowing 3D triangle arrow pointing along +Z axis
    const headGeo = new THREE.ConeGeometry(0.3, 0.7, 3);
    headGeo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.9
    });
    const head = new THREE.Mesh(headGeo, mat);
    group.add(head);

    // Glowing outline
    const wireGeo = new THREE.ConeGeometry(0.32, 0.72, 3);
    wireGeo.rotateX(Math.PI / 2);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    group.add(wire);

    // Glowing point light attached to arrow
    const light = new THREE.PointLight(0x00f3ff, 2.5, 6);
    group.add(light);

    group.visible = false;
    this.scene.add(group);
    this.terminalPointer = group;
  }

  create3DWeapons() {
    const pivot = new THREE.Group();
    pivot.position.set(0.35, 1.25, 0.65);

    const darkMat = new THREE.MeshStandardMaterial({ color: 0x11151a, metalness: 0.85, roughness: 0.2 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x253040, metalness: 0.9, roughness: 0.3 });
    const cyanGlow = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
    const amberGlow = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    const crimsonGlow = new THREE.MeshBasicMaterial({ color: 0xff0055 });

    // ==========================================
    // 1. PLASMA HANDGUN (Index 0)
    // ==========================================
    const handgun = new THREE.Group();
    
    // Main Body / Receiver
    const hBodyGeo = new THREE.BoxGeometry(0.12, 0.2, 0.5);
    const hBody = new THREE.Mesh(hBodyGeo, darkMat);
    handgun.add(hBody);

    // Pistol Barrel
    const hBarrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 12);
    const hBarrel = new THREE.Mesh(hBarrelGeo, metalMat);
    hBarrel.rotation.x = Math.PI / 2;
    hBarrel.position.set(0, 0.03, 0.25);
    handgun.add(hBarrel);

    // Cyan Energy Cell underneath
    const hCellGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
    const hCell = new THREE.Mesh(hCellGeo, cyanGlow);
    hCell.rotation.x = Math.PI / 2;
    hCell.position.set(0, -0.07, 0.05);
    handgun.add(hCell);

    // Muzzle Emitter Tip
    const hTipGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12);
    const hTip = new THREE.Mesh(hTipGeo, cyanGlow);
    hTip.rotation.x = Math.PI / 2;
    hTip.position.set(0, 0.03, 0.38);
    handgun.add(hTip);
    const handgunMuzzle = hTip;

    pivot.add(handgun);

    // ==========================================
    // 2. SCATTER SHOTGUN (Index 1)
    // ==========================================
    const shotgun = new THREE.Group();

    // Heavy Rectangular Receiver
    const sBodyGeo = new THREE.BoxGeometry(0.22, 0.26, 0.7);
    const sBody = new THREE.Mesh(sBodyGeo, darkMat);
    shotgun.add(sBody);

    // Twin Barrels (Left & Right)
    const sBarrelGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.45, 12);
    const sBarrelL = new THREE.Mesh(sBarrelGeo, metalMat);
    sBarrelL.rotation.x = Math.PI / 2;
    sBarrelL.position.set(-0.06, 0.04, 0.38);
    
    const sBarrelR = new THREE.Mesh(sBarrelGeo, metalMat);
    sBarrelR.rotation.x = Math.PI / 2;
    sBarrelR.position.set(0.06, 0.04, 0.38);
    shotgun.add(sBarrelL);
    shotgun.add(sBarrelR);

    // Under-barrel Heavy Pump Action Handle
    const sPumpGeo = new THREE.BoxGeometry(0.2, 0.14, 0.35);
    const sPumpMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8 });
    const sPump = new THREE.Mesh(sPumpGeo, sPumpMat);
    sPump.position.set(0, -0.1, 0.25);
    shotgun.add(sPump);

    // Amber Glowing Heat Vents on Sides
    const sVentGeo = new THREE.BoxGeometry(0.24, 0.06, 0.4);
    const sVent = new THREE.Mesh(sVentGeo, amberGlow);
    sVent.position.set(0, 0, 0.05);
    shotgun.add(sVent);

    // Muzzle Point Center between Twin Barrels
    const sTipGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12);
    const sTip = new THREE.Mesh(sTipGeo, amberGlow);
    sTip.rotation.x = Math.PI / 2;
    sTip.position.set(0, 0.04, 0.58);
    shotgun.add(sTip);
    const shotgunMuzzle = sTip;

    pivot.add(shotgun);

    // ==========================================
    // 3. PLASMA RAILGUN (Index 2)
    // ==========================================
    const railgun = new THREE.Group();

    // Long Sci-Fi Rifle Chassis
    const rBodyGeo = new THREE.BoxGeometry(0.16, 0.24, 0.95);
    const rBody = new THREE.Mesh(rBodyGeo, darkMat);
    railgun.add(rBody);

    // Parallel Magnetic Acceleration Rails (Top & Bottom prongs extending forward)
    const rRailGeo = new THREE.BoxGeometry(0.04, 0.04, 0.65);
    const rRailTop = new THREE.Mesh(rRailGeo, metalMat);
    rRailTop.position.set(0, 0.08, 0.65);

    const rRailBot = new THREE.Mesh(rRailGeo, metalMat);
    rRailBot.position.set(0, -0.08, 0.65);

    railgun.add(rRailTop);
    railgun.add(rRailBot);

    // Crimson Glowing Capacitor Core Array
    const rCoreGeo = new THREE.BoxGeometry(0.18, 0.12, 0.45);
    const rCore = new THREE.Mesh(rCoreGeo, crimsonGlow);
    rCore.position.set(0, 0, 0.05);
    railgun.add(rCore);

    // Long Beam Emitter Muzzle Tip
    const rTipGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12);
    const rTip = new THREE.Mesh(rTipGeo, crimsonGlow);
    rTip.rotation.x = Math.PI / 2;
    rTip.position.set(0, 0, 0.95);
    railgun.add(rTip);
    const railgunMuzzle = rTip;

    pivot.add(railgun);

    // Default visibility: Handgun visible, others hidden
    handgun.visible = true;
    shotgun.visible = false;
    railgun.visible = false;

    this.weaponsList = [handgun, shotgun, railgun];
    this.muzzlePoints = [handgunMuzzle, shotgunMuzzle, railgunMuzzle];
    this.muzzlePoint = handgunMuzzle;
    this.currentWeaponIndex = 0;

    return pivot;
  }

  createMarineMesh() {
    const group = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdfa585, roughness: 0.7, metalness: 0.1 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.9 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x1f3448, roughness: 0.3, metalness: 0.7 });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x14202e, roughness: 0.8 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.6 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });

    // 1. Legs & Combat Boots (Articulated at hip joint y=0.85)
    const legGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.85, 8);
    legGeo.translate(0, -0.42, 0);
    const bootGeo = new THREE.BoxGeometry(0.24, 0.3, 0.4);

    // Left Leg Group
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.3, 0.85, 0);

    const leftLeg = new THREE.Mesh(legGeo, clothMat);
    leftLeg.castShadow = true;
    leftLegGroup.add(leftLeg);

    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(0, -0.7, 0.05);
    leftLegGroup.add(leftBoot);

    group.add(leftLegGroup);
    this.leftLeg = leftLegGroup;

    // Right Leg Group
    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.3, 0.85, 0);

    const rightLeg = new THREE.Mesh(legGeo, clothMat);
    rightLeg.castShadow = true;
    rightLegGroup.add(rightLeg);

    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0, -0.7, 0.05);
    rightLegGroup.add(rightBoot);

    group.add(rightLegGroup);
    this.rightLeg = rightLegGroup;

    // 2. Torso & Tactical Chest Armor
    const torsoGeo = new THREE.BoxGeometry(0.9, 1.0, 0.6);
    const torso = new THREE.Mesh(torsoGeo, clothMat);
    torso.position.y = 1.3;
    torso.castShadow = true;
    group.add(torso);

    // Reinforced Armor Plate
    const vestGeo = new THREE.BoxGeometry(0.95, 0.75, 0.65);
    const vest = new THREE.Mesh(vestGeo, armorMat);
    vest.position.set(0, 1.35, 0.02);
    vest.castShadow = true;
    group.add(vest);

    // Tactical Belt & Pouches
    const beltGeo = new THREE.BoxGeometry(1.0, 0.15, 0.7);
    const belt = new THREE.Mesh(beltGeo, bootMat);
    belt.position.set(0, 0.88, 0);
    group.add(belt);

    const pouchGeo = new THREE.BoxGeometry(0.2, 0.2, 0.25);
    const pouchL = new THREE.Mesh(pouchGeo, bootMat);
    pouchL.position.set(-0.45, 0.88, 0.2);
    const pouchR = new THREE.Mesh(pouchGeo, bootMat);
    pouchR.position.set(0.45, 0.88, 0.2);
    group.add(pouchL); group.add(pouchR);

    // Glowing Chest Insignia
    const badgeGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 8);
    const badge = new THREE.Mesh(badgeGeo, glowMat);
    badge.rotation.x = Math.PI / 2;
    badge.position.set(0, 1.5, 0.36);
    group.add(badge);

    // 3. Human Head, Face & Hair
    const headGeo = new THREE.SphereGeometry(0.32, 12, 12);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 2.05, 0);
    head.castShadow = true;
    group.add(head);

    // Human Hair / Buzz Cut
    const hairGeo = new THREE.SphereGeometry(0.33, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 2.07, -0.02);
    group.add(hair);

    // Human Face Details (Nose & Eyes)
    const noseGeo = new THREE.BoxGeometry(0.08, 0.1, 0.1);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 2.02, 0.32);
    group.add(nose);

    const eyeGeo = new THREE.BoxGeometry(0.06, 0.04, 0.04);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.1, 2.08, 0.3);
    eyeR.position.set(0.1, 2.08, 0.3);
    group.add(eyeL); group.add(eyeR);

    // Tactical Open-Face Combat Helmet
    const helmetGeo = new THREE.SphereGeometry(0.36, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2.2);
    const helmet = new THREE.Mesh(helmetGeo, armorMat);
    helmet.position.set(0, 2.1, -0.02);
    helmet.castShadow = true;
    group.add(helmet);

    // Helmet Headlamp
    const lampGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 8);
    const lamp = new THREE.Mesh(lampGeo, glowMat);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(0.22, 2.22, 0.28);
    group.add(lamp);

    // 4. Arms & Gloved Hands
    const armGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.7, 8);
    const handGeo = new THREE.SphereGeometry(0.12, 8, 8);

    // Shoulders
    const shoulderGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
    const shoulderL = new THREE.Mesh(shoulderGeo, armorMat);
    shoulderL.position.set(-0.55, 1.6, 0);
    const shoulderR = new THREE.Mesh(shoulderGeo, armorMat);
    shoulderR.position.set(0.55, 1.6, 0);
    group.add(shoulderL); group.add(shoulderR);

    // Left Arm holding gun grip
    const leftArm = new THREE.Mesh(armGeo, clothMat);
    leftArm.rotation.z = Math.PI / 6;
    leftArm.rotation.x = Math.PI / 4;
    leftArm.position.set(-0.45, 1.3, 0.3);
    group.add(leftArm);

    const leftHand = new THREE.Mesh(handGeo, gloveMat);
    leftHand.position.set(-0.25, 1.15, 0.55);
    group.add(leftHand);

    // Right Arm extending weapon forward
    const rightArm = new THREE.Mesh(armGeo, clothMat);
    rightArm.rotation.x = Math.PI / 3;
    rightArm.position.set(0.45, 1.3, 0.3);
    group.add(rightArm);

    const rightHand = new THREE.Mesh(handGeo, gloveMat);
    rightHand.position.set(0.35, 1.15, 0.6);
    group.add(rightHand);

    // 5. 3D Weapon Models (Handgun, Shotgun, Railgun)
    this.weaponPivot = this.create3DWeapons();
    group.add(this.weaponPivot);

    // Enable shadow casting AND shadow receiving on all player meshes
    group.traverse(child => {
      if (child.isMesh && !(child.material instanceof THREE.MeshBasicMaterial)) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  switchWeapon(newIndex, soundEngine) {
    if (newIndex === this.currentWeaponIndex || this.isSwitchingWeapon) return;

    this.isSwitchingWeapon = true;
    this.switchAnimTime = 0;
    this.targetWeaponIndex = newIndex;
    this.hasSwappedModelInAnim = false;

    if (soundEngine) {
      soundEngine.playReload();
    }
  }

  triggerRecoil(kickAmount = 0.2) {
    this.recoilOffset = kickAmount;
    this.recoilRotation = kickAmount * 0.9;
  }

  setupFlashlight() {
    this.isFlashlightOn = true;

    // High-Intensity Wide-Angle Tactical Spotlight (28.0 intensity, 90 distance, 60° cone)
    // Positioned forward at z = 0.6 to project cleanly without body self-shadowing artifacts
    this.flashlight = new THREE.SpotLight(0xeeffff, 28.0, 90, Math.PI / 3, 0.35, 1);
    this.flashlight.position.set(0, 1.4, 0.6);
    this.flashlight.target.position.set(0, 1.4, 16);
    this.flashlight.castShadow = false; // Disables body self-shadowing render glitch on deck floor

    // Surrounding Tactical Fill Light (Always illuminates marine's immediate area)
    this.playerFillLight = new THREE.PointLight(0xbbeeff, 3.5, 20);
    this.playerFillLight.position.set(0, 1.4, 0.6);

    this.mesh.add(this.flashlight);
    this.mesh.add(this.flashlight.target);
    this.mesh.add(this.playerFillLight);
  }

  toggleFlashlight() {
    this.isFlashlightOn = !this.isFlashlightOn;
    if (this.flashlight) {
      this.flashlight.visible = this.isFlashlightOn;
    }
    if (this.playerFillLight) {
      this.playerFillLight.visible = this.isFlashlightOn;
    }
    return this.isFlashlightOn;
  }

  startReloadAnimation() {
    this.isReloadingAnim = true;
    this.reloadAnimTime = 0;
  }

  getMuzzleWorldPosition() {
    const pos = new THREE.Vector3();
    this.muzzlePoint.getWorldPosition(pos);
    return pos;
  }

  triggerDash(moveDir) {
    if (this.dashCooldownTimer <= 0 && !this.isDashing) {
      this.isDashing = true;
      this.dashTimer = this.dashDuration;
      this.dashCooldownTimer = this.dashCooldown;
      this.dashDirection.copy(moveDir.lengthSq() > 0 ? moveDir : new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion));
      return true;
    }
    return false;
  }

  takeDamage(amount) {
    if (this.isDashing) return 0; // Invulnerable while dashing

    this.lastDamageTime = Date.now() * 0.001;

    let remaining = amount;
    if (this.shield > 0) {
      if (this.shield >= remaining) {
        this.shield -= remaining;
        remaining = 0;
      } else {
        remaining -= this.shield;
        this.shield = 0;
      }
    }

    if (remaining > 0) {
      this.health = Math.max(0, this.health - remaining);
    }

    return amount;
  }

  update(delta, input, level, camera) {
    const now = Date.now() * 0.001;

    // Cooldown timers
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= delta;
    }

    // Shield auto-recharge
    if (now - this.lastDamageTime > this.shieldRechargeDelay && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + 20 * delta);
    }

    // Dash Execution
    if (this.isDashing) {
      this.dashTimer -= delta;
      const dashSpeed = this.speed * 2.8;
      const step = this.dashDirection.clone().multiplyScalar(dashSpeed * delta);
      const nextPos = this.position.clone().add(step);

      if (!level.checkCollision(nextPos, 0.7)) {
        this.position.copy(nextPos);
      } else {
        // Dash wall slide
        const nextX = this.position.clone().add(new THREE.Vector3(step.x, 0, 0));
        const nextZ = this.position.clone().add(new THREE.Vector3(0, 0, step.z));
        if (!level.checkCollision(nextX, 0.7)) this.position.copy(nextX);
        else if (!level.checkCollision(nextZ, 0.7)) this.position.copy(nextZ);
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    } else {
      // Normal Movement with Viewport / Screen-Relative Controls
      const moveDir = input.getMovementVector(camera);
      const isMoving = moveDir.lengthSq() > 0;

      if (isMoving) {
        const step = moveDir.clone().multiplyScalar(this.speed * delta);
        const fullNext = this.position.clone().add(step);

        if (!level.checkCollision(fullNext, 0.7)) {
          this.position.copy(fullNext);
        } else {
          // Slide along X axis if Z is blocked
          const nextX = this.position.clone().add(new THREE.Vector3(step.x, 0, 0));
          if (!level.checkCollision(nextX, 0.7)) {
            this.position.copy(nextX);
          } else {
            // Slide along Z axis if X is blocked
            const nextZ = this.position.clone().add(new THREE.Vector3(0, 0, step.z));
            if (!level.checkCollision(nextZ, 0.7)) {
              this.position.copy(nextZ);
            }
          }
        }

        // Leg Walking Animation
        this.walkAnimTime += delta * 14.0;
        const stride = Math.sin(this.walkAnimTime) * 0.55;
        if (this.leftLeg) this.leftLeg.rotation.x = stride;
        if (this.rightLeg) this.rightLeg.rotation.x = -stride;
      } else {
        // Idle Standing Pose Reset
        if (this.leftLeg) this.leftLeg.rotation.x *= 0.75;
        if (this.rightLeg) this.rightLeg.rotation.x *= 0.75;
      }
    }

    this.mesh.position.copy(this.position);
    
    // Hip Bounce during walking
    const isMoving = !this.isDashing && input.getMovementVector(camera).lengthSq() > 0;
    if (isMoving) {
      this.mesh.position.y = this.position.y + Math.abs(Math.sin(this.walkAnimTime * 2.0)) * 0.08;
    } else {
      this.mesh.position.y = this.position.y;
    }

    // Rotate Player towards Mouse Aim Point in 3D
    const aimTarget = input.aimPointWorld.clone();
    aimTarget.y = this.mesh.position.y;
    this.mesh.lookAt(aimTarget);

    // Weapon Recoil Recovery
    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - delta * 3.5);
    }
    if (this.recoilRotation > 0) {
      this.recoilRotation = Math.max(0, this.recoilRotation - delta * 9.0);
    }

    // Walking Weapon Bobbing & Sway
    if (isMoving) {
      this.gunSwayX = Math.sin(this.walkAnimTime * 0.7) * 0.04;
      this.gunSwayY = Math.abs(Math.sin(this.walkAnimTime * 1.4)) * 0.03;
    } else {
      this.gunSwayX *= 0.85;
      this.gunSwayY *= 0.85;
    }

    // Reload Gun Animation: dip down, swing sideways, snap back up
    let tiltX = 0;
    let tiltZ = 0;
    if (this.isReloadingAnim) {
      this.reloadAnimTime += delta;
      const t = Math.min(1.0, this.reloadAnimTime / this.reloadAnimDuration);

      if (t < 0.35) {
        const p = t / 0.35;
        tiltX = Math.sin(p * Math.PI) * 1.1;   // dip barrel down
        tiltZ = Math.sin(p * Math.PI) * 0.4;   // slight roll
      } else if (t < 0.85) {
        const p = (t - 0.35) / 0.5;
        tiltX = Math.sin(p * Math.PI) * 0.55;  // partial bounce while cell slots in
        tiltZ = Math.cos(p * Math.PI * 0.5) * 0.5;
      } else {
        const p = (t - 0.85) / 0.15;
        tiltX = (1.0 - p) * 0.25;              // snap back to neutral
        tiltZ = (1.0 - p) * 0.1;
      }

      if (t >= 1.0) {
        this.isReloadingAnim = false;
      }
    }

    // Weapon Change Animation: Dip down (holster), swap mesh, raise up (draw)
    let switchOffset = 0;
    let switchRotation = 0;

    if (this.isSwitchingWeapon) {
      this.switchAnimTime += delta;
      const progress = Math.min(1.0, this.switchAnimTime / this.switchAnimDuration);

      if (progress < 0.45) {
        // Phase 1: Holster / Dip down
        const p = progress / 0.45;
        switchOffset = Math.sin(p * Math.PI / 2) * 0.45;
        switchRotation = Math.sin(p * Math.PI / 2) * 1.1;
      } else {
        // Midpoint: Swap weapon mesh visibility & muzzle point
        if (!this.hasSwappedModelInAnim) {
          this.hasSwappedModelInAnim = true;
          this.weaponsList.forEach((w, idx) => {
            w.visible = (idx === this.targetWeaponIndex);
          });
          this.currentWeaponIndex = this.targetWeaponIndex;
          this.muzzlePoint = this.muzzlePoints[this.targetWeaponIndex];
        }

        // Phase 2: Draw / Raise back up
        const p = (progress - 0.45) / 0.55;
        switchOffset = Math.cos(p * Math.PI / 2) * 0.45;
        switchRotation = Math.cos(p * Math.PI / 2) * 1.1;
      }

      if (progress >= 1.0) {
        this.isSwitchingWeapon = false;
      }
    }

    // Apply combined gun position (base + sway + recoil - switchOffset) & rotation (tilt + recoil + switchRotation)
    if (this.weaponPivot) {
      this.weaponPivot.position.x = 0.35 + this.gunSwayX;
      this.weaponPivot.position.y = 1.25 + this.gunSwayY - switchOffset;
      this.weaponPivot.position.z = 0.65 - this.recoilOffset;

      this.weaponPivot.rotation.x = tiltX - this.recoilRotation + switchRotation;
      this.weaponPivot.rotation.z = tiltZ;
    }

    // Terminal Pointer 3D Guidance Arrow Logic
    if (level && level.terminalPod && this.terminalPointer) {
      const termPos = level.terminalPod.position.clone();
      termPos.y = 1.4;

      const playerPos = this.position.clone();
      playerPos.y = 1.4;

      const dir = termPos.clone().sub(playerPos);
      const dist = dir.length();
      dir.y = 0;

      if (dist > 2.2 && dir.lengthSq() > 0.001) {
        dir.normalize();
        this.terminalPointer.visible = true;

        // Position arrow floating 2.4 units in front of player towards terminal
        const arrowPos = playerPos.clone().add(dir.clone().multiplyScalar(2.4));
        arrowPos.y = 1.6 + Math.sin(Date.now() * 0.007) * 0.18; // Hovering Bob

        this.terminalPointer.position.copy(arrowPos);
        this.terminalPointer.lookAt(termPos);
      } else {
        this.terminalPointer.visible = false;
      }
    } else if (this.terminalPointer) {
      this.terminalPointer.visible = false;
    }
  }
}
