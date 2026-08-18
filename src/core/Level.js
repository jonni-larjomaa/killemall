import * as THREE from 'three';

export class LevelMap {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // Array of THREE.Box3 bounding boxes for collision
    this.barrels = [];   // Explosive hazard barrels
    this.spawnPoints = []; // Enemy spawn locations

    this.mapSize = 130; // 130x130 multi-room complex
    this.wallHeight = 5;

    this.initTextures();
    this.buildDeck();
    this.buildWallsAndPillars();
    this.spawnBarrels();
  }

  // Generate high-resolution procedural textures on HTML Canvases
  initTextures() {
    // 1. Concrete Floor Texture — cracked, worn, industrial
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const ctx = floorCanvas.getContext('2d');

    // Base concrete mid-grey
    ctx.fillStyle = '#222225';
    ctx.fillRect(0, 0, 512, 512);

    // Aggregate speckles
    for (let i = 0; i < 3500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 2.5 + 0.5;
      const v = Math.floor(Math.random() * 50 + 15);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Concrete tile seams — grid
    ctx.strokeStyle = '#141416';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 128) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }

    // Random crack network
    ctx.strokeStyle = '#0d0d0f';
    ctx.lineWidth = 1.5;
    const cracks = [
      [[60, 90], [85, 130], [110, 120], [140, 155]],
      [[200, 30], [215, 70], [190, 100]],
      [[320, 180], [350, 210], [370, 190], [400, 220]],
      [[50, 300], [90, 330], [80, 370]],
      [[260, 380], [290, 410], [310, 400], [350, 430]]
    ];
    cracks.forEach(pts => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    });

    // Subtle cyan safety line markings
    ctx.strokeStyle = 'rgba(0, 180, 200, 0.2)';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, 480, 480);

    this.floorTexture = new THREE.CanvasTexture(floorCanvas);
    this.floorTexture.wrapS = THREE.RepeatWrapping;
    this.floorTexture.wrapT = THREE.RepeatWrapping;
    this.floorTexture.repeat.set(16, 16);

    // 2. Wall Texture (Metallic panels with warning hazard stripes)
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 256;
    wallCanvas.height = 256;
    const wCtx = wallCanvas.getContext('2d');

    wCtx.fillStyle = '#0b121e';
    wCtx.fillRect(0, 0, 256, 256);

    wCtx.strokeStyle = '#18263a';
    wCtx.lineWidth = 3;
    wCtx.strokeRect(4, 4, 248, 248);

    // Hazard stripes at top
    wCtx.fillStyle = '#ff5500';
    for (let x = -20; x < 280; x += 30) {
      wCtx.beginPath();
      wCtx.moveTo(x, 0);
      wCtx.lineTo(x + 15, 0);
      wCtx.lineTo(x + 5, 20);
      wCtx.lineTo(x - 10, 20);
      wCtx.closePath();
      wCtx.fill();
    }

    this.wallTexture = new THREE.CanvasTexture(wallCanvas);
    this.wallTexture.wrapS = THREE.RepeatWrapping;
    this.wallTexture.wrapT = THREE.RepeatWrapping;

    // 3. Barrel Texture
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 256;
    bCanvas.height = 256;
    const bCtx = bCanvas.getContext('2d');
    
    bCtx.fillStyle = '#00aa33';
    bCtx.fillRect(0, 0, 256, 256);
    bCtx.fillStyle = '#112211';
    bCtx.fillRect(0, 0, 256, 25);
    bCtx.fillRect(0, 231, 256, 25);
    bCtx.fillRect(0, 115, 256, 26);

    bCtx.fillStyle = '#ffcc00';
    bCtx.fillRect(0, 70, 256, 40);

    bCtx.fillStyle = '#000000';
    for (let x = -40; x < 300; x += 30) {
      bCtx.beginPath();
      bCtx.moveTo(x, 70);
      bCtx.lineTo(x + 15, 70);
      bCtx.lineTo(x, 110);
      bCtx.lineTo(x - 15, 110);
      bCtx.closePath();
      bCtx.fill();
    }

    bCtx.fillStyle = '#000000';
    bCtx.font = 'bold 50px sans-serif';
    bCtx.textAlign = 'center';
    bCtx.fillText('☣', 128, 175);
    bCtx.font = '900 18px sans-serif';
    bCtx.fillText('TOXIC HAZARD', 128, 205);

    this.barrelTexture = new THREE.CanvasTexture(bCanvas);
  }

  buildDeck() {
    const floorGeo = new THREE.PlaneGeometry(this.mapSize, this.mapSize);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.floorTexture,
      roughness: 0.92,
      metalness: 0.05,
      color: 0x777777
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);
  }

  buildWallsAndPillars() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: this.wallTexture,
      roughness: 0.5,
      metalness: 0.7
    });

    const half = this.mapSize / 2;
    const thickness = 2;

    // 1. Outer Perimeter Walls (130x130 Bounds)
    const wallConfigs = [
      { size: [this.mapSize, this.wallHeight, thickness], pos: [0, this.wallHeight / 2, -half] }, // North
      { size: [this.mapSize, this.wallHeight, thickness], pos: [0, this.wallHeight / 2, half] },  // South
      { size: [thickness, this.wallHeight, this.mapSize], pos: [-half, this.wallHeight / 2, 0] }, // West
      { size: [thickness, this.wallHeight, this.mapSize], pos: [half, this.wallHeight / 2, 0] }   // East
    ];

    wallConfigs.forEach(cfg => {
      const geo = new THREE.BoxGeometry(...cfg.size);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(...cfg.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const bbox = new THREE.Box3().setFromObject(mesh);
      this.colliders.push(bbox);
    });

    // 2. Room Dividing Walls with Wide Doorway Arch Openings
    // Central Hub is [-24..24, -24..24]. Doorway arches are 14 units wide!
    const roomDividers = [
      // North Room Divider (Z = -24, Archway X: -7 to 7)
      { size: [51, this.wallHeight, thickness], pos: [-32, this.wallHeight / 2, -24] },
      { size: [51, this.wallHeight, thickness], pos: [32, this.wallHeight / 2, -24] },

      // South Room Divider (Z = 24, Archway X: -7 to 7)
      { size: [51, this.wallHeight, thickness], pos: [-32, this.wallHeight / 2, 24] },
      { size: [51, this.wallHeight, thickness], pos: [32, this.wallHeight / 2, 24] },

      // West Room Divider (X = -24, Archway Z: -7 to 7)
      { size: [thickness, this.wallHeight, 51], pos: [-24, this.wallHeight / 2, -32] },
      { size: [thickness, this.wallHeight, 51], pos: [-24, this.wallHeight / 2, 32] },

      // East Room Divider (X = 24, Archway Z: -7 to 7)
      { size: [thickness, this.wallHeight, 51], pos: [24, this.wallHeight / 2, -32] },
      { size: [thickness, this.wallHeight, 51], pos: [24, this.wallHeight / 2, 32] }
    ];

    roomDividers.forEach(div => {
      const geo = new THREE.BoxGeometry(...div.size);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(...div.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const bbox = new THREE.Box3().setFromObject(mesh);
      this.colliders.push(bbox);
    });

    // 3. Multi-Sector Internal Pillars & Consoles
    const internalStructures = [
      // Central Hub Pillars
      { size: [3, this.wallHeight, 3], pos: [-14, this.wallHeight / 2, -14] },
      { size: [3, this.wallHeight, 3], pos: [14, this.wallHeight / 2, -14] },
      { size: [3, this.wallHeight, 3], pos: [-14, this.wallHeight / 2, 14] },
      { size: [3, this.wallHeight, 3], pos: [14, this.wallHeight / 2, 14] },

      // North Armory Racks & Obstacles (Dark Sector)
      { size: [12, this.wallHeight, 2], pos: [-20, this.wallHeight / 2, -45] },
      { size: [12, this.wallHeight, 2], pos: [20, this.wallHeight / 2, -45] },

      // South Cryo Room Pod Foundations
      { size: [4, this.wallHeight, 4], pos: [-25, this.wallHeight / 2, 45] },
      { size: [4, this.wallHeight, 4], pos: [25, this.wallHeight / 2, 45] },

      // East Power Generator Transformers
      { size: [6, this.wallHeight, 6], pos: [45, this.wallHeight / 2, -20] },
      { size: [6, this.wallHeight, 6], pos: [45, this.wallHeight / 2, 20] },

      // West Containment Vault Barriers (Dark Sector)
      { size: [2, this.wallHeight, 14], pos: [-45, this.wallHeight / 2, -20] },
      { size: [2, this.wallHeight, 14], pos: [-45, this.wallHeight / 2, 20] }
    ];

    internalStructures.forEach(struct => {
      const geo = new THREE.BoxGeometry(...struct.size);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(...struct.pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const bbox = new THREE.Box3().setFromObject(mesh);
      this.colliders.push(bbox);
    });

    // 4. Sector Specific Regional Ceiling Light Fixtures (5 Consolidated Sector Lights for Maximum 60-120+ FPS)
    // Central Hub Cyan Reactor Lamp
    const hubLight = new THREE.PointLight(0x00f3ff, 1.8, 40);
    hubLight.position.set(0, 4.5, 0);
    this.scene.add(hubLight);

    // North Armory Deck Lamp
    const armoryLight = new THREE.PointLight(0x99ddff, 1.5, 40);
    armoryLight.position.set(0, 4.2, -45);
    this.scene.add(armoryLight);

    // South Cryo Room Ice-Blue Lamp
    const cryoLight = new THREE.PointLight(0x00c8ff, 1.5, 40);
    cryoLight.position.set(0, 4.2, 45);
    this.scene.add(cryoLight);

    // East Power Generator Amber Lamp
    const genLight = new THREE.PointLight(0xffaa00, 1.6, 40);
    genLight.position.set(45, 4.2, 0);
    this.scene.add(genLight);

    // West Containment Vault Crimson Lamp
    const vaultLight = new THREE.PointLight(0xff3366, 1.5, 40);
    vaultLight.position.set(-45, 4.2, 0);
    this.scene.add(vaultLight);

    // 5. Define Multi-Sector Enemy Spawn Locations
    this.floorSpawns = [
      new THREE.Vector3(0, 0, -50),    // North Armory
      new THREE.Vector3(-45, 0, -45),  // North West Sector
      new THREE.Vector3(45, 0, -45),   // North East Sector
      new THREE.Vector3(0, 0, 50),     // South Cryo Chamber
      new THREE.Vector3(-45, 0, 45),   // South West Sector
      new THREE.Vector3(45, 0, 45),    // South East Sector
      new THREE.Vector3(50, 0, 0),     // East Generator Hall
      new THREE.Vector3(-50, 0, 0),    // West Vault Sector
      new THREE.Vector3(-18, 0, -18),  // Central Hub NW
      new THREE.Vector3(18, 0, 18)     // Central Hub SE
    ];

    this.wallSpawns = [
      new THREE.Vector3(0, 3.2, -63),   // Far North Wall
      new THREE.Vector3(0, 3.2, 63),    // Far South Wall
      new THREE.Vector3(-63, 3.2, 0),   // Far West Wall
      new THREE.Vector3(63, 3.2, 0),    // Far East Wall
      new THREE.Vector3(-45, 3.2, -24), // Mid North Wall
      new THREE.Vector3(45, 3.2, 24)    // Mid South Wall
    ];

    this.ceilingSpawns = [
      new THREE.Vector3(0, 11.5, 0),
      new THREE.Vector3(-35, 11.5, -35),
      new THREE.Vector3(35, 11.5, -35),
      new THREE.Vector3(-35, 11.5, 35),
      new THREE.Vector3(35, 11.5, 35)
    ];

    this.spawnPoints = [...this.floorSpawns, ...this.wallSpawns, ...this.ceilingSpawns];

    // Shared Materials
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x1f2933, roughness: 0.4, metalness: 0.8 });
    const grateMat = new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.7, metalness: 0.6, wireframe: true });
    const glowRedMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

    // Render 3D Floor Grates
    this.floorSpawns.forEach(pt => {
      const group = new THREE.Group();
      group.position.copy(pt);

      const rimGeo = new THREE.CylinderGeometry(2.5, 2.7, 0.2, 8);
      const rim = new THREE.Mesh(rimGeo, metalMat);
      rim.position.y = 0.1;
      group.add(rim);

      const grateGeo = new THREE.CylinderGeometry(2.1, 2.1, 0.05, 12);
      const grate = new THREE.Mesh(grateGeo, grateMat);
      grate.position.y = 0.12;
      group.add(grate);

      const ringGeo = new THREE.TorusGeometry(2.3, 0.06, 8, 24);
      const ring = new THREE.Mesh(ringGeo, glowRedMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.22;
      group.add(ring);

      this.scene.add(group);
    });

    // Render 3D Wall Vent Chambers
    this.wallSpawns.forEach(pt => {
      const group = new THREE.Group();
      group.position.copy(pt);

      const ventBoxGeo = new THREE.BoxGeometry(3.6, 2.2, 0.6);
      const ventBox = new THREE.Mesh(ventBoxGeo, metalMat);
      group.add(ventBox);

      const louverGeo = new THREE.BoxGeometry(3.2, 1.8, 0.1);
      const louver = new THREE.Mesh(louverGeo, grateMat);
      louver.position.z = 0.31;
      group.add(louver);

      const beaconGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const beacon = new THREE.Mesh(beaconGeo, glowRedMat);
      beacon.position.set(0, 1.2, 0.35);
      group.add(beacon);

      if (Math.abs(pt.x) > Math.abs(pt.z)) {
        group.rotation.y = pt.x > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        group.rotation.y = pt.z > 0 ? Math.PI : 0;
      }

      this.scene.add(group);
    });

    // Render 3D Ceiling Drop Hatches
    this.ceilingSpawns.forEach(pt => {
      const group = new THREE.Group();
      group.position.copy(pt);

      const hatchGeo = new THREE.CylinderGeometry(2.2, 2.4, 0.4, 12);
      const hatch = new THREE.Mesh(hatchGeo, metalMat);
      group.add(hatch);

      const cRingGeo = new THREE.TorusGeometry(2.0, 0.08, 8, 24);
      const cRing = new THREE.Mesh(cRingGeo, glowRedMat);
      cRing.rotation.x = Math.PI / 2;
      cRing.position.y = -0.22;
      group.add(cRing);

      this.scene.add(group);
    });
  }

  spawnBarrels() {
    const barrelGeo = new THREE.CylinderGeometry(1, 1, 2.5, 16);
    const barrelMat = new THREE.MeshStandardMaterial({
      map: this.barrelTexture,
      emissive: 0x00aa33,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.6
    });

    // Barrels scattered across facility sectors
    const positions = [
      new THREE.Vector3(-18, 1.25, -6),
      new THREE.Vector3(18, 1.25, 6),
      new THREE.Vector3(-35, 1.25, -45),
      new THREE.Vector3(35, 1.25, -45),
      new THREE.Vector3(-35, 1.25, 45),
      new THREE.Vector3(35, 1.25, 45),
      new THREE.Vector3(45, 1.25, -35),
      new THREE.Vector3(-45, 1.25, 35)
    ];

    positions.forEach(pos => {
      const mesh = new THREE.Mesh(barrelGeo, barrelMat);
      mesh.position.copy(pos);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const barrelObj = {
        mesh: mesh,
        position: pos.clone(),
        radius: 1.2,
        health: 30,
        destroyed: false
      };
      this.barrels.push(barrelObj);
    });
  }

  checkCollision(position, radius = 0.8) {
    const tempBox = new THREE.Box3();
    const tempSphere = new THREE.Sphere(position, radius);

    // Wall collision
    for (let i = 0; i < this.colliders.length; i++) {
      if (this.colliders[i].intersectsSphere(tempSphere)) {
        return true;
      }
    }

    // Barrel collision
    for (let i = 0; i < this.barrels.length; i++) {
      const b = this.barrels[i];
      if (!b.destroyed && b.position.distanceTo(position) < (radius + b.radius)) {
        return true;
      }
    }

    return false;
  }

  spawnTerminalPod(position) {
    if (this.terminalPod) {
      this.scene.remove(this.terminalPod.group);
      this.terminalPod = null;
    }

    const group = new THREE.Group();
    const spawnPos = position ? position.clone() : new THREE.Vector3(0, 0, 0);
    group.position.copy(spawnPos);

    // Base Pedestal
    const baseGeo = new THREE.CylinderGeometry(1.2, 1.5, 0.4, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1f3448, roughness: 0.3, metalness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    group.add(base);

    // Glowing Core Pillar
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x00f3ff, emissive: 0x0088cc, emissiveIntensity: 0.8 });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 1.0;
    group.add(pillar);

    // Floating Rotating Hologram Cube
    const cubeGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const cubeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true });
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.y = 2.0;
    group.add(cube);

    this.scene.add(group);

    this.terminalPod = {
      group,
      cube,
      position: group.position,
      update: (delta) => {
        if (cube) {
          cube.rotation.y += delta * 2.0;
          cube.rotation.x += delta * 1.0;
          cube.position.y = 2.0 + Math.sin(Date.now() * 0.003) * 0.15;
        }
      }
    };

    return this.terminalPod;
  }

  removeTerminalPod() {
    if (this.terminalPod) {
      this.scene.remove(this.terminalPod.group);
      this.terminalPod = null;
    }
  }
}
