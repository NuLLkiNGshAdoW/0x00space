import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Crosshair, Gamepad2, Maximize2, Minimize2, Pause, Play, RotateCcw, Sparkles, Volume2, VolumeX, Zap } from "lucide-react";
import Seo from "../components/Seo.jsx";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { getGameLeaderboard, submitGameScore } from "../services/api.js";

const WIDTH = 960;
const HEIGHT = 540;
const BEST_KEY = "space-runner-best";
const SOUND_KEY = "space-runner-sound";
const EFFECTS_VOLUME_KEY = "space-runner-effects-volume";
const MUSIC_KEY = "space-runner-music";
const MUSIC_VOLUME_KEY = "space-runner-music-volume";
const RECORDS_KEY = "space-runner-records";
const CREDITS_KEY = "space-runner-credits";
const UPGRADES_KEY = "space-runner-upgrades";
const DAILY_KEY = "space-runner-daily";
const PROFILE_KEY = "space-runner-pilot-profile";
const SHIP_KEY = "space-runner-selected-ship";
const TUTORIAL_KEY = "space-runner-tutorial-complete";
const PLAYER_ID_KEY = "space-runner-player-id";
const PLAYER_NAME_KEY = "space-runner-player-name";
const SHIPS = {
  courier: { label: "Курьер", detail: "Сбалансированный корабль", unlockBosses: 0, movement: 1, laserCooldown: 1, magnet: 0, extraLives: 0, ability: { type: "shield", label: "ЩИТ", cooldown: 5, duration: 0.8 }, colors: ["#0a3435", "#29b9a9", "#79e6cc", "#36cdb0"] },
  interceptor: { label: "Перехватчик", detail: "+22% скорость · лазер быстрее", unlockBosses: 1, movement: 1.22, laserCooldown: 0.88, magnet: 0, extraLives: 0, ability: { type: "dash", label: "РЫВОК", cooldown: 3.5, duration: 0.65 }, colors: ["#172f55", "#4a87e8", "#b6d8ff", "#68b5ff"] },
  guardian: { label: "Страж", detail: "+1 жизнь · крепкая броня", unlockBosses: 3, movement: 0.94, laserCooldown: 1.08, magnet: 0, extraLives: 1, ability: { type: "shield", label: "БРОНЯ", cooldown: 7, duration: 1.5 }, colors: ["#4a3020", "#d4883c", "#ffe0a0", "#ffc362"] },
  seeker: { label: "Искатель", detail: "+сбор звёзд · манёвренность", unlockBosses: 5, movement: 1.08, laserCooldown: 1, magnet: 1, extraLives: 0, ability: { type: "magnet", label: "МАГНИТ", cooldown: 6, duration: 2.8 }, colors: ["#40234f", "#a458c4", "#efb4ff", "#d780f5"] },
};
const BOSS_TYPES = [
  { label: "Страж сектора", attack: "aimed", interval: 1.25, phase2Interval: 0.9, hp: 14, color: "#ff647f", glow: "#ff4d83" },
  { label: "Рой-матка", attack: "spread", interval: 1.05, phase2Interval: 0.82, hp: 18, color: "#d879ff", glow: "#bb4dff" },
  { label: "Осадный крейсер", attack: "barrage", interval: 1.75, phase2Interval: 1.2, hp: 22, color: "#ffad55", glow: "#ff8c3d" },
];
const TUTORIAL_STEPS = [
  { title: "Маневрируй", body: "Поднимайся и опускайся стрелками или W / S. На телефоне используй кнопки под полем или веди пальцем по экрану." },
  { title: "Отвечай огнём", body: "Клавиша X или кнопка «Лазер» уничтожает астероиды и наносит урон боссам. Следи за перезарядкой." },
  { title: "Примени способность", body: "Нажми SPACE или кнопку способности. У каждого корабля она своя: щит, рывок или магнитный импульс." },
  { title: "Читай поле боя", body: "Собирай звёзды для комбо, подбирай аптечки и уворачивайся от красных линий-предупреждений перед атаками босса." },
];

function bossAttackPattern(boss) {
  if (boss.type === 0) return boss.phase === 2 ? "spread" : "aimed";
  if (boss.type === 1) return boss.phase === 2 ? "wideSpread" : "spread";
  return "barrage";
}

function createBossWarning(boss, targetY) {
  const attack = bossAttackPattern(boss);
  const angle = Math.atan2(targetY - boss.y, 143 - (boss.x - 56));
  const laneOffsets = boss.phase === 2 ? [-68, -34, 0, 34, 68] : [-42, 0, 42];
  return {
    attack,
    targetY,
    angle,
    lanes: attack === "barrage" ? laneOffsets.map((offset) => Math.max(20, Math.min(HEIGHT - 20, targetY + offset))) : [],
  };
}
const DAILY_DEFS = [
  { id: "stars", label: "Собрать 15 звёзд", target: 15, reward: 10 },
  { id: "bosses", label: "Победить босса", target: 1, reward: 15 },
  { id: "sectors", label: "Открыть 5 секторов", target: 5, reward: 12 },
];
const ACHIEVEMENT_DEFS = [
  { id: "star_collector", label: "Звёздный собиратель", detail: "Собрать 100 звёзд", counter: "stars", target: 100, reward: 50 },
  { id: "boss_hunter", label: "Охотник на боссов", detail: "Победить 5 боссов", counter: "bosses", target: 5, reward: 100 },
  { id: "sector_veteran", label: "Ветеран космоса", detail: "Открыть 10 секторов", counter: "sectors", target: 10, reward: 80 },
];
const UPGRADE_DEFS = {
  hull: { label: "Усиленная броня", detail: "+1 стартовая жизнь", prices: [35, 70], max: 2 },
  laser: { label: "Лазерный конденсатор", detail: "Быстрее перезарядка", prices: [25, 55, 90], max: 3 },
  magnet: { label: "Звёздный магнит", detail: "Притягивает звёзды", prices: [20, 45, 75], max: 3 },
};
const DIFFICULTIES = {
  explorer: { label: "Исследователь", detail: "Медленный темп", speed: 0.78, spawn: 1.34, score: 1 },
  standard: { label: "Пилот", detail: "Сбалансированный", speed: 1, spawn: 1, score: 1 },
  ace: { label: "Айс", detail: "Больше риска · ×1,5 очков", speed: 1.24, spawn: 0.78, score: 1.5 },
  adaptive: { label: "Адаптивный", detail: "Темп подстраивается под тебя", speed: 1, spawn: 1, score: 1 },
};
const MISSION_DEFS = [
  { id: "stars", label: "Собрать 5 звёзд", target: 5, reward: 150 },
  { id: "rocks", label: "Сбить 3 астероида", target: 3, reward: 200 },
  { id: "sector", label: "Добраться до сектора 3", target: 3, reward: 250 },
];

function createMissions() {
  return MISSION_DEFS.map((mission) => ({ ...mission, progress: 0, completed: false }));
}

function readUpgrades() {
  try {
    const saved = JSON.parse(localStorage.getItem(UPGRADES_KEY) || "{}");
    return Object.fromEntries(Object.entries(UPGRADE_DEFS).map(([id, upgrade]) => [
      id,
      Math.max(0, Math.min(upgrade.max, Math.floor(Number(saved[id]) || 0))),
    ]));
  } catch {
    return { hull: 0, laser: 0, magnet: 0 };
  }
}

function readCredits() {
  try {
    return Math.max(0, Math.floor(Number(localStorage.getItem(CREDITS_KEY)) || 0));
  } catch {
    return 0;
  }
}

function readVolume(key, fallback) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
  } catch {
    return fallback;
  }
}

function getOrCreatePlayerId() {
  let playerId = localStorage.getItem(PLAYER_ID_KEY);
  if (!playerId) {
    playerId = globalThis.crypto?.randomUUID?.() || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
    });
    localStorage.setItem(PLAYER_ID_KEY, playerId);
  }
  return playerId;
}

function getSavedPlayerName() {
  const saved = localStorage.getItem(PLAYER_NAME_KEY)?.trim();
  if (saved) return saved.slice(0, 24);
  const playerId = getOrCreatePlayerId();
  return `Пилот-${playerId.slice(0, 4).toUpperCase()}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function createDailyTasks() {
  return DAILY_DEFS.map((task) => ({ ...task, progress: 0, completed: false }));
}

function readDailyTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(DAILY_KEY) || "null");
    if (saved?.date === todayKey() && Array.isArray(saved.tasks)) {
      return DAILY_DEFS.map((definition) => {
        const task = saved.tasks.find((entry) => entry.id === definition.id);
        const progress = Math.max(0, Math.min(definition.target, Number(task?.progress) || 0));
        return { ...definition, progress, completed: Boolean(task?.completed) || progress >= definition.target };
      });
    }
  } catch {
    // Invalid or unavailable saved data starts a fresh daily set.
  }
  return createDailyTasks();
}

function readPilotProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
    return {
      stars: Math.max(0, Number(saved.stars) || 0),
      bosses: Math.max(0, Number(saved.bosses) || 0),
      sectors: Math.max(0, Number(saved.sectors) || 0),
      unlocked: Array.isArray(saved.unlocked) ? saved.unlocked : [],
    };
  } catch {
    return { stars: 0, bosses: 0, sectors: 0, unlocked: [] };
  }
}

function readSelectedShip() {
  const selected = localStorage.getItem(SHIP_KEY);
  const bosses = readPilotProfile().bosses;
  return SHIPS[selected] && SHIPS[selected].unlockBosses <= bosses ? selected : "courier";
}

function readRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(RECORDS_KEY) || "[]");
    if (!Array.isArray(records)) return [];
    return records
      .filter((record) => Number.isFinite(record.score) && typeof record.playedAt === "string")
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } catch {
    return [];
  }
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
  const upgrades = readUpgrades();
  const shipId = readSelectedShip();
  const ship = SHIPS[shipId];
  const maxLives = 3 + upgrades.hull + ship.extraLives;
  return {
    mode: "ready",
    leaderboardSubmitted: false,
    playerY: HEIGHT / 2,
    score: 0,
    best: Number(localStorage.getItem(BEST_KEY)) || 0,
    lives: maxLives,
    maxLives,
    upgrades,
    shipId,
    ship,
    difficulty: "standard",
    adaptivePressure: 0.86,
    adaptiveTimer: 0,
    missions: createMissions(),
    elapsed: 0,
    sector: 1,
    recordSaved: false,
    spawnIn: 0.7,
    starIn: 1.5,
    medkitIn: 14,
    combo: 0,
    comboTimer: 0,
    obstacles: [],
    enemyShots: [],
    boss: null,
    lasers: [],
    laserCooldown: 0,
    stars: [],
    medkits: [],
    particles: [],
    floaters: [],
    invincible: 0,
    dash: 0,
    magnetPulse: 0,
    dashCooldown: 0,
    lastTime: 0,
    lastUi: 0,
  };
}

function pixel(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawShip(ctx, x, y, time, flashing, shielded, colors) {
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
  pixel(ctx, x - 22, py - 27, 39, 36, colors[0]);
  pixel(ctx, x - 19, py - 30, 38, 34, colors[1]);
  pixel(ctx, x - 15, py - 34, 30, 7, colors[2]);
  pixel(ctx, x - 13, py - 4, 27, 14, "#f1cfaa");
  pixel(ctx, x - 7, py + 1, 5, 7, "#124650");
  pixel(ctx, x + 5, py + 1, 5, 7, "#124650");
  pixel(ctx, x - 17, py + 11, 33, 24, "#383943");
  pixel(ctx, x - 5, py + 10, 11, 27, "#f1cfaa");
  pixel(ctx, x - 2, py + 13, 6, 21, colors[3]);
  pixel(ctx, x - 25, py + 14, 11, 15, "#4c4c57");
  pixel(ctx, x + 13, py + 14, 11, 15, "#4c4c57");
  pixel(ctx, x - 28, py + 29, 15, 5, colors[3]);
  pixel(ctx, x + 11, py + 29, 15, 5, colors[3]);
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
    if (rock.type === "drone") {
      ctx.shadowColor = "#ff4fd8";
      ctx.shadowBlur = 20;
      pixel(ctx, -rock.r, -rock.r * 0.55, rock.r * 2, rock.r * 1.1, "#743fa0");
      pixel(ctx, -rock.r * 0.55, -rock.r, rock.r * 1.1, rock.r * 2, "#b35bca");
      pixel(ctx, -rock.r * 0.35, -rock.r * 0.2, rock.r * 0.7, rock.r * 0.4, "#ff8bea");
    } else if (rock.type === "mine") {
      ctx.shadowColor = "#ffbd4a";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#ed9c43";
      ctx.beginPath();
      ctx.arc(0, 0, rock.r * (0.8 + Math.sin(rock.pulse) * 0.15), 0, Math.PI * 2);
      ctx.fill();
      for (let spike = 0; spike < 8; spike += 1) {
        ctx.rotate(Math.PI / 4);
        pixel(ctx, rock.r * 0.6, -2, rock.r * 0.7, 4, "#ffe58d");
      }
      pixel(ctx, -4, -4, 8, 8, "#fff2c2");
    } else {
      ctx.shadowColor = "#ff795d";
      ctx.shadowBlur = 18;
      pixel(ctx, -rock.r * 0.68, -rock.r * 0.42, rock.r * 1.36, rock.r * 0.84, "#8a5360");
      pixel(ctx, -rock.r * 0.42, -rock.r * 0.68, rock.r * 0.84, rock.r * 1.36, "#b56c66");
      pixel(ctx, -rock.r * 0.32, -rock.r * 0.26, rock.r * 0.48, rock.r * 0.29, "#e09a72");
      pixel(ctx, rock.r * 0.14, rock.r * 0.15, rock.r * 0.28, rock.r * 0.2, "#593f56");
    }
    ctx.restore();
  });

  game.enemyShots.forEach((shot) => {
    ctx.save();
    ctx.shadowColor = "#ff5f87";
    ctx.shadowBlur = 16;
    ctx.fillStyle = shot.color || "#ff8aa3";
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  if (game.boss) {
    const boss = game.boss;
    const bossType = BOSS_TYPES[boss.type];
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.shadowColor = bossType.glow;
    ctx.shadowBlur = 32;
    ctx.fillStyle = boss.type === 1 ? "#402454" : boss.type === 2 ? "#54351f" : "#572747";
    ctx.beginPath();
    if (boss.type === 1) {
      ctx.moveTo(-68, -42); ctx.lineTo(-26, -68); ctx.lineTo(24, -54); ctx.lineTo(68, -20);
      ctx.lineTo(48, 0); ctx.lineTo(68, 20); ctx.lineTo(24, 54); ctx.lineTo(-26, 68);
      ctx.lineTo(-68, 42); ctx.lineTo(-48, 0);
    } else if (boss.type === 2) {
      ctx.moveTo(-70, -54); ctx.lineTo(48, -54); ctx.lineTo(70, -30); ctx.lineTo(70, 30);
      ctx.lineTo(48, 54); ctx.lineTo(-70, 54); ctx.lineTo(-52, 0);
    } else {
      ctx.moveTo(-62, -52); ctx.lineTo(20, -68); ctx.lineTo(64, -36); ctx.lineTo(54, 36);
      ctx.lineTo(10, 62); ctx.lineTo(-62, 42); ctx.lineTo(-42, 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = bossType.color;
    ctx.lineWidth = 4;
    ctx.stroke();
    pixel(ctx, -52, -14, 35, 28, bossType.color);
    pixel(ctx, -34, -6, 22, 12, "#fff0ba");
    pixel(ctx, 4, -25, 36, 10, bossType.glow);
    pixel(ctx, 7, 15, 36, 10, bossType.glow);
    ctx.restore();

    if (boss.warning) {
      const warning = boss.warning;
      ctx.save();
      ctx.globalAlpha = 0.34 + (Math.sin(time * 20) + 1) * 0.2;
      ctx.strokeStyle = bossType.color;
      ctx.fillStyle = bossType.color;
      ctx.shadowColor = bossType.glow;
      ctx.shadowBlur = 14;
      ctx.lineWidth = warning.attack === "aimed" ? 3 : 2;
      ctx.setLineDash([12, 9]);
      if (warning.attack === "aimed") {
        ctx.beginPath();
        ctx.moveTo(boss.x - 56, boss.y);
        ctx.lineTo(108, warning.targetY);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(143, warning.targetY, 22, 0, Math.PI * 2);
        ctx.stroke();
      } else if (warning.attack === "spread" || warning.attack === "wideSpread") {
        const spread = warning.attack === "wideSpread" ? [-0.42, -0.21, 0, 0.21, 0.42] : [-0.25, 0, 0.25];
        spread.forEach((offset) => {
          ctx.beginPath();
          ctx.moveTo(boss.x - 56, boss.y);
          ctx.lineTo(boss.x - 56 + Math.cos(warning.angle + offset) * 760, boss.y + Math.sin(warning.angle + offset) * 760);
          ctx.stroke();
        });
      } else {
        warning.lanes.forEach((lane) => {
          ctx.fillRect(105, lane - 13, boss.x - 160, 26);
          ctx.strokeRect(105, lane - 13, boss.x - 160, 26);
        });
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

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
  drawShip(ctx, 143, game.playerY, time, game.invincible > 0, game.dash > 0, game.ship.colors);
}

export default function GamePage() {
  const canvasRef = useRef(null);
  const shellRef = useRef(null);
  const pointerRef = useRef(null);
  const gameRef = useRef(null);
  const keysRef = useRef(new Set());
  const audioRef = useRef(null);
  const musicTimerRef = useRef(null);
  const musicVoicesRef = useRef(new Set());
  const soundEnabledRef = useRef(localStorage.getItem(SOUND_KEY) !== "off");
  const effectsVolumeRef = useRef(readVolume(EFFECTS_VOLUME_KEY, 0.65));
  const musicEnabledRef = useRef(localStorage.getItem(MUSIC_KEY) !== "off");
  const musicVolumeRef = useRef(readVolume(MUSIC_VOLUME_KEY, 0.35));
  const [mode, setMode] = useState("ready");
  const [tutorialStep, setTutorialStep] = useState(() => (localStorage.getItem(TUTORIAL_KEY) === "done" ? null : 0));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [lives, setLives] = useState(() => makeGame().lives);
  const [credits, setCredits] = useState(() => readCredits());
  const [upgrades, setUpgrades] = useState(() => readUpgrades());
  const [selectedShip, setSelectedShip] = useState(() => readSelectedShip());
  const [dailyTasks, setDailyTasks] = useState(() => readDailyTasks());
  const [pilotProfile, setPilotProfile] = useState(() => readPilotProfile());
  const [playerId] = useState(() => getOrCreatePlayerId());
  const [pilotName, setPilotName] = useState(() => getSavedPlayerName());
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardStatus, setLeaderboardStatus] = useState("loading");
  const [dashCooldown, setDashCooldown] = useState(0);
  const [laserCooldown, setLaserCooldown] = useState(0);
  const [combo, setCombo] = useState(0);
  const [sector, setSector] = useState(1);
  const [difficulty, setDifficulty] = useState(() => {
    const saved = localStorage.getItem("space-runner-difficulty");
    return DIFFICULTIES[saved] ? saved : "standard";
  });
  const [missions, setMissions] = useState(() => createMissions());
  const [records, setRecords] = useState(() => readRecords());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundEnabledRef.current);
  const [effectsVolume, setEffectsVolume] = useState(effectsVolumeRef.current);
  const [musicEnabled, setMusicEnabled] = useState(musicEnabledRef.current);
  const [musicVolume, setMusicVolume] = useState(musicVolumeRef.current);

  if (!gameRef.current) gameRef.current = makeGame();

  useEffect(() => {
    let active = true;
    getGameLeaderboard()
      .then((entries) => {
        if (!active) return;
        setLeaderboard(entries);
        setLeaderboardStatus("ready");
      })
      .catch(() => {
        if (active) setLeaderboardStatus("unavailable");
      });
    return () => { active = false; };
  }, []);

  const addCredits = useCallback((amount) => {
    const nextCredits = readCredits() + amount;
    localStorage.setItem(CREDITS_KEY, String(nextCredits));
    setCredits(nextCredits);
  }, []);

  const buyUpgrade = (id) => {
    if (mode === "playing" || mode === "paused") return;
    const upgrade = UPGRADE_DEFS[id];
    const level = upgrades[id];
    const price = upgrade.prices[level];
    if (price === undefined || credits < price) return;
    const nextUpgrades = { ...upgrades, [id]: level + 1 };
    const nextCredits = credits - price;
    localStorage.setItem(UPGRADES_KEY, JSON.stringify(nextUpgrades));
    localStorage.setItem(CREDITS_KEY, String(nextCredits));
    setUpgrades(nextUpgrades);
    setCredits(nextCredits);
    if (id === "hull" && mode === "ready") {
      gameRef.current.maxLives = 3 + nextUpgrades.hull + gameRef.current.ship.extraLives;
      gameRef.current.lives = gameRef.current.maxLives;
      setLives(gameRef.current.maxLives);
    }
  };

  const chooseShip = (id) => {
    const ship = SHIPS[id];
    if (!ship || ship.unlockBosses > pilotProfile.bosses || mode === "playing" || mode === "paused") return;
    localStorage.setItem(SHIP_KEY, id);
    setSelectedShip(id);
    if (mode === "ready") {
      const game = gameRef.current;
      game.shipId = id;
      game.ship = ship;
      game.maxLives = 3 + game.upgrades.hull + ship.extraLives;
      game.lives = game.maxLives;
      setLives(game.lives);
    }
  };

  const playSfx = useCallback((name) => {
    if (!soundEnabledRef.current || effectsVolumeRef.current <= 0) return;
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
      volume.gain.exponentialRampToValueAtTime(0.1 * effectsVolumeRef.current, startAt + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(volume);
      volume.connect(audio.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.015);
      offset += duration * 0.62;
    });
  }, []);

  const startMusic = useCallback(() => {
    if (!musicEnabledRef.current || musicVolumeRef.current <= 0 || musicTimerRef.current !== null) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = audioRef.current || new AudioContextClass();
    audioRef.current = audio;
    if (audio.state === "suspended") audio.resume();
    const melody = [196, 233.08, 261.63, 311.13, 349.23, 311.13, 261.63, 233.08];
    const bass = [98, 116.54, 130.81, 116.54];
    let step = 0;
    const playTone = (frequency, duration, volume, type) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const startAt = audio.currentTime;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, musicVolumeRef.current * volume), startAt + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      const voice = { oscillator, gain };
      musicVoicesRef.current.add(voice);
      oscillator.onended = () => musicVoicesRef.current.delete(voice);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.02);
    };
    const playStep = () => {
      playTone(melody[step % melody.length], 0.38, 0.028, "sine");
      if (step % 4 === 0) playTone(bass[Math.floor(step / 4) % bass.length], 1.55, 0.012, "triangle");
      step += 1;
    };
    playStep();
    musicTimerRef.current = window.setInterval(playStep, 420);
  }, []);

  const stopMusic = useCallback(() => {
    if (musicTimerRef.current !== null) {
      window.clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
    }
    const audio = audioRef.current;
    if (!audio) return;
    const stopAt = audio.currentTime;
    musicVoicesRef.current.forEach(({ oscillator, gain }) => {
      try {
        gain.gain.cancelScheduledValues(stopAt);
        gain.gain.setTargetAtTime(0.0001, stopAt, 0.035);
        oscillator.stop(stopAt + 0.2);
      } catch {
        // A note may have completed just as playback was paused.
      }
    });
    musicVoicesRef.current.clear();
  }, []);

  const recordProgress = useCallback((counter, amount = 1) => {
    const nextDaily = readDailyTasks();
    const dailyTask = nextDaily.find((task) => task.id === counter);
    if (dailyTask && !dailyTask.completed) {
      dailyTask.progress = Math.min(dailyTask.target, dailyTask.progress + amount);
      if (dailyTask.progress >= dailyTask.target) {
        dailyTask.completed = true;
        addCredits(dailyTask.reward);
        gameRef.current.floaters.push({ x: WIDTH / 2, y: 175, text: `ЕЖЕДНЕВНАЯ ЦЕЛЬ! +${dailyTask.reward} КР`, color: "#b8ffac", life: 1.8 });
        playSfx("mission");
      }
      localStorage.setItem(DAILY_KEY, JSON.stringify({ date: todayKey(), tasks: nextDaily }));
      setDailyTasks(nextDaily);
    }

    const nextProfile = readPilotProfile();
    nextProfile[counter] += amount;
    ACHIEVEMENT_DEFS.forEach((achievement) => {
      if (achievement.counter !== counter || nextProfile[counter] < achievement.target || nextProfile.unlocked.includes(achievement.id)) return;
      nextProfile.unlocked.push(achievement.id);
      addCredits(achievement.reward);
      gameRef.current.floaters.push({ x: WIDTH / 2, y: 205, text: `ДОСТИЖЕНИЕ: ${achievement.label} · +${achievement.reward} КР`, color: "#ffe28a", life: 2 });
      playSfx("mission");
    });
    localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
    setPilotProfile(nextProfile);
  }, [addCredits, playSfx]);

  const toggleSound = useCallback(() => {
    const enabled = !soundEnabledRef.current;
    soundEnabledRef.current = enabled;
    setSoundEnabled(enabled);
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
    if (enabled) playSfx("start");
  }, [playSfx]);

  const toggleMusic = useCallback(() => {
    const enabled = !musicEnabledRef.current;
    musicEnabledRef.current = enabled;
    setMusicEnabled(enabled);
    localStorage.setItem(MUSIC_KEY, enabled ? "on" : "off");
    if (enabled && gameRef.current.mode === "playing") startMusic();
    else stopMusic();
  }, [startMusic, stopMusic]);

  useEffect(() => () => {
    stopMusic();
    audioRef.current?.close();
  }, [stopMusic]);

  useEffect(() => {
    if (mode !== "playing") stopMusic();
  }, [mode, stopMusic]);

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  const startGame = useCallback(() => {
    const game = gameRef.current;
    localStorage.setItem(TUTORIAL_KEY, "done");
    setTutorialStep(null);
    Object.assign(game, makeGame(), { mode: "playing", difficulty, best: game.best, lastTime: 0 });
    setMode("playing");
    setScore(0);
    setLives(game.maxLives);
    setDashCooldown(0);
    setLaserCooldown(0);
    setCombo(0);
    setSector(1);
    setMissions(createMissions());
    startMusic();
    playSfx("start");
  }, [difficulty, playSfx, startMusic]);

  const togglePause = useCallback(() => {
    const game = gameRef.current;
    if (game.mode === "playing") {
      game.mode = "paused";
      setMode("paused");
      stopMusic();
    } else if (game.mode === "paused") {
      game.mode = "playing";
      game.lastTime = 0;
      setMode("playing");
      startMusic();
    }
  }, [startMusic, stopMusic]);

  const activateDash = useCallback(() => {
    const game = gameRef.current;
    if (game.mode !== "playing" || game.dashCooldown > 0) return;
    const ability = game.ship.ability;
    game.dash = ability.type === "magnet" ? 0.75 : ability.duration;
    game.dashCooldown = ability.cooldown;
    if (ability.type === "magnet") {
      game.magnetPulse = ability.duration;
      game.invincible = Math.max(game.invincible, 0.35);
    } else {
      game.invincible = Math.max(game.invincible, ability.duration);
    }
    setDashCooldown(ability.cooldown);
    playSfx(ability.type === "magnet" ? "star" : "dash");
  }, [playSfx]);

  const fireLaser = useCallback(() => {
    const game = gameRef.current;
    if (game.mode !== "playing" || game.laserCooldown > 0) return;
    game.lasers.push({ x: 166, y: game.playerY, speed: 760, life: 1.8, hit: false });
    const cooldown = Math.max(0.15, 0.34 * game.ship.laserCooldown * (1 - game.upgrades.laser * 0.2));
    game.laserCooldown = cooldown;
    setLaserCooldown(cooldown);
    playSfx("laser");
  }, [playSfx]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        window.screen?.orientation?.unlock?.();
        return;
      }
      await shellRef.current?.requestFullscreen?.();
      try {
        await window.screen?.orientation?.lock?.("landscape");
      } catch {
        // Some browsers do not allow orientation locking; fullscreen still works.
      }
    } catch {
      // Keep the regular embedded layout if the browser denies fullscreen mode.
    }
  }, []);

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
    const adjustPressure = (change) => {
      if (game.difficulty !== "adaptive") return;
      game.adaptivePressure = Math.max(0.68, Math.min(1.36, game.adaptivePressure + change));
      if (change < 0) game.adaptiveTimer = 0;
    };
    const tick = (timestamp) => {
      const dt = Math.min((timestamp - (game.lastTime || timestamp)) / 1000, 0.04);
      game.lastTime = timestamp;
      if (game.mode === "playing") {
        game.elapsed += dt;
        if (game.difficulty === "adaptive") {
          game.adaptiveTimer += dt;
          if (game.adaptiveTimer >= 8) {
            adjustPressure(0.02);
            game.adaptiveTimer = 0;
          }
        }
        const pressure = game.difficulty === "adaptive" ? game.adaptivePressure : 1;
        const currentSector = Math.floor(game.elapsed / 20) + 1;
        if (currentSector !== game.sector) {
          const sectorDelta = currentSector - game.sector;
          game.sector = currentSector;
          setSector(currentSector);
          game.floaters.push({ x: WIDTH / 2, y: HEIGHT / 2, text: `СЕКТОР ${String(currentSector).padStart(2, "0")}`, color: "#8bdfff", life: 1.5 });
          playSfx("sector");
          if (currentSector % 3 === 0 && !game.boss) {
            const bossIndex = readPilotProfile().bosses % BOSS_TYPES.length;
            const bossType = BOSS_TYPES[bossIndex];
            game.boss = { x: WIDTH + 90, y: HEIGHT / 2, type: bossIndex, hp: bossType.hp, maxHp: bossType.hp, phase: 1, attackIn: 1.4 / pressure, age: 0 };
            game.floaters.push({ x: WIDTH / 2, y: 115, text: "БОСС ПРИБЛИЖАЕТСЯ", color: "#ff91b0", life: 2 });
            playSfx("hit");
          }
          const sectorMission = game.missions.find((mission) => mission.id === "sector");
          trackMission("sector", currentSector - sectorMission.progress, (DIFFICULTIES[game.difficulty] || DIFFICULTIES.standard).score);
          recordProgress("sectors", sectorDelta);
        }
        const difficultySettings = DIFFICULTIES[game.difficulty] || DIFFICULTIES.standard;
        const keys = keysRef.current;
        const up = keys.has("ArrowUp") || keys.has("w") || keys.has("W") || keys.has("touch-up");
        const down = keys.has("ArrowDown") || keys.has("s") || keys.has("S") || keys.has("touch-down");
        if (up) game.playerY -= 310 * game.ship.movement * dt;
        if (down) game.playerY += 310 * game.ship.movement * dt;
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
        game.magnetPulse = Math.max(0, game.magnetPulse - dt);
        game.dashCooldown = Math.max(0, game.dashCooldown - dt);
        game.laserCooldown = Math.max(0, game.laserCooldown - dt);

        if (game.spawnIn <= 0 && !game.boss) {
          const difficulty = Math.min((game.sector - 1) * 0.065, 0.35);
          const typeRoll = Math.random();
          const type = typeRoll < 0.2 ? "drone" : typeRoll < 0.38 ? "mine" : "rock";
          const spawnY = 65 + Math.random() * 405;
          game.obstacles.push({
            x: WIDTH + 42,
            y: spawnY,
            r: type === "mine" ? 21 : 17 + Math.random() * 14,
            type,
            baseY: spawnY,
            age: 0,
            pulse: 0,
            speed: ((type === "drone" ? 315 : type === "mine" ? 170 : 255 + Math.random() * 100) * difficultySettings.speed + game.elapsed * 1.15 + (game.sector - 1) * 28) * pressure,
            spin: Math.random() * Math.PI,
            spinSpeed: (Math.random() - 0.5) * 2,
          });
          game.spawnIn = ((0.95 - difficulty + Math.random() * 0.55) * difficultySettings.spawn) / pressure;
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
          rock.age += dt;
          rock.pulse += dt * 5;
          if (rock.type === "drone") rock.y = rock.baseY + Math.sin(rock.age * 3.2) * 70;
          if (!rock.hit && game.invincible <= 0 && Math.abs(rock.x - 143) < rock.r + 20 && Math.abs(rock.y - game.playerY) < rock.r + 24) {
            rock.hit = true;
            game.lives -= 1;
            adjustPressure(-0.16);
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
        if (game.boss) {
          const boss = game.boss;
          const bossType = BOSS_TYPES[boss.type];
          boss.age += dt;
          boss.x = Math.max(790, boss.x - 105 * dt);
          boss.y = HEIGHT / 2 + Math.sin(boss.age * 1.45) * 145;
          if (boss.phase === 1 && boss.hp <= Math.ceil(boss.maxHp / 2)) {
            boss.phase = 2;
            boss.attackIn = 0.55 / pressure;
            boss.warning = null;
            game.floaters.push({ x: WIDTH / 2, y: 100, text: "ФАЗА 2 · БОСС УСИЛИВАЕТ АТАКУ", color: bossType.color, life: 1.8 });
            playSfx("sector");
          }
          boss.attackIn -= dt;
          if (boss.attackIn <= 0.7 && !boss.warning) boss.warning = createBossWarning(boss, game.playerY);
          if (boss.attackIn <= 0) {
            const warning = boss.warning || createBossWarning(boss, game.playerY);
            const { attack, angle } = warning;
            if (attack === "spread" || attack === "wideSpread") {
              const spreads = attack === "wideSpread" ? [-0.42, -0.21, 0, 0.21, 0.42] : [-0.25, 0, 0.25];
              spreads.forEach((spread) => game.enemyShots.push({ x: boss.x - 56, y: boss.y, vx: Math.cos(angle + spread) * 270 * pressure, vy: Math.sin(angle + spread) * 270 * pressure, color: bossType.color }));
            } else if (attack === "barrage") {
              warning.lanes.forEach((lane) => game.enemyShots.push({ x: boss.x - 56, y: lane, vx: -330 * pressure, vy: 0, color: bossType.color }));
            } else {
              game.enemyShots.push({ x: boss.x - 56, y: boss.y, vx: Math.cos(angle) * 260 * pressure, vy: Math.sin(angle) * 260 * pressure, color: bossType.color });
            }
            boss.warning = null;
            boss.attackIn = (boss.phase === 2 ? bossType.phase2Interval : bossType.interval) / pressure;
          }
          if (Math.abs(boss.x - 143) < 75 && Math.abs(boss.y - game.playerY) < 70 && game.invincible <= 0) {
            game.lives -= 1;
            adjustPressure(-0.16);
            game.invincible = 1.15;
            setLives(game.lives);
            playSfx("hit");
            if (game.lives <= 0) { game.mode = "over"; setMode("over"); }
          }
        }
        game.enemyShots.forEach((shot) => {
          shot.x += shot.vx * dt;
          shot.y += shot.vy * dt;
          if (game.invincible <= 0 && Math.abs(shot.x - 143) < 24 && Math.abs(shot.y - game.playerY) < 25) {
            shot.hit = true;
            game.lives -= 1;
            adjustPressure(-0.16);
            game.invincible = 1.15;
            setLives(game.lives);
            playSfx("hit");
            if (game.lives <= 0) { game.mode = "over"; setMode("over"); }
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
            adjustPressure(0.01);
            playSfx("hit");
          } else if (game.boss && Math.abs(game.boss.x - laser.x) < 65 && Math.abs(game.boss.y - laser.y) < 65) {
            const boss = game.boss;
            laser.hit = true;
            boss.hp -= 1;
            adjustPressure(0.004);
            game.floaters.push({ x: boss.x, y: boss.y - 72, text: "-1", color: "#8eeeff", life: 0.45 });
            if (boss.hp <= 0) {
              game.boss = null;
              const bossReward = Math.round(750 * difficultySettings.score);
              game.score += bossReward;
              const recoveredLife = game.lives < game.maxLives;
              if (recoveredLife) game.lives += 1;
              setLives(game.lives);
              addCredits(12);
              recordProgress("bosses");
              game.floaters.push({ x: WIDTH / 2, y: HEIGHT / 2, text: `${BOSS_TYPES[boss.type].label.toUpperCase()} ПОБЕЖДЁН! +${bossReward}${recoveredLife ? " · +1 ЖИЗНЬ" : ""} · +12 КР`, color: "#b8ffac", life: 2 });
              for (let i = 0; i < 28; i += 1) game.particles.push({ x: boss.x, y: boss.y, dx: (Math.random() - 0.5) * 260, dy: (Math.random() - 0.5) * 260, life: 0.8, color: i % 2 ? "#ff91b0" : "#ffe782" });
              playSfx("mission");
            }
          }
        });
        game.stars.forEach((star) => {
          star.x -= star.speed * dt;
          const magnetLevel = game.upgrades.magnet + game.ship.magnet + (game.magnetPulse > 0 ? 2 : 0);
          if (magnetLevel && Math.abs(star.x - 143) < 220) {
            star.y += Math.max(-150, Math.min(150, (game.playerY - star.y) * (0.65 + magnetLevel * 0.35) * dt));
          }
          if (!star.hit && Math.abs(star.x - 143) < 28 + magnetLevel * 10 && Math.abs(star.y - game.playerY) < 32 + magnetLevel * 8) {
            star.hit = true;
            game.combo = game.comboTimer > 0 ? Math.min(game.combo + 1, 5) : 1;
            game.comboTimer = 3.2;
            const points = Math.round(50 * game.combo * difficultySettings.score);
            game.score += points;
            addCredits(1);
            recordProgress("stars");
            adjustPressure(0.008);
            setCombo(game.combo);
            trackMission("stars", 1, difficultySettings.score);
            playSfx(game.combo > 1 ? "combo" : "star");
            game.particles.push({ x: star.x, y: star.y, dx: 0, dy: -60, life: 0.6, color: "#ffe782" });
            game.floaters.push({ x: star.x, y: star.y - 16, text: `+${points}${game.combo > 1 ? `  x${game.combo}` : ""} · +1 КР`, color: game.combo > 1 ? "#9df4de" : "#ffe782", life: 0.9 });
          }
        });
        game.medkits.forEach((medkit) => {
          medkit.x -= medkit.speed * dt;
          if (!medkit.hit && Math.abs(medkit.x - 143) < 28 && Math.abs(medkit.y - game.playerY) < 32) {
            medkit.hit = true;
            playSfx("medkit");
            if (game.lives < game.maxLives) {
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
        game.enemyShots = game.enemyShots.filter((shot) => shot.x > -20 && shot.x < WIDTH + 30 && shot.y > -20 && shot.y < HEIGHT + 20 && !shot.hit);
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
  }, [playSfx, recordProgress, addCredits]);

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
      if (event.key.toLowerCase() === "f" && gameRef.current.mode !== "ready") {
        toggleFullscreen();
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
  }, [activateDash, fireLaser, startGame, toggleFullscreen, togglePause]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      const game = gameRef.current;
      if (document.hidden && game.mode === "playing") {
        game.mode = "paused";
        setMode("paused");
        keysRef.current.clear();
      }
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  useEffect(() => {
    if (mode !== "over") return;
    const game = gameRef.current;
    const finalScore = Math.floor(game.score);
    const nextBest = Math.max(game.best, finalScore);
    game.best = nextBest;
    localStorage.setItem(BEST_KEY, String(nextBest));
    setBest(nextBest);
    if (!game.recordSaved) {
      game.recordSaved = true;
      const updatedRecords = [
        { score: finalScore, difficulty: game.difficulty, playedAt: new Date().toISOString() },
        ...readRecords(),
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      localStorage.setItem(RECORDS_KEY, JSON.stringify(updatedRecords));
      setRecords(updatedRecords);
    }
    if (game.leaderboardSubmitted) return;
    if (!pilotName.trim()) {
      setLeaderboardStatus("name-required");
      return;
    }
    game.leaderboardSubmitted = true;
    setLeaderboardStatus("submitting");
    submitGameScore({
      player_id: playerId,
      nickname: pilotName.trim(),
      score: finalScore,
      difficulty: game.difficulty,
      ship: game.shipId,
    })
      .then(() => getGameLeaderboard())
      .then((entries) => {
        setLeaderboard(entries);
        setLeaderboardStatus("submitted");
      })
      .catch(() => setLeaderboardStatus("error"));
  }, [mode, pilotName, playerId]);

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
  const activeShip = mode === "playing" || mode === "paused" ? gameRef.current.ship : SHIPS[selectedShip];
  const steerPlayer = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas?.getBoundingClientRect();
    if (!bounds?.height || gameRef.current.mode !== "playing") return;
    const position = ((event.clientY - bounds.top) / bounds.height) * HEIGHT;
    gameRef.current.playerY = Math.max(58, Math.min(477, position));
  };

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

        <section className="game-shop" aria-labelledby="game-shop-title">
          <div className="game-shop-heading">
            <div>
              <span className="game-difficulty-label">АНГАР · КОРАБЛИ И УЛУЧШЕНИЯ</span>
              <h2 id="game-shop-title">Мастерская корабля</h2>
            </div>
            <strong className="game-credits" aria-live="polite"><Sparkles size={16} /> {credits} кредитов</strong>
          </div>
          <div className="game-ship-list" role="group" aria-label="Выбор корабля">
            {Object.entries(SHIPS).map(([id, ship]) => {
              const locked = pilotProfile.bosses < ship.unlockBosses;
              return (
                <button key={id} type="button" className={`game-ship-card ${selectedShip === id ? "is-selected" : ""}`} onClick={() => chooseShip(id)} disabled={locked || mode === "playing" || mode === "paused"} aria-pressed={selectedShip === id}>
                  <span className="game-ship-swatch" style={{ "--ship-color": ship.colors[1], "--ship-glow": ship.colors[2] }} />
                  <strong>{ship.label}</strong>
                  <small>{locked ? `Откроется после ${ship.unlockBosses} побед над боссами` : ship.detail}</small>
                  <em>{locked ? "ЗАКРЫТ" : selectedShip === id ? "ВЫБРАН" : "ВЫБРАТЬ"}</em>
                </button>
              );
            })}
          </div>
          <span className="game-shop-subhead">ПОСТОЯННЫЕ УЛУЧШЕНИЯ КОРАБЛЯ</span>
          <div className="game-shop-list">
            {Object.entries(UPGRADE_DEFS).map(([id, upgrade]) => {
              const level = upgrades[id];
              const price = upgrade.prices[level];
              const disabled = price === undefined || credits < price || mode === "playing" || mode === "paused";
              return (
                <button key={id} type="button" className="game-upgrade-card" onClick={() => buyUpgrade(id)} disabled={disabled}>
                  <span className="game-upgrade-copy">
                    <strong>{upgrade.label}</strong>
                    <small>{upgrade.detail}</small>
                  </span>
                  <span className="game-upgrade-level">УР. {level}/{upgrade.max}</span>
                  <span className="game-upgrade-buy">{price === undefined ? "МАКСИМУМ" : `УЛУЧШИТЬ · ${price} КР`}</span>
                </button>
              );
            })}
          </div>
          <p className="game-shop-note">Собирай звёзды: +1 кредит. Победа над боссом: +12 кредитов. Улучшения действуют в следующих полётах.</p>
        </section>

        <section ref={shellRef} className={`game-shell ${difficulty === "adaptive" ? "is-adaptive" : ""}`} aria-label="Космический забег">
          <div className="game-hud">
            <div className="game-hud-label"><span className="game-live-dot" /> SCORE <strong>{score.toString().padStart(5, "0")}</strong></div>
            <div className="game-hud-label game-lives" aria-label={`Осталось жизней: ${lives}`}>{Array.from({ length: gameRef.current.maxLives }, (_, i) => <span key={i} className={i < lives ? "life-lit" : "life-lost"}>♥</span>)}</div>
            <div className={`game-combo ${combo > 1 ? "is-active" : ""}`} aria-live="polite">{combo > 1 && <><Sparkles size={14} /> КОМБО ×{combo}</>}</div>
            <div className="game-hud-actions">
              <div className="game-hud-label game-best-mobile">BEST <strong>{best}</strong></div>
              <button type="button" className="game-pause-button" onClick={toggleSound} aria-label={soundEnabled ? "Отключить звук" : "Включить звук"} title={soundEnabled ? "Отключить звук" : "Включить звук"}>
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button type="button" className="game-pause-button game-fullscreen-button" onClick={toggleFullscreen} aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "На весь экран"} title="На весь экран (F)">
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
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
            {difficulty === "adaptive" && <small className="game-adaptive-status" role="status">ТЕМП {Math.round(gameRef.current.adaptivePressure * 100)}%</small>}
          </div>
          <div className="game-stage">
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              aria-label="Игровое поле: касайтесь и перемещайте пилота по вертикали, уклоняйтесь от астероидов и собирайте звёзды"
              onPointerDown={(event) => {
                if (gameRef.current.mode !== "playing") return;
                event.preventDefault();
                pointerRef.current = event.pointerId;
                event.currentTarget.setPointerCapture(event.pointerId);
                steerPlayer(event);
              }}
              onPointerMove={(event) => {
                if (pointerRef.current === event.pointerId) steerPlayer(event);
              }}
              onPointerUp={(event) => {
                if (pointerRef.current === event.pointerId) pointerRef.current = null;
              }}
              onPointerCancel={() => { pointerRef.current = null; }}
            />
            {gameRef.current.boss && (
              <div className="game-boss-health" role="progressbar" aria-label="Здоровье босса" aria-valuemin={0} aria-valuemax={gameRef.current.boss.maxHp} aria-valuenow={gameRef.current.boss.hp}>
                <span>БОСС · {BOSS_TYPES[gameRef.current.boss.type].label.toUpperCase()} · ФАЗА {gameRef.current.boss.phase}</span>
                <div><i style={{ width: `${(gameRef.current.boss.hp / gameRef.current.boss.maxHp) * 100}%` }} /></div>
              </div>
            )}
            {mode !== "playing" && (
              <div className={`game-overlay ${tutorialStep !== null && mode === "ready" ? "is-tutorial-overlay" : ""}`}>
                <div className={`game-overlay-card ${tutorialStep !== null && mode === "ready" ? "is-tutorial" : ""}`}>
                  {tutorialStep !== null && mode === "ready" ? (
                    <>
                      <div className="game-overlay-icon"><Gamepad2 size={25} /></div>
                      <p className="game-overlay-kicker">ИНСТРУКТАЖ · {String(tutorialStep + 1).padStart(2, "0")}/{String(TUTORIAL_STEPS.length).padStart(2, "0")}</p>
                      <h2>{TUTORIAL_STEPS[tutorialStep].title}</h2>
                      <p>{TUTORIAL_STEPS[tutorialStep].body}</p>
                      {tutorialStep === 2 && <p className="game-tutorial-ship-ability">Способность {SHIPS[selectedShip].label}: <strong>{SHIPS[selectedShip].ability.label}</strong></p>}
                      <div className="game-tutorial-progress" aria-label={`Шаг ${tutorialStep + 1} из ${TUTORIAL_STEPS.length}`}>
                        {TUTORIAL_STEPS.map((step, index) => <span key={step.title} className={index <= tutorialStep ? "is-active" : ""} />)}
                      </div>
                      <button type="button" className="game-start-button" onClick={() => (tutorialStep === TUTORIAL_STEPS.length - 1 ? startGame() : setTutorialStep(tutorialStep + 1))}>
                        <ArrowRight size={18} />
                        {tutorialStep === TUTORIAL_STEPS.length - 1 ? "Начать полёт" : "Далее"}
                      </button>
                      {tutorialStep < TUTORIAL_STEPS.length - 1 && <button type="button" className="game-tutorial-skip" aria-label="Начать полёт" onClick={startGame}>Пропустить инструктаж</button>}
                    </>
                  ) : (
                    <>
                      <div className="game-overlay-icon"><Gamepad2 size={25} /></div>
                      <p className="game-overlay-kicker">{mode === "over" ? "ПОЛЁТ ЗАВЕРШЁН" : mode === "paused" ? "ПЕРЕДЫШКА В КОСМОСЕ" : "ГОТОВ К СТАРТУ?"}</p>
                      <h2>{mode === "over" ? "Звёзды подождут." : mode === "paused" ? "Пилот, отдыхаем?" : "Покажи космосу класс."}</h2>
                      <p>{mode === "over" ? `Твой счёт — ${Math.floor(gameRef.current.score)}. Ещё один полёт?` : mode === "paused" ? "Астероиды остановлены. Продолжай, когда будешь готов." : "Уклоняйся от астероидов, стреляй лазером и собирай светящиеся звёзды."}</p>
                      <button type="button" className="game-start-button" onClick={mode === "paused" ? togglePause : startGame}>
                        {mode === "over" ? <RotateCcw size={17} /> : mode === "paused" ? <Play size={17} /> : <ArrowRight size={18} />}
                        {mode === "over" ? "Ещё раз" : mode === "paused" ? "Продолжить" : "Начать полёт"}
                      </button>
                      <span className="game-enter-hint">{mode === "paused" ? "нажми P, чтобы продолжить" : "или нажми Enter"}</span>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="game-controls-hint"><span>↑</span><span>↓</span> или W / S <i /> уклоняйся <i /> X — лазер <i /> SPACE — {activeShip.ability.label.toLowerCase()} <i /> P — пауза <i /> F — экран</div>
          </div>
          <div className="game-bottom-bar">
            <div className="game-instruction"><span className="game-key">↑</span><span className="game-key">↓</span><span>Двигайся вверх и вниз</span></div>
            <div className="game-instruction"><span className="game-star-icon">✦</span><span>Серия звёзд = <b>комбо</b></span></div>
            <button type="button" className="game-laser-button" onClick={fireLaser} disabled={mode !== "playing" || laserCooldown > 0} aria-label="Выстрелить лазером">
              <Crosshair size={15} /> ЛАЗЕР {laserCooldown > 0 ? `${laserCooldown.toFixed(1)}с` : "X"}
            </button>
            <button type="button" className={`game-dash-button ${dashCooldown > 0 ? "is-cooling" : ""}`} onClick={activateDash} disabled={mode !== "playing" || dashCooldown > 0} aria-label={`Активировать способность: ${activeShip.ability.label}`}>
              <Zap size={15} /> {activeShip.ability.label} {dashCooldown > 0 ? `${dashCooldown.toFixed(1)}с` : "ГОТОВ"}
            </button>
            <button type="button" className="game-restart" onClick={startGame}><RotateCcw size={15} /> Заново</button>
          </div>
          <div className="game-mobile-pad" aria-label="Сенсорное управление">
            <span>УПРАВЛЕНИЕ</span>
            <button type="button" aria-label="Двигаться вверх" {...holdDirection("up")}><ArrowUp /></button>
            <button type="button" aria-label="Двигаться вниз" {...holdDirection("down")}><ArrowDown /></button>
            <button type="button" aria-label={laserCooldown > 0 ? `Лазер перезаряжается: ${laserCooldown.toFixed(1)} секунд` : "Выстрелить лазером"} onClick={fireLaser} disabled={mode !== "playing" || laserCooldown > 0}><Crosshair /></button>
            <button type="button" aria-label={dashCooldown > 0 ? `${activeShip.ability.label} перезаряжается: ${dashCooldown.toFixed(1)} секунд` : `Активировать: ${activeShip.ability.label}`} onClick={activateDash} disabled={mode !== "playing" || dashCooldown > 0}><Zap /></button>
            <small>Стреляй и уклоняйся</small>
          </div>
        </section>
        <details className="game-audio-settings">
          <summary><Volume2 size={16} /> Звук и музыка</summary>
          <div className="game-audio-grid">
            <label className="game-audio-toggle">
              <input type="checkbox" checked={soundEnabled} onChange={toggleSound} />
              <span>Звуковые эффекты</span>
            </label>
            <label className="game-audio-control">
              <span>Громкость эффектов <output>{Math.round(effectsVolume * 100)}%</output></span>
              <input type="range" min="0" max="1" step="0.05" value={effectsVolume} aria-label="Громкость звуковых эффектов" onChange={(event) => {
                const value = Number(event.target.value);
                effectsVolumeRef.current = value;
                setEffectsVolume(value);
                localStorage.setItem(EFFECTS_VOLUME_KEY, String(value));
              }} />
            </label>
            <label className="game-audio-toggle">
              <input type="checkbox" checked={musicEnabled} onChange={toggleMusic} />
              <span>Фоновая музыка</span>
            </label>
            <label className="game-audio-control">
              <span>Громкость музыки <output>{Math.round(musicVolume * 100)}%</output></span>
              <input type="range" min="0" max="1" step="0.05" value={musicVolume} aria-label="Громкость фоновой музыки" onChange={(event) => {
                const value = Number(event.target.value);
                musicVolumeRef.current = value;
                setMusicVolume(value);
                localStorage.setItem(MUSIC_VOLUME_KEY, String(value));
                if (value === 0) stopMusic();
                else if (musicEnabledRef.current && mode === "playing") startMusic();
              }} />
            </label>
          </div>
          <p>Музыка звучит только во время полёта и останавливается на паузе.</p>
        </details>
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
        <section className="game-missions game-objectives" aria-labelledby="daily-objectives-title">
          <div className="game-missions-heading">
            <div>
              <span className="game-difficulty-label">ОБНОВЛЕНИЕ ЕЖЕДНЕВНО · UTC</span>
              <h2 id="daily-objectives-title">Цели дня</h2>
            </div>
            <span>{dailyTasks.filter((task) => task.completed).length}/{dailyTasks.length} выполнено</span>
          </div>
          <div className="game-mission-list">
            {dailyTasks.map((task) => (
              <article key={task.id} className={`game-mission-card ${task.completed ? "is-complete" : ""}`}>
                <div className="game-mission-copy">
                  <strong>{task.label}</strong>
                  <span>{task.completed ? `Награда +${task.reward} кредитов получена` : `Награда: +${task.reward} кредитов`}</span>
                </div>
                <div className="game-mission-progress" role="progressbar" aria-label={task.label} aria-valuemin={0} aria-valuemax={task.target} aria-valuenow={task.progress}>
                  <span style={{ width: `${(task.progress / task.target) * 100}%` }} />
                </div>
                <small>{task.progress}/{task.target}</small>
              </article>
            ))}
          </div>
        </section>
        <section className="game-missions" aria-labelledby="achievements-title">
          <div className="game-missions-heading">
            <div>
              <span className="game-difficulty-label">ПОСТОЯННЫЙ ПРОГРЕСС ПИЛОТА</span>
              <h2 id="achievements-title">Достижения</h2>
            </div>
            <span>{pilotProfile.unlocked.length}/{ACHIEVEMENT_DEFS.length} открыто</span>
          </div>
          <div className="game-mission-list">
            {ACHIEVEMENT_DEFS.map((achievement) => {
              const progress = Math.min(achievement.target, pilotProfile[achievement.counter]);
              const unlocked = pilotProfile.unlocked.includes(achievement.id);
              return (
                <article key={achievement.id} className={`game-mission-card ${unlocked ? "is-complete" : ""}`}>
                  <div className="game-mission-copy">
                    <strong>{achievement.label}</strong>
                    <span>{unlocked ? `Открыто · +${achievement.reward} кредитов` : `${achievement.detail} · награда +${achievement.reward} кредитов`}</span>
                  </div>
                  <div className="game-mission-progress" role="progressbar" aria-label={achievement.label} aria-valuemin={0} aria-valuemax={achievement.target} aria-valuenow={progress}>
                    <span style={{ width: `${(progress / achievement.target) * 100}%` }} />
                  </div>
                  <small>{progress}/{achievement.target}</small>
                </article>
              );
            })}
          </div>
        </section>
        <section className="game-leaderboard" aria-labelledby="game-leaderboard-title">
          <div className="game-records-heading">
            <div>
              <span className="game-difficulty-label">ЛУЧШИЕ РЕЗУЛЬТАТЫ ИГРОКОВ</span>
              <h2 id="game-leaderboard-title">Общий рейтинг</h2>
            </div>
            <span>ТОП 20</span>
          </div>
          <div className="game-leaderboard-profile">
            <label>
              ТВОЙ НИК В РЕЙТИНГЕ
              <input
                type="text"
                value={pilotName}
                maxLength={24}
                aria-label="Ник для общего рейтинга"
                onChange={(event) => {
                  const name = event.target.value.slice(0, 24);
                  setPilotName(name);
                  if (name.trim()) localStorage.setItem(PLAYER_NAME_KEY, name.trim());
                }}
                onBlur={() => {
                  const existing = leaderboard.find((entry) => entry.player_id === playerId);
                  const nickname = pilotName.trim();
                  if (!existing || nickname.length < 2 || existing.nickname === nickname) return;
                  setLeaderboardStatus("updating-name");
                  submitGameScore({
                    player_id: playerId,
                    nickname,
                    score: existing.score,
                    difficulty: existing.difficulty,
                    ship: existing.ship,
                  })
                    .then(() => getGameLeaderboard())
                    .then((entries) => {
                      setLeaderboard(entries);
                      setLeaderboardStatus("renamed");
                    })
                    .catch(() => setLeaderboardStatus("error"));
                }}
              />
            </label>
            <p aria-live="polite">
              {leaderboardStatus === "loading" ? "Загружаем рейтинг…" :
                leaderboardStatus === "unavailable" ? "Общий рейтинг временно недоступен." :
                    leaderboardStatus === "submitting" ? "Отправляем лучший результат…" :
                    leaderboardStatus === "submitted" ? "Результат опубликован в общем рейтинге." :
                      leaderboardStatus === "updating-name" ? "Обновляем ник…" :
                        leaderboardStatus === "renamed" ? "Ник в общем рейтинге обновлён." :
                      leaderboardStatus === "name-required" ? "Укажи ник минимум из двух символов, чтобы отправить результат." :
                        leaderboardStatus === "error" ? "Не удалось отправить результат. Личный рекорд сохранён в этом браузере." :
                          "Лучший результат отправляется автоматически после полёта."}
            </p>
          </div>
          {leaderboard.length ? (
            <ol className="game-leaderboard-list">
              {leaderboard.map((entry, index) => (
                <li key={entry.player_id} className={entry.player_id === playerId ? "is-you" : ""}>
                  <span className="game-leaderboard-rank">{String(index + 1).padStart(2, "0")}</span>
                  <strong className="game-leaderboard-score">{entry.score.toLocaleString("ru-RU")}</strong>
                  <span className="game-leaderboard-pilot">
                    <strong>{entry.nickname}</strong>
                    <small>{DIFFICULTIES[entry.difficulty]?.label || "Пилот"} · {SHIPS[entry.ship]?.label || "Курьер"}</small>
                  </span>
                  {entry.player_id === playerId && <span className="game-leaderboard-you">ТЫ</span>}
                </li>
              ))}
            </ol>
          ) : leaderboardStatus === "ready" ? (
            <p className="game-record-empty">Таблица пока пуста. Закончи полёт, чтобы занять первое место!</p>
          ) : null}
          <p className="game-leaderboard-privacy">В рейтинге отображается только выбранный ник. Не указывай настоящее имя.</p>
        </section>
        <section className="game-records" aria-labelledby="game-records-title">
          <div className="game-records-heading">
            <div>
              <span className="game-difficulty-label">СОХРАНЕНО В ЭТОМ БРАУЗЕРЕ</span>
              <h2 id="game-records-title">Лётный журнал</h2>
            </div>
            <span>ТОП 5</span>
          </div>
          {records.length ? (
            <ol className="game-record-list">
              {records.map((record, index) => (
                <li key={`${record.playedAt}-${index}`} className={index === 0 ? "is-record" : ""}>
                  <span className="game-record-rank">{String(index + 1).padStart(2, "0")}</span>
                  <strong>{record.score.toLocaleString("ru-RU")}</strong>
                  <span className="game-record-mode">{DIFFICULTIES[record.difficulty]?.label || "Пилот"}</span>
                  <time dateTime={record.playedAt}>{new Date(record.playedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}</time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="game-record-empty">Закончи первый полёт — и здесь появится твой результат.</p>
          )}
        </section>
        <footer className="game-footer-note"><span>0x00 SPACE</span><i /> одна маленькая игра о большом космосе</footer>
      </main>
      <Footer />
    </div>
  );
}
