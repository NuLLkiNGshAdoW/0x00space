import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Gamepad2, RotateCcw, Sparkles } from "lucide-react";
import Seo from "../components/Seo.jsx";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";

const WIDTH = 960;
const HEIGHT = 540;
const BEST_KEY = "space-runner-best";

function makeGame() {
  return {
    mode: "ready",
    playerY: HEIGHT / 2,
    score: 0,
    best: Number(localStorage.getItem(BEST_KEY)) || 0,
    lives: 3,
    elapsed: 0,
    spawnIn: 0.7,
    starIn: 1.5,
    obstacles: [],
    stars: [],
    particles: [],
    invincible: 0,
    lastTime: 0,
    lastUi: 0,
  };
}

function pixel(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function drawShip(ctx, x, y, time, flashing) {
  if (flashing && Math.floor(time * 12) % 2) return;
  const py = Math.round(y);
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
  pixel(ctx, x - 32 - Math.random() * 8, py - 4, 10, 4, "#f3bd59");
  pixel(ctx, x - 37 - Math.random() * 11, py - 3, 9, 2, "#ff7d74");
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

  game.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life / 0.6);
    pixel(ctx, p.x, p.y, 4, 4, p.color);
  });
  ctx.globalAlpha = 1;
  drawShip(ctx, 143, game.playerY, time, game.invincible > 0);
}

export default function GamePage() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const keysRef = useRef(new Set());
  const [mode, setMode] = useState("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0);
  const [lives, setLives] = useState(3);

  if (!gameRef.current) gameRef.current = makeGame();

  const startGame = useCallback(() => {
    const game = gameRef.current;
    Object.assign(game, makeGame(), { mode: "playing", best: game.best, lastTime: 0 });
    setMode("playing");
    setScore(0);
    setLives(3);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return undefined;
    let frame;
    const game = gameRef.current;
    const tick = (timestamp) => {
      const dt = Math.min((timestamp - (game.lastTime || timestamp)) / 1000, 0.04);
      game.lastTime = timestamp;
      if (game.mode === "playing") {
        game.elapsed += dt;
        const keys = keysRef.current;
        const up = keys.has("ArrowUp") || keys.has("w") || keys.has("W") || keys.has("touch-up");
        const down = keys.has("ArrowDown") || keys.has("s") || keys.has("S") || keys.has("touch-down");
        if (up) game.playerY -= 310 * dt;
        if (down) game.playerY += 310 * dt;
        game.playerY = Math.max(58, Math.min(477, game.playerY));
        game.score += dt * 12;
        game.spawnIn -= dt;
        game.starIn -= dt;
        game.invincible = Math.max(0, game.invincible - dt);

        if (game.spawnIn <= 0) {
          const difficulty = Math.min(game.elapsed / 80, 0.42);
          game.obstacles.push({
            x: WIDTH + 42,
            y: 65 + Math.random() * 405,
            r: 17 + Math.random() * 14,
            speed: 255 + Math.random() * 100 + game.elapsed * 1.15,
            spin: Math.random() * Math.PI,
            spinSpeed: (Math.random() - 0.5) * 2,
          });
          game.spawnIn = 0.95 - difficulty + Math.random() * 0.55;
        }
        if (game.starIn <= 0) {
          game.stars.push({ x: WIDTH + 20, y: 55 + Math.random() * 410, speed: 270 + game.elapsed * 0.8 });
          game.starIn = 1.1 + Math.random() * 1.2;
        }
        game.obstacles.forEach((rock) => {
          rock.x -= rock.speed * dt;
          rock.spin += rock.spinSpeed * dt;
          if (!rock.hit && game.invincible <= 0 && Math.abs(rock.x - 143) < rock.r + 20 && Math.abs(rock.y - game.playerY) < rock.r + 24) {
            rock.hit = true;
            game.lives -= 1;
            game.invincible = 1.15;
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
        game.stars.forEach((star) => {
          star.x -= star.speed * dt;
          if (!star.hit && Math.abs(star.x - 143) < 28 && Math.abs(star.y - game.playerY) < 32) {
            star.hit = true;
            game.score += 50;
            game.particles.push({ x: star.x, y: star.y, dx: 0, dy: -60, life: 0.6, color: "#ffe782" });
          }
        });
        game.obstacles = game.obstacles.filter((rock) => rock.x > -70 && !rock.hit);
        game.stars = game.stars.filter((star) => star.x > -30 && !star.hit);
        game.particles.forEach((p) => {
          p.x += (p.dx || 0) * dt;
          p.y += (p.dy || 0) * dt;
          p.life -= dt;
        });
        game.particles = game.particles.filter((p) => p.life > 0);
        if (timestamp - game.lastUi > 100) {
          const currentScore = Math.floor(game.score);
          setScore(currentScore);
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
  }, []);

  useEffect(() => {
    const onBlur = () => keysRef.current.clear();
    const onKeyDown = (event) => {
      if (["ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
      keysRef.current.add(event.key);
      if ((event.key === "Enter" || event.key === " ") && gameRef.current.mode !== "playing") startGame();
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
  }, [startGame]);

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

  return (
    <div className="min-h-screen">
      <Seo title="Космический забег — 0x00 SPACE" description="Пиксельная космическая игра: уклоняйся от астероидов и собирай звёзды." path="/game" />
      <Navbar />
      <main className="game-page container-app py-10 sm:py-14">
        <header className="game-heading mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow">MINI GAME · 001</span>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">Космический <span>забег</span></h1>
            <p className="mt-3 max-w-xl text-sm text-mute sm:text-base">Пилот пролетает сквозь пояс астероидов. Уклоняйся, собирай звёзды и побей свой рекорд.</p>
          </div>
          <div className="game-record"><Sparkles size={17} /> РЕКОРД <strong>{best}</strong></div>
        </header>

        <section className="game-shell" aria-label="Космический забег">
          <div className="game-hud">
            <div className="game-hud-label"><span className="game-live-dot" /> SCORE <strong>{score.toString().padStart(5, "0")}</strong></div>
            <div className="game-hud-label game-lives" aria-label={`Осталось жизней: ${lives}`}>{Array.from({ length: 3 }, (_, i) => <span key={i} className={i < lives ? "life-lit" : "life-lost"}>♥</span>)}</div>
            <div className="game-hud-label game-best-mobile">BEST <strong>{best}</strong></div>
          </div>
          <div className="game-stage">
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="Игровое поле: двигайтесь вверх и вниз, уклоняйтесь от астероидов и собирайте звёзды" />
            {mode !== "playing" && (
              <div className="game-overlay">
                <div className="game-overlay-card">
                  <div className="game-overlay-icon"><Gamepad2 size={25} /></div>
                  <p className="game-overlay-kicker">{mode === "over" ? "ПОЛЁТ ЗАВЕРШЁН" : "ГОТОВ К СТАРТУ?"}</p>
                  <h2>{mode === "over" ? "Звёзды подождут." : "Покажи космосу класс."}</h2>
                  <p>{mode === "over" ? `Твой счёт — ${Math.floor(gameRef.current.score)}. Ещё один полёт?` : "Пролетай между астероидами и собирай светящиеся звёзды."}</p>
                  <button type="button" className="game-start-button" onClick={startGame}>
                    {mode === "over" ? <RotateCcw size={17} /> : <ArrowRight size={18} />}
                    {mode === "over" ? "Ещё раз" : "Начать полёт"}
                  </button>
                  <span className="game-enter-hint">или нажми Enter</span>
                </div>
              </div>
            )}
            <div className="game-controls-hint"><span>↑</span><span>↓</span> или W / S <i /> уклоняйся от астероидов</div>
          </div>
          <div className="game-bottom-bar">
            <div className="game-instruction"><span className="game-key">↑</span><span className="game-key">↓</span><span>Двигайся вверх и вниз</span></div>
            <div className="game-instruction"><span className="game-star-icon">✦</span><span>Звезда = <b>+50 очков</b></span></div>
            <button type="button" className="game-restart" onClick={startGame}><RotateCcw size={15} /> Заново</button>
          </div>
        </section>
        <div className="game-mobile-pad" aria-label="Сенсорное управление">
          <span>УПРАВЛЕНИЕ</span>
          <button type="button" aria-label="Двигаться вверх" {...holdDirection("up")}><ArrowUp /></button>
          <button type="button" aria-label="Двигаться вниз" {...holdDirection("down")}><ArrowDown /></button>
          <small>Удерживай для движения</small>
        </div>
        <footer className="game-footer-note"><span>0x00 SPACE</span><i /> одна маленькая игра о большом космосе</footer>
      </main>
      <Footer />
    </div>
  );
}
