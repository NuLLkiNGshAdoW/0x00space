import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Crosshair, Gamepad2, Pause, Play, RotateCcw, Sparkles, Volume2, VolumeX, Zap } from "lucide-react";
import Seo from "../components/Seo.jsx";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

const WIDTH = 960;
const HEIGHT = 540;
const BEST_KEY = "space-runner-best";
const SOUND_KEY = "space-runner-sound";
const DIFFICULTIES = {
  explorer: { label: "Исследователь", detail: "Медленный темп", speed: 0.78, spawn: 1.34, score: 1 },
  standard: { label: "Пилот", detail: "Сбалансированный", speed: 1, spawn: 1, score: 1 },
  ace: { label: "Айс", detail: "Больше риска · ×1,5 очков", speed: 1.24, spawn: 0.78, score: 1.5 },
};
const MISSION_DEFS = [
  { id: "stars", label: "Собрать 5 звёзд", target: 5, reward: 150 },
  { id: "rocks", label: "Сбить 3 астероида", target: 3, reward: 200 },
  { id: "sector", label: "Добраться до сектора 3", target: 3, reward: 250 },
];

function createMissions() {
  return MISSION_DEFS.map((mission) => ({ ...mission, progress: 0, completed: false }));
}

function advanceMission(game, id, amount = 1) {
  const mission = game.missions.find((entry) => entry.id === id);
  if (!mission || mission.completed) return null;
  mission.progress = Math.min(mission.target, mission.progress + amount);
  if (mission.progress >= mission.target) {
    mission.completed = true;
    return mission;
  }
  return null;
}

function makeGame() {
  return {
    mode: "ready",
    playerY: HEIGHT / 2,
    score: 0,
    best: Number(localStorage.getItem(BEST_KEY)) || 0,
    lives: 3,
    difficulty: "standard",
    missions: createMissions(),
    elapsed: 0,
    sector: 1,
    spawnIn: 0.7,
    starIn: 1.5,
    medkitIn: 14,
    combo: 0,
    comboTimer: 0,
    obstacles: [],
    lasers: [],
    laserCooldown: 0,
    stars: [],
    medkits: [],
    particles: [],
    floaters: [],
    invincible: 0,
    dash: 0,
    dashCooldown: 0,
    lastTime: 0,
    lastUi: 0,
  };
}

function pixel(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawShip(ctx, x, y, time, flashing, shielded) {
  if (flashing && Math.floor(time * 12) % 2) return;
  const py = Math.round(y);
  if (shielded) {
    ctx.save();
    ctx.strokeStyle = "rgba(111, 236, 230, .9)";
    ctx.fillStyle = "rgba(67, 218, 226, .12)";
    ctx.shadowColor = "#54e5ed";
    ctx.shadowBlur = 25;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, py + 2, 42, 48, Math.sin(time * 6) * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // Little astronaut modeled after the teal pixel helmet in the user's avatar.
  pixel(ctx, x - 22, py - 27, 39, 36, "#0a3435");
  pixel(ctx, x - 19, py - 30, 38, 34, "#29b9a9");
  pixel(ctx, x - 15, py - 34, 30, 7, "#79e6cc");
  pixel(ctx, x - 13, py - 4, 27, 14, "#f1cfaa");
  pixel(ctx, x - 7, py + 1, 5, 7, "#124650");
  pixel(ctx, x + 5, py + 1, 5, 7, "#124650");
  pixel(ctx, x - 17, py + 11, 33, 24, "#383943");
  pixel(ctx, x - 5, py + 10, 11, 27, "#f1cfaa");
  pixel(ctx, x - 2, py + 13, 6, 21, "#36cdb0");
  pixel(ctx, x - 25, py + 14, 11, 15, "#4c4c57");
  pixel(ctx, x + 13, py + 14, 11, 15, "#4c4c57");
  pixel(ctx, x - 28, py + 29, 15, 5, "#48d9bb");
  pixel(ctx, x + 11, py + 29, 15, 5, "#48d9bb");
  pixel(ctx, x - 16, py - 27, 8, 3, "#fa7191");
  // Thruster glow.
  const flame = 4 + Math.sin(time * 23) * 2;
  pixel(ctx, x - 32 - flame, py - 4, 10, 4, "#f3bd59");
  pixel(ctx, x - 37 - flame * 1.5, py - 3, 9, 2, "#ff7d74");
}

function drawScene(ctx, game, time) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#071326");
  gradient.addColorStop(0.58, "#10233d");
  gradient.addColorStop(1, "#17213b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Distant nebula and orbital rings.
  const nebula = ctx.createRadialGradient(660, 260, 5, 660, 260, 390);
  nebula.addColorStop(0, "rgba(91, 72, 153, .29)");
  nebula.addColorStop(1, "rgba(16, 35, 61, 0)");
  ctx.fillStyle = nebula;
  ctx.fillRect(300, 0, 660, HEIGHT);
  ctx.save();
  ctx.translate(740, 280);
  ctx.rotate(-0.22);
  ctx.strokeStyle = "rgba(118, 156, 204, .18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 118 + i * 27, 37 + i * 9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  for (let i = 0; i < 82; i += 1) {
    const x = ((i * 137.5 - time * (18 + (i % 4) * 12)) % (WIDTH + 20) + WIDTH + 20) % (WIDTH + 20);
    const y = (i * 79.7 + (i % 7) * 12) % HEIGHT;
    const size = i % 11 === 0 ? 3 : i % 3 === 0 ? 2 : 1;
    ctx.globalAlpha = 0.35 + (Math.sin(time * 2 + i) + 1) * 0.22;
    pixel(ctx, x, y, size, size, i % 9 === 0 ? "#9df4de" : "#dce8ff");
  }
  ctx.globalAlpha = 1;

  // Soft blue planetary horizon.
  ctx.fillStyle = "rgba(32, 116, 147, .12)";
  ctx.fillRect(0, 500, WIDTH, 40);
  ctx.fillStyle = "rgba(95, 223, 209, .3)";
  ctx.fillRect(0, 500, WIDTH, 2);

  game.stars.forEach((star) => {
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(time * 1.8);
    ctx.shadowColor = "#f8d56c";
    ctx.shadowBlur = 20;
    pixel(ctx, -3, -10, 6, 20, "#fff1a5");
    pixel(ctx, -10, -3, 20, 6, "#ffd765");
    pixel(ctx, -5, -5, 10, 10, "#fff8d9");
    ctx.restore();
  });

  game.medkits.forEach((medkit) => {
    ctx.save();
    ctx.translate(medkit.x, medkit.y);
    ctx.shadowColor = "#ff79c6";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#f66cb7";
    ctx.beginPath();
    ctx.arc(0, 0, 15 + Math.sin(time * 5) * 1.5, 0, Math.PI * 2);
    ctx.fill();
    pixel(ctx, -3, -9, 6, 18, "#fff2fa");
    pixel(ctx, -9, -3, 18, 6, "#fff2fa");
    ctx.restore();
  });

  game.obstacles.forEach((rock) => {
    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.spin);
    ctx.shadowColor = "#ff795d";
    ctx.shadowBlur = 18;
    pixel(ctx, -rock.r * 0.68, -rock.r * 0.42, rock.r * 1.36, rock.r * 0.84, "#8a5360");
    pixel(ctx, -rock.r * 0.42, -rock.r * 0.68, rock.r * 0.84, rock.r * 1.36, "#b56c66");
    pixel(ctx, -rock.r * 0.32, -rock.r * 0.26, rock.r * 0.48, rock.r * 0.29, "#e09a72");
    pixel(ctx, rock.r * 0.14, rock.r * 0.15, rock.r * 0.28, rock.r * 0.2, "#593f56");
    ctx.restore();
  });

  game.lasers.forEach((laser) => {
    ctx.save();
    ctx.globalAlpha = Math.min(1, laser.life / 0.08);
    ctx.shadowColor = "#67efff";
    ctx.shadowBlur = 18;
    pixel(ctx, laser.x - 2, laser.y - 3, 34, 6, "#d3ffff");
    pixel(ctx, laser.x, laser.y - 1, 40, 2, "#4de4ff");
    ctx.restore();
  });

  game.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life / 0.6);
    pixel(ctx, p.x, p.y, 4, 4, p.color);
  });
  ctx.globalAlpha = 1;
  game.floaters.forEach((floater) => {
    ctx.globalAlpha = Math.max(0, floater.life / 0.9);
    ctx.fillStyle = floater.color;
    ctx.font = "700 18px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = floater.color;
    ctx.shadowBlur = 12;
    ctx.fillText(floater.text, floater.x, floater.y);
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  drawShip(ctx, 143, game.playerY, time, game.invincible > 0, game.dash > 0);
}

export default function GamePage() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const keysRef = useRef(new Set());
  const audioRef = useRef(null);
  const soundEnabledRef = useRef(localStorage.getItem(SOUND_KEY) !== "off");
  const [mode, setMode] = useState("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [lives, setLives] = useState(3);
  const [dashCooldown, setDashCooldown] = useState(0);
  const [laserCooldown, setLaserCooldown] = useState(0);
  const [combo, setCombo] = useState(0);
  const [sector, setSector] = useState(1);
  const [difficulty, setDifficulty] = useState(() => {
    const saved = localStorage.getItem("space-runner-difficulty");
    return DIFFICULTIES[saved] ? saved : "standard";
  });
  const [missions, setMissions] = useState(() => createMissions());
  const [soundEnabled, setSoundEnabled] = useState(soundEnabledRef.current);

  if (!gameRef.current) gameRef.current = makeGame();

  const playSfx = useCallback((name) => {
    if (!soundEnabledRef.current) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = audioRef.current || new AudioContextClass();
    audioRef.current = audio;
    if (audio.state === "suspended") audio.resume();
    const patterns = {
      start: [[440, 0.09], [660, 0.12]],
      star: [[740, 0.07], [990, 0.12]],
      combo: [[880, 0.08], [1175, 0.1], [1480, 0.16]],
      hit: [[190, 0.17], [130, 0.2]],
      dash: [[520, 0.06], [820, 0.15]],
      medkit: [[520, 0.08], [700, 0.08], [920, 0.16]],
      sector: [[440, 0.08], [587, 0.08], [784, 0.18]],
      laser: [[980, 0.045], [720, 0.06]],
      mission: [[660, 0.08], [880, 0.08], [1320, 0.2]],
    };
    const notes = patterns[name] || patterns.star;
    let offset = 0;
    notes.forEach(([frequency, duration]) => {
      const oscillator = audio.createOscillator();
      const volume = audio.createGain();
      const startAt = audio.currentTime + offset;
      oscillator.type = name === "hit" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, startAt);
      volume.gain.setValueAtTime(0.0001, startAt);
      volume.gain.exponentialRampToValueAtTime(0.1, startAt + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(volume);
      volume.connect(audio.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.015);
      offset += duration * 0.62;
    });
  }, []);

  const toggleSound = useCallback(() => {
    const enabled = !soundEnabledRef.current;
    soundEnabledRef.current = enabled;
    setSoundEnabled(enabled);
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
    if (enabled) playSfx("start");
  }, [playSfx]);

  useEffect(() => () => {
    audioRef.current?.close();
  }, []);

  const startGame = useCallback(() => {
    const game = gameRef.current;
    Object.assign(game, makeGame(), { mode: "playing", difficulty, best: game.best, lastTime: 0 });
    setMode("playing");
    setScore(0);
    setLives(3);
    setDashCooldown(0);
    setLaserCooldown(0);
    setCombo(0);
    setSector(1);
    setMissions(createMissions());
    playSfx("start");
  }, [difficulty, playSfx]);

  const togglePause = useCallback(() => {
    const game = gameRef.current;
    if (game.mode === "playing") {
      game.mode = "paused";
      setMode("paused");
    } else if (game.mode === "paused") {
      game.mode = "playing";
      game.lastTime = 0;
      setMode("playing");
    }
  }, []);

  const activateDash = useCallback(() => {
    const game = gameRef.current;
    if (game.mode !== "playing" || game.dashCooldown > 0) return;
    game.dash = 0.8;
    game.invincible = Math.max(game.invincible, 0.8);
    game.dashCooldown = 5;
    setDashCooldown(5);
    playSfx("dash");
  }, [playSfx]);

  const fireLaser = useCallback(() => {
    const game = gameRef.current;
    if (game.mode !== "playing" || game.laserCooldown > 0) return;
    game.lasers.push({ x: 166, y: game.playerY, speed: 760, life: 1.8, hit: false });
    game.laserCooldown = 0.34;
    setLaserCooldown(0.34);
    playSfx("laser");
  }, [playSfx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return undefined;
    let frame;
    const game = gameRef.current;
    const trackMission = (id, amount, scoreMultiplier) => {
      const completedMission = advanceMission(game, id, amount);
      setMissions(game.missions.map((mission) => ({ ...mission })));
      if (!completedMission) return;
      const bonus = Math.round(completedMission.reward * scoreMultiplier);
      game.score += bonus;
      game.floaters.push({ x: WIDTH / 2, y: 145, text: `ЦЕЛЬ! +${bonus}`, color: "#b8ffac", life: 1.25 });
      playSfx("mission");
    };
    const tick = (timestamp) => {
      const dt = Math.min((timestamp - (game.lastTime || timestamp)) / 1000, 0.04);
      game.lastTime = timestamp;
      if (game.mode === "playing") {
        game.elapsed += dt;
        const currentSector = Math.floor(game.elapsed / 20) + 1;
        if (currentSector !== game.sector) {
          game.sector = currentSector;
          setSector(currentSector);
          game.floaters.push({ x: WIDTH / 2, y: HEIGHT / 2, text: `СЕКТОР ${String(currentSector).padStart(2, "0")}`, color: "#8bdfff", life: 1.5 });
          playSfx("sector");
          const sectorMission = game.missions.find((mission) => mission.id === "sector");
          trackMission("sector", currentSector - sectorMission.progress, (DIFFICULTIES[game.difficulty] || DIFFICULTIES.standard).score);
        }
        const difficultySettings = DIFFICULTIES[game.difficulty] || DIFFICULTIES.standard;
        const keys = keysRef.current;
        const up = keys.has("ArrowUp") || keys.has("w") || keys.has("W") || keys.has("touch-up");
        const down = keys.has("ArrowDown") || keys.has("s") || keys.has("S") || keys.has("touch-down");
        if (up) game.playerY -= 310 * dt;
        if (down) game.playerY += 310 * dt;
        game.playerY = Math.max(58, Math.min(477, game.playerY));
        game.score += dt * 12 * difficultySettings.score;
        game.spawnIn -= dt;
        game.starIn -= dt;
        game.medkitIn -= dt;
        game.comboTimer = Math.max(0, game.comboTimer - dt);
        if (game.comboTimer === 0 && game.combo !== 0) {
          game.combo = 0;
          setCombo(0);
        }
        game.invincible = Math.max(0, game.invincible - dt);
        game.dash = Math.max(0, game.dash - dt);
        game.dashCooldown = Math.max(0, game.dashCooldown - dt);
        game.laserCooldown = Math.max(0, game.laserCooldown - dt);

        if (game.spawnIn <= 0) {
          const difficulty = Math.min((game.sector - 1) * 0.065, 0.35);
          game.obstacles.push({
            x: WIDTH + 42,
            y: 65 + Math.random() * 405,
            r: 17 + Math.random() * 14,
            speed: (255 + Math.random() * 100 + game.elapsed * 1.15 + (game.sector - 1) * 28) * difficultySettings.speed,
            spin: Math.random() * Math.PI,
            spinSpeed: (Math.random() - 0.5) * 2,
          });
          game.spawnIn = (0.95 - difficulty + Math.random() * 0.55) * difficultySettings.spawn;
        }
        if (game.starIn <= 0) {
          game.stars.push({ x: WIDTH + 20, y: 55 + Math.random() * 410, speed: 270 + game.elapsed * 0.8 });
          game.starIn = 1.1 + Math.random() * 1.2;
        }
        if (game.medkitIn <= 0) {
          game.medkits.push({ x: WIDTH + 24, y: 75 + Math.random() * 385, speed: 235 + game.elapsed * 0.65 });
          game.medkitIn = 15 + Math.random() * 9;
        }
        game.obstacles.forEach((rock) => {
          rock.x -= rock.speed * dt;
          rock.spin += rock.spinSpeed * dt;
          if (!rock.hit && game.invincible <= 0 && Math.abs(rock.x - 143) < rock.r + 20 && Math.abs(rock.y - game.playerY) < rock.r + 24) {
            rock.hit = true;
            game.lives -= 1;
            game.invincible = 1.15;
            playSfx("hit");
            for (let i = 0; i < 12; i += 1) {
              game.particles.push({ x: 143, y: game.playerY, dx: (Math.random() - 0.5) * 180, dy: (Math.random() - 0.5) * 180, life: 0.6, color: i % 2 ? "#fc8b78" : "#f4d06f" });
            }
            setLives(game.lives);
            if (game.lives <= 0) {
              game.mode = "over";
              setMode("over");
            }
          }
        });
        game.lasers.forEach((laser) => {
          laser.x += laser.speed * dt;
          laser.life -= dt;
          if (laser.hit) return;
          const target = game.obstacles.find((rock) => !rock.hit && Math.abs(rock.x - laser.x) < rock.r + 18 && Math.abs(rock.y - laser.y) < rock.r + 8);
          if (target) {
            target.hit = true;
            laser.hit = true;
            const points = Math.round(30 * difficultySettings.score);
            game.score += points;
            game.floaters.push({ x: target.x, y: target.y - target.r, text: `+${points}`, color: "#8eeeff", life: 0.8 });
            for (let i = 0; i < 9; i += 1) {
              game.particles.push({ x: target.x, y: target.y, dx: (Math.random() - 0.5) * 150, dy: (Math.random() - 0.5) * 150, life: 0.45, color: i % 2 ? "#8eeeff" : "#ffb47d" });
            }
            trackMission("rocks", 1, difficultySettings.score);
            playSfx("hit");
          }
        });
        game.stars.forEach((star) => {
          star.x -= star.speed * dt;
          if (!star.hit && Math.abs(star.x - 143) < 28 && Math.abs(star.y - game.playerY) < 32) {
            star.hit = true;
            game.combo = game.comboTimer > 0 ? Math.min(game.combo + 1, 5) : 1;
            game.comboTimer = 3.2;
            const points = Math.round(50 * game.combo * difficultySettings.score);
            game.score += points;
            setCombo(game.combo);
            trackMission("stars", 1, difficultySettings.score);
            playSfx(game.combo > 1 ? "combo" : "star");
            game.particles.push({ x: star.x, y: star.y, dx: 0, dy: -60, life: 0.6, color: "#ffe782" });
            game.floaters.push({ x: star.x, y: star.y - 16, text: `+${points}${game.combo > 1 ? `  x${game.combo}` : ""}`, color: game.combo > 1 ? "#9df4de" : "#ffe782", life: 0.9 });
          }
        });
        game.medkits.forEach((medkit) => {
          medkit.x -= medkit.speed * dt;
          if (!medkit.hit && Math.abs(medkit.x - 143) < 28 && Math.abs(medkit.y - game.playerY) < 32) {
            medkit.hit = true;
            playSfx("medkit");
            if (game.lives < 3) {
              game.lives += 1;
              setLives(game.lives);
              game.floaters.push({ x: medkit.x, y: medkit.y - 14, text: "+1 ЖИЗНЬ", color: "#ff9bd3", life: 0.9 });
            } else {
              game.score += Math.round(50 * difficultySettings.score);
              game.floaters.push({ x: medkit.x, y: medkit.y - 14, text: "+50", color: "#ff9bd3", life: 0.9 });
            }
            for (let i = 0; i < 8; i += 1) {
              game.particles.push({ x: medkit.x, y: medkit.y, dx: (Math.random() - 0.5) * 100, dy: (Math.random() - 0.5) * 100, life: 0.55, color: "#ff9bd3" });
            }
          }
        });
        game.obstacles = game.obstacles.filter((rock) => rock.x > -70 && !rock.hit);
        game.lasers = game.lasers.filter((laser) => laser.x < WIDTH + 45 && laser.life > 0 && !laser.hit);
        game.stars = game.stars.filter((star) => star.x > -30 && !star.hit);
        game.medkits = game.medkits.filter((medkit) => medkit.x > -35 && !medkit.hit);
        game.particles.forEach((p) => {
          p.x += (p.dx || 0) * dt;
          p.y += (p.dy || 0) * dt;
          p.life -= dt;
        });
        game.particles = game.particles.filter((p) => p.life > 0);
        game.floaters.forEach((floater) => {
          floater.y -= 28 * dt;
          floater.life -= dt;
        });
        game.floaters = game.floaters.filter((floater) => floater.life > 0);
        if (timestamp - game.lastUi > 100) {
          const currentScore = Math.floor(game.score);
          setScore(currentScore);
          setDashCooldown(game.dashCooldown);
          setLaserCooldown(game.laserCooldown);
          game.lastUi = timestamp;
        }
      }

      drawScene(ctx, game, timestamp / 1000);
      if (game.mode !== "playing") {
        ctx.fillStyle = "rgba(4, 10, 23, .54)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playSfx]);

  useEffect(() => {
    const onBlur = () => keysRef.current.clear();
    const onKeyDown = (event) => {
      if (["ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
      if (event.repeat) return;
      if (event.key.toLowerCase() === "p" && ["playing", "paused"].includes(gameRef.current.mode)) {
        togglePause();
        return;
      }
      if (event.key === " " && gameRef.current.mode === "playing") {
        activateDash();
        return;
      }
      if (event.key.toLowerCase() === "x" && gameRef.current.mode === "playing") {
        fireLaser();
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        if (gameRef.current.mode === "paused") togglePause();
        else if (["ready", "over"].includes(gameRef.current.mode)) startGame();
        return;
      }
      keysRef.current.add(event.key);
    };
    const onKeyUp = (event) => keysRef.current.delete(event.key);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [activateDash, fireLaser, startGame, togglePause]);

  useEffect(() => {
    if (mode !== "over") return;
    const finalScore = Math.floor(gameRef.current.score);
    const nextBest = Math.max(gameRef.current.best, finalScore);
    gameRef.current.best = nextBest;
    localStorage.setItem(BEST_KEY, String(nextBest));
    setBest(nextBest);
  }, [mode]);

  const holdDirection = (direction) => ({
    onPointerDown: (event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      keysRef.current.add(`touch-${direction}`);
    },
    onPointerUp: () => keysRef.current.delete(`touch-${direction}`),
    onPointerCancel: () => keysRef.current.delete(`touch-${direction}`),
    onLostPointerCapture: () => keysRef.current.delete(`touch-${direction}`),
  });
  const sectorProgress = (gameRef.current.elapsed % 20) / 20;
  const secondsToSector = Math.ceil(20 - (gameRef.current.elapsed % 20));

  return (
    <div className="min-h-screen">
      <Seo title="Космический забег — 0x00 SPACE" description="Пиксельная космическая игра: уклоняйся от астероидов и собирай звёзды." path="/game" />
      <Navbar />
      <main className="game-page container-app py-10 sm:py-14">
        <header className="game-heading mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow">MINI GAME · 001</span>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">Космический <span>забег</span></h1>
            <p className="mt-3 max-w-xl text-sm text-mute sm:text-base">Уклоняйся от астероидов, собирай звёзды подряд для комбо. Розовая аптечка вернёт потерянную жизнь.</p>
          </div>
          <div className="game-record"><Sparkles size={17} /> РЕКОРД <strong>{best}</strong></div>
        </header>

        <div className="game-difficulty">
          <span className="game-difficulty-label">РЕЖИМ ПОЛЁТА</span>
          <div role="group" aria-label="Сложность игры" className="game-difficulty-options">
            {Object.entries(DIFFICULTIES).map(([id, option]) => (
              <button
                key={id}
                type="button"
                aria-pressed={difficulty === id}
                disabled={mode === "playing" || mode === "paused"}
                className={`game-difficulty-option ${difficulty === id ? "is-selected" : ""}`}
                onClick={() => {
                  setDifficulty(id);
                  localStorage.setItem("space-runner-difficulty", id);
                }}
              >
                <strong>{option.label}</strong>
                <small>{option.detail}</small>
              </button>
            ))}
          </div>
        </div>

        <section className="game-shell" aria-label="Космический забег">
          <div className="game-hud">
            <div className="game-hud-label"><span className="game-live-dot" /> SCORE <strong>{score.toString().padStart(5, "0")}</strong></div>
            <div className="game-hud-label game-lives" aria-label={`Осталось жизней: ${lives}`}>{Array.from({ length: 3 }, (_, i) => <span key={i} className={i < lives ? "life-lit" : "life-lost"}>♥</span>)}</div>
            <div className={`game-combo ${combo > 1 ? "is-active" : ""}`} aria-live="polite">{combo > 1 && <><Sparkles size={14} /> КОМБО ×{combo}</>}</div>
            <div className="game-hud-actions">
              <div className="game-hud-label game-best-mobile">BEST <strong>{best}</strong></div>
              <button type="button" className="game-pause-button" onClick={toggleSound} aria-label={soundEnabled ? "Отключить звук" : "Включить звук"} title={soundEnabled ? "Отключить звук" : "Включить звук"}>
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button type="button" className="game-pause-button" onClick={togglePause} disabled={!['playing', 'paused'].includes(mode)} aria-label={mode === "paused" ? "Продолжить игру" : "Пауза"} title="Пауза (P)">
                {mode === "paused" ? <Play size={16} /> : <Pause size={16} />}
              </button>
            </div>
          </div>
          <div className="game-sector-strip">
            <span>СЕКТОР {String(sector).padStart(2, "0")}</span>
            <div className="game-sector-progress" role="progressbar" aria-label="Прогресс до следующего сектора" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(sectorProgress * 100)}>
              <span style={{ width: `${sectorProgress * 100}%` }} />
            </div>
            <small>новый сектор через {secondsToSector}с</small>
          </div>
          <div className="game-stage">
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="Игровое поле: двигайтесь вверх и вниз, уклоняйтесь от астероидов и собирайте звёзды" />
            {mode !== "playing" && (
              <div className="game-overlay">
                <div className="game-overlay-card">
                  <div className="game-overlay-icon"><Gamepad2 size={25} /></div>
                  <p className="game-overlay-kicker">{mode === "over" ? "ПОЛЁТ ЗАВЕРШЁН" : mode === "paused" ? "ПЕРЕДЫШКА В КОСМОСЕ" : "ГОТОВ К СТАРТУ?"}</p>
                  <h2>{mode === "over" ? "Звёзды подождут." : mode === "paused" ? "Пилот, отдыхаем?" : "Покажи космосу класс."}</h2>
                  <p>{mode === "over" ? `Твой счёт — ${Math.floor(gameRef.current.score)}. Ещё один полёт?` : mode === "paused" ? "Астероиды остановлены. Продолжай, когда будешь готов." : "Уклоняйся от астероидов, стреляй лазером и собирай светящиеся звёзды."}</p>
                  <button type="button" className="game-start-button" onClick={mode === "paused" ? togglePause : startGame}>
                    {mode === "over" ? <RotateCcw size={17} /> : mode === "paused" ? <Play size={17} /> : <ArrowRight size={18} />}
                    {mode === "over" ? "Ещё раз" : mode === "paused" ? "Продолжить" : "Начать полёт"}
                  </button>
                  <span className="game-enter-hint">{mode === "paused" ? "нажми P, чтобы продолжить" : "или нажми Enter"}</span>
                </div>
              </div>
            )}
            <div className="game-controls-hint"><span>↑</span><span>↓</span> или W / S <i /> уклоняйся <i /> X — лазер <i /> SPACE — щит <i /> P — пауза</div>
          </div>
          <div className="game-bottom-bar">
            <div className="game-instruction"><span className="game-key">↑</span><span className="game-key">↓</span><span>Двигайся вверх и вниз</span></div>
            <div className="game-instruction"><span className="game-star-icon">✦</span><span>Серия звёзд = <b>комбо</b></span></div>
            <button type="button" className="game-laser-button" onClick={fireLaser} disabled={mode !== "playing" || laserCooldown > 0} aria-label="Выстрелить лазером">
              <Crosshair size={15} /> ЛАЗЕР {laserCooldown > 0 ? `${laserCooldown.toFixed(1)}с` : "X"}
            </button>
            <button type="button" className={`game-dash-button ${dashCooldown > 0 ? "is-cooling" : ""}`} onClick={activateDash} disabled={mode !== "playing" || dashCooldown > 0}>
              <Zap size={15} /> ЩИТ {dashCooldown > 0 ? `${dashCooldown.toFixed(1)}с` : "ГОТОВ"}
            </button>
            <button type="button" className="game-restart" onClick={startGame}><RotateCcw size={15} /> Заново</button>
          </div>
        </section>
        <div className="game-mobile-pad" aria-label="Сенсорное управление">
          <span>УПРАВЛЕНИЕ</span>
          <button type="button" aria-label="Двигаться вверх" {...holdDirection("up")}><ArrowUp /></button>
          <button type="button" aria-label="Двигаться вниз" {...holdDirection("down")}><ArrowDown /></button>
          <button type="button" aria-label={laserCooldown > 0 ? `Лазер перезаряжается: ${laserCooldown.toFixed(1)} секунд` : "Выстрелить лазером"} onClick={fireLaser} disabled={mode !== "playing" || laserCooldown > 0}><Crosshair /></button>
          <button type="button" aria-label={dashCooldown > 0 ? `Щит перезаряжается: ${dashCooldown.toFixed(1)} секунд` : "Включить щит"} onClick={activateDash} disabled={mode !== "playing" || dashCooldown > 0}><Zap /></button>
          <small>Стреляй и уклоняйся</small>
        </div>
        <section className="game-missions" aria-labelledby="game-missions-title">
          <div className="game-missions-heading">
            <div>
              <span className="game-difficulty-label">БОНУСНЫЕ ЦЕЛИ</span>
              <h2 id="game-missions-title">Задания полёта</h2>
            </div>
            <span>{missions.filter((mission) => mission.completed).length}/{missions.length} выполнено</span>
          </div>
          <div className="game-mission-list">
            {missions.map((mission) => (
              <article key={mission.id} className={`game-mission-card ${mission.completed ? "is-complete" : ""}`}>
                <div className="game-mission-copy">
                  <strong>{mission.label}</strong>
                  <span>{mission.completed ? "Выполнено" : `Награда: +${Math.round(mission.reward * DIFFICULTIES[difficulty].score)} очков`}</span>
                </div>
                <div className="game-mission-progress" role="progressbar" aria-label={mission.label} aria-valuemin={0} aria-valuemax={mission.target} aria-valuenow={mission.progress}>
                  <span style={{ width: `${(mission.progress / mission.target) * 100}%` }} />
                </div>
                <small>{mission.progress}/{mission.target}</small>
              </article>
            ))}
          </div>
        </section>
        <footer className="game-footer-note"><span>0x00 SPACE</span><i /> одна маленькая игра о большом космосе</footer>
      </main>
      <Footer />
    </div>
  );
}
