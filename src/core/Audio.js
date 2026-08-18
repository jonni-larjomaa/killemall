import * as Tone from 'tone';

export class SoundEngine {
  constructor() {
    this.muted = false;
    this.initialized = false;

    // Real Sample Players
    this.samplePlayers = null;
    this.musicPlayer = null;

    // SFX Synths & FX
    this.pulseSynth = null;
    this.pulseSub = null;
    this.pulseNoise = null;
    this.shotgunNoise = null;
    this.shotgunThud = null;
    this.railgunSynth = null;
    this.explosionNoise = null;
    this.explosionThud = null;
    this.growlSynth = null;
    this.hitSynth = null;
    this.dodgeSynth = null;
    this.reloadSynth = null;
    this.reloadNoise = null;

    // Music System
    this.musicGain = null;
    this.musicStarted = false;
    this.musicLoops = [];
  }

  async init() {
    if (this.initialized) {
      if (Tone.getContext().state !== 'running') {
        await Tone.start();
      }
      return;
    }

    try {
      await Tone.start();
      Tone.getDestination().volume.value = -4; // safe master headroom

      // Master Music Volume Bus
      this.musicGain = new Tone.Gain(0.45).toDestination();

      // Master SFX Bus with Compressor for Maximum Impact
      this.sfxCompressor = new Tone.Compressor({
        ratio: 5,
        threshold: -10,
        release: 0.08,
        attack: 0.002
      }).toDestination();

      this.sfxGain = new Tone.Gain(1.25).connect(this.sfxCompressor);

      // --- REAL AUDIO SAMPLE PLAYERS ---
      this.samplePlayers = new Tone.Players({
        pulse: '/audio/sfx/pulse_rifle.wav',
        shotgun: '/audio/sfx/shotgun.mp3',
        railgun: '/audio/sfx/railgun.wav',
        reload: '/audio/sfx/reload.mp3',
        explosion: '/audio/sfx/explosion.wav',
        emptyClick: '/audio/sfx/empty_click.wav',
        flashlight: '/audio/sfx/flashlight_click.wav'
      }).connect(this.sfxGain);

      // --- REAL TECHNO MUSIC PLAYER ---
      this.musicPlayer = new Tone.Player({
        url: '/audio/music/techno_track.wav',
        loop: true,
        volume: -4
      }).connect(this.musicGain);

      // --- SFX INSTRUMENTS ---
      // 1. Pulse Rifle - Fat sawtooth lead, membrane sub-bass punch, white noise discharge
      this.pulseSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsawtooth' },
        envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.02 }
      }).connect(this.sfxGain);

      this.pulseSub = new Tone.PolySynth(Tone.MembraneSynth, {
        pitchDecay: 0.04,
        octaves: 5,
        envelope: { attack: 0.001, decay: 0.12, sustain: 0 }
      }).connect(this.sfxGain);

      this.pulseNoise = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0 }
      }).connect(this.sfxGain);

      // 2. Shotgun - Heavy pink noise blast + deep membrane sub thud
      this.shotgunNoise = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.32, sustain: 0 }
      }).connect(this.sfxGain);

      this.shotgunThud = new Tone.PolySynth(Tone.MembraneSynth, {
        pitchDecay: 0.08,
        octaves: 7,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.35, sustain: 0 }
      }).connect(this.sfxGain);

      // 3. Railgun - FM beam synth + sub detonation
      this.railgunSynth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3.5,
        modulationIndex: 20,
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.005, decay: 0.4, sustain: 0.1, release: 0.1 },
        modulation: { type: 'square' },
        modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0 }
      }).connect(this.sfxGain);

      this.railgunSub = new Tone.PolySynth(Tone.MembraneSynth, {
        pitchDecay: 0.1,
        octaves: 8,
        envelope: { attack: 0.001, decay: 0.45, sustain: 0 }
      }).connect(this.sfxGain);

      // 4. Explosion - Massive Multi-layered Blast
      this.explosionNoise = new Tone.NoiseSynth({
        noise: { type: 'brown' },
        envelope: { attack: 0.005, decay: 1.0, sustain: 0 }
      }).connect(this.sfxGain);

      this.explosionCrack = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0 }
      }).connect(this.sfxGain);

      this.explosionThud = new Tone.PolySynth(Tone.MembraneSynth, {
        pitchDecay: 0.12,
        octaves: 8,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.8, sustain: 0 }
      }).connect(this.sfxGain);

      // 5. Humanoid Growl
      this.growlSynth = new Tone.FMSynth({
        harmonicity: 1.5,
        modulationIndex: 10,
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.05, decay: 0.25, sustain: 0 },
        modulation: { type: 'square' },
        modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0 }
      }).connect(this.sfxGain);

      // 6. Hit Impact
      this.hitSynth = new Tone.MembraneSynth({
        pitchDecay: 0.02,
        octaves: 2,
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.08, sustain: 0 }
      }).connect(this.sfxGain);

      // 7. Dodge / Dash
      this.dodgeSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.15, sustain: 0 }
      }).connect(this.sfxGain);

      // 8. Reload
      this.reloadSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
      }).connect(this.sfxGain);

      this.reloadNoise = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
      }).connect(this.sfxGain);

      // --- TECHNO MUSIC ENGINE ---
      this.initTechnoTrack();

      this.initialized = true;
    } catch (e) {
      console.warn("Tone.js initialization warning:", e);
    }
  }

  initTechnoTrack() {
    Tone.getTransport().bpm.value = 125; // Deeper, heavier industrial techno tempo

    // 1. Kick Drum - Heavy deep sub kick
    this.technoKick = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.28, sustain: 0 }
    }).connect(this.musicGain);

    // 2. Off-beat Open Hat
    this.technoOpenHat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.005, decay: 0.16, sustain: 0 }
    }).connect(this.musicGain);

    // 3. 16th Note Closed Hat
    this.technoClosedHat = new Tone.MetalSynth({
      frequency: 200,
      envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
      harmonicity: 4.5,
      modulationIndex: 24,
      resonance: 3500,
      octaves: 1.2
    }).connect(this.musicGain);

    // 4. Snare / Clap on 2 & 4
    this.technoSnare = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0 }
    }).connect(this.musicGain);

    // 5. Deep Rolling Sub-Bass Synth
    this.technoBass = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 5, type: 'lowpass', frequency: 220 },
      filterEnvelope: { attack: 0.002, decay: 0.15, sustain: 0.1, baseFrequency: 35, octaves: 4.2 }
    }).connect(this.musicGain);

    // 6. Sci-Fi Synth Lead Stabs
    this.technoLead = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.18, sustain: 0.02, release: 0.05 }
    }).connect(this.musicGain);

    // SEQUENCES & LOOPS
    // Deep Sub Kick (Quarter notes)
    const kickLoop = new Tone.Loop((time) => {
      this.technoKick.triggerAttackRelease("G0", "8n", time);
    }, "4n");

    // Open Hat (Off-beats: 8n offset)
    const openHatLoop = new Tone.Loop((time) => {
      this.technoOpenHat.triggerAttackRelease("16n", time);
    }, "4n");

    // Closed Hat (16th note driving engine)
    const closedHatSeq = new Tone.Sequence((time, note) => {
      if (note) this.technoClosedHat.triggerAttackRelease("32n", time, 0.35);
    }, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], "16n");

    // Snare (Beats 2 & 4)
    const snareSeq = new Tone.Sequence((time, hit) => {
      if (hit) this.technoSnare.triggerAttackRelease("8n", time, 0.65);
    }, [null, 1, null, 1], "4n");

    // Deep Rolling 16th Sub-Bassline (C minor sub-bass register)
    const bassNotes = [
      "C0", "C0", "C1", "C0", "Eb0", "C0", "F0", "G0",
      "C0", "C0", "C1", "Eb0", "C0", "G0", "Ab0", "Eb0"
    ];
    const bassSeq = new Tone.Sequence((time, note) => {
      this.technoBass.triggerAttackRelease(note, "16n", time, 0.9);
    }, bassNotes, "16n");

    // Dark Sci-Fi Lead Stabs (2-bar loop)
    const leadNotes = [
      null, null, ["C4", "Eb4"], null, null, null, null, null,
      null, null, ["C4", "G4"], null, null, ["Ab4", "C5"], null, null
    ];
    const leadSeq = new Tone.Sequence((time, chord) => {
      if (chord) this.technoLead.triggerAttackRelease(chord, "16n", time, 0.5);
    }, leadNotes, "8n");

    this.musicLoops = [kickLoop, openHatLoop, closedHatSeq, snareSeq, bassSeq, leadSeq];

    // Start all patterns relative to transport timeline
    openHatLoop.start("0:0:2");
    kickLoop.start(0);
    closedHatSeq.start(0);
    snareSeq.start(0);
    bassSeq.start(0);
    leadSeq.start(0);
  }

  // --- Real Techno Track Controls ---
  async startTechnoTrack() {
    if (!this.initialized) {
      await this.init();
    }
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
    if (this.musicPlayer && this.musicPlayer.state !== 'started') {
      this.musicPlayer.start();
    }
    this.musicStarted = true;
  }

  pauseTechnoTrack() {
    if (this.musicPlayer && this.musicPlayer.state === 'started') {
      this.musicPlayer.pause();
    }
  }

  async resumeTechnoTrack() {
    if (!this.initialized) {
      await this.init();
    }
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
    if (this.musicPlayer) {
      if (this.musicPlayer.state === 'paused' || this.musicPlayer.state === 'stopped') {
        this.musicPlayer.start();
      }
    }
    this.musicStarted = true;
  }

  stopTechnoTrack() {
    if (this.musicPlayer && (this.musicPlayer.state === 'started' || this.musicPlayer.state === 'paused')) {
      this.musicPlayer.stop();
    }
    this.musicStarted = false;
  }

  toggleMute() {
    this.muted = !this.muted;
    Tone.getDestination().mute = this.muted;
    return this.muted;
  }

  // --- Real Audio SFX Triggers ---
  playFlashlightClick() {
    if (!this.initialized || this.muted) return;
    try {
      if (this.samplePlayers && this.samplePlayers.has('flashlight')) {
        this.samplePlayers.player('flashlight').start();
      } else {
        const now = Tone.now();
        if (this.reloadSynth) this.reloadSynth.triggerAttackRelease("E6", "32n", now);
      }
    } catch (e) {
      console.warn("playFlashlightClick audio error:", e);
    }
  }

  playEmptyClick() {
    if (!this.initialized || this.muted) return;
    try {
      if (this.samplePlayers && this.samplePlayers.has('emptyClick')) {
        this.samplePlayers.player('emptyClick').start();
      } else {
        const now = Tone.now();
        if (this.reloadSynth) this.reloadSynth.triggerAttackRelease("C6", "32n", now);
      }
    } catch (e) {
      console.warn("playEmptyClick audio error:", e);
    }
  }

  playPulseRifle() {
    if (!this.initialized || this.muted) return;
    try {
      if (this.samplePlayers && this.samplePlayers.has('pulse')) {
        this.samplePlayers.player('pulse').start();
      } else {
        const now = Tone.now();
        this.pulseSynth.triggerAttackRelease("E4", "16n", now, 0.9);
        if (this.pulseSub) this.pulseSub.triggerAttackRelease("E1", "16n", now, 1.0);
      }
    } catch (e) {
      console.warn("playPulseRifle audio error:", e);
    }
  }

  playShotgun() {
    if (!this.initialized || this.muted) return;
    try {
      if (this.samplePlayers && this.samplePlayers.has('shotgun')) {
        this.samplePlayers.player('shotgun').start();
      } else {
        const now = Tone.now();
        this.shotgunNoise.triggerAttackRelease("8n", now, 1.0);
        this.shotgunThud.triggerAttackRelease("A0", "8n", now, 1.0);
      }
    } catch (e) {
      console.warn("playShotgun audio error:", e);
    }
  }

  playRailgun() {
    if (!this.initialized || this.muted) return;
    try {
      if (this.samplePlayers && this.samplePlayers.has('railgun')) {
        this.samplePlayers.player('railgun').start();
      } else {
        const now = Tone.now();
        this.railgunSynth.triggerAttackRelease("B4", "8n", now, 1.0);
      }
    } catch (e) {
      console.warn("playRailgun audio error:", e);
    }
  }

  playExplosion() {
    if (!this.initialized || this.muted) return;
    try {
      if (this.samplePlayers && this.samplePlayers.has('explosion')) {
        this.samplePlayers.player('explosion').start();
      } else {
        const now = Tone.now();
        if (this.explosionNoise) this.explosionNoise.triggerAttackRelease("2n", now, 1.0);
        if (this.explosionThud) this.explosionThud.triggerAttackRelease("G0", "2n", now, 1.0);
      }
    } catch (e) {
      console.warn("playExplosion audio error:", e);
    }
  }

  playHumanoidGrowl() {
    if (!this.initialized || this.muted) return;
    try {
      const now = Tone.now();
      this.growlSynth.triggerAttackRelease("F2", "8n", now);
    } catch (e) {
      console.warn("playHumanoidGrowl audio error:", e);
    }
  }

  playHit() {
    if (!this.initialized || this.muted) return;
    try {
      const now = Tone.now();
      this.hitSynth.triggerAttackRelease("C2", "16n", now);
    } catch (e) {
      console.warn("playHit audio error:", e);
    }
  }

  playDodge() {
    if (!this.initialized || this.muted) return;
    try {
      const now = Tone.now();
      this.dodgeSynth.frequency.setValueAtTime(400, now);
      this.dodgeSynth.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      this.dodgeSynth.triggerAttackRelease("8n", now);
    } catch (e) {
      console.warn("playDodge audio error:", e);
    }
  }

  playReload() {
    if (!this.initialized || this.muted) return;
    try {
      if (this.samplePlayers && this.samplePlayers.has('reload')) {
        this.samplePlayers.player('reload').start();
      } else {
        const now = Tone.now();
        if (this.reloadSynth) {
          this.reloadSynth.triggerAttackRelease("C6", "32n", now);
        }
      }
    } catch (e) {
      console.warn("playReload audio error:", e);
    }
  }

  startAmbientHum() {
    // Background hum disabled
  }
}


