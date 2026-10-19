/**
 * In-Browser Animated Video Renderer Engine for Tier List Maker
 *
 * Uses HTML5 Canvas + Web Audio API + MediaRecorder to record
 * high-framerate reveal animations directly in client memory.
 * Zero server cost, zero privacy leakage.
 */

import type { TierRow, Item } from "@/types";

export interface VideoExportOptions {
  boardTitle: string;
  authorName?: string;
  tiers: TierRow[];
  ratio: "9:16" | "1:1" | "16:9";
  speed: "fast" | "normal" | "dramatic";
  withAudio: boolean;
  withWatermark: boolean;
  onProgress?: (progress: number, currentFrame: number, totalFrames: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface ItemPlacement {
  item: Item;
  tierId: string;
  tierLabel: string;
  isTopTier: boolean;
  targetX: number;
  targetY: number;
  targetWidth: number;
  targetHeight: number;
  revealFrame: number;
}

// Convert Tailwind gradient string to Canvas LinearGradient
function getTierGradient(
  ctx: CanvasRenderingContext2D,
  colorClass: string,
  x: number,
  y: number,
  w: number,
  h: number
): CanvasGradient {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);

  if (colorClass.includes("rose") || colorClass.includes("red")) {
    grad.addColorStop(0, "#f43f5e");
    grad.addColorStop(1, "#e11d48");
  } else if (colorClass.includes("orange")) {
    grad.addColorStop(0, "#fb923c");
    grad.addColorStop(1, "#ea580c");
  } else if (colorClass.includes("amber") || colorClass.includes("yellow")) {
    grad.addColorStop(0, "#fbbf24");
    grad.addColorStop(1, "#d97706");
  } else if (colorClass.includes("emerald") || colorClass.includes("green")) {
    grad.addColorStop(0, "#34d399");
    grad.addColorStop(1, "#059669");
  } else if (colorClass.includes("blue") || colorClass.includes("cyan")) {
    grad.addColorStop(0, "#60a5fa");
    grad.addColorStop(1, "#2563eb");
  } else if (colorClass.includes("violet") || colorClass.includes("purple")) {
    grad.addColorStop(0, "#a78bfa");
    grad.addColorStop(1, "#7c3aed");
  } else if (colorClass.includes("pink")) {
    grad.addColorStop(0, "#f472b6");
    grad.addColorStop(1, "#db2777");
  } else {
    grad.addColorStop(0, "#71717a");
    grad.addColorStop(1, "#3f3f46");
  }
  return grad;
}

/** Easing function: Back-out for punchy landing bounce */
function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/** Preload all item images into in-memory Image elements */
async function preloadImages(items: Item[]): Promise<Map<string, HTMLImageElement>> {
  const imageMap = new Map<string, HTMLImageElement>();
  const promises: Promise<void>[] = [];

  for (const item of items) {
    if (!item.imageUrl || imageMap.has(item.imageUrl)) continue;

    const p = new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        imageMap.set(item.imageUrl!, img);
        resolve();
      };
      img.onerror = () => {
        resolve(); // resolve anyway to avoid breaking video render
      };
      img.src = item.imageUrl!;
    });
    promises.push(p);
  }

  await Promise.all(promises);
  return imageMap;
}

export async function renderAnimatedTierListVideo(
  options: VideoExportOptions
): Promise<{ blob: Blob; url: string; mimeType: string }> {
  const {
    boardTitle,
    authorName = "Creator",
    tiers,
    ratio,
    speed,
    withAudio,
    withWatermark,
    onProgress,
  } = options;

  // 1. Dimensions setup based on aspect ratio
  let width = 1080;
  let height = 1920; // 9:16 default for TikTok/Shorts
  if (ratio === "1:1") {
    width = 1080;
    height = 1080;
  } else if (ratio === "16:9") {
    width = 1920;
    height = 1080;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not initialize 2D canvas context.");

  // Preload images
  const allItems = tiers.flatMap((t) => t.items);
  const images = await preloadImages(allItems);

  // 2. Setup Web Audio API Destination if audio is requested
  let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;

  if (withAudio && typeof window !== "undefined") {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        audioDest = audioCtx.createMediaStreamDestination();
      }
    } catch (e) {
      console.warn("AudioContext initialization skipped:", e);
    }
  }

  function playDropSound(time: number, isTopTier: boolean) {
    if (!audioCtx || !audioDest) return;
    try {
      const now = audioCtx.currentTime + time;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = isTopTier ? "triangle" : "sine";
      const startFreq = isTopTier ? 523.25 : 220; // C5 vs A3
      const endFreq = isTopTier ? 659.25 : 80;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(audioDest);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.16);

      // Fanfare chime chord on S-Tier
      if (isTopTier) {
        [659.25, 783.99, 1046.5].forEach((freq, idx) => {
          const chimeOsc = audioCtx!.createOscillator();
          const chimeGain = audioCtx!.createGain();
          chimeOsc.type = "sine";
          chimeOsc.frequency.setValueAtTime(freq, now + 0.05 * idx);
          chimeGain.gain.setValueAtTime(0.18, now + 0.05 * idx);
          chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          chimeOsc.connect(chimeGain);
          chimeGain.connect(audioDest!);
          chimeGain.connect(audioCtx!.destination);
          chimeOsc.start(now + 0.05 * idx);
          chimeOsc.stop(now + 0.85);
        });
      }
    } catch {}
  }

  // 3. Layout geometry calculation
  const paddingX = ratio === "16:9" ? 120 : 64;
  const headerTop = ratio === "9:16" ? 140 : ratio === "1:1" ? 80 : 90;
  const boardTop = ratio === "9:16" ? 330 : ratio === "1:1" ? 190 : 210;
  const boardBottom = ratio === "9:16" ? height - 200 : ratio === "1:1" ? height - 120 : height - 120;
  const availableBoardHeight = boardBottom - boardTop;
  const availableBoardWidth = width - paddingX * 2;

  const rowCount = Math.max(tiers.length, 1);
  const rowGap = ratio === "9:16" ? 16 : 12;
  const rowHeight = Math.min(
    Math.floor((availableBoardHeight - (rowCount - 1) * rowGap) / rowCount),
    ratio === "9:16" ? 180 : 130
  );

  const badgeWidth = ratio === "9:16" ? 150 : ratio === "1:1" ? 130 : 160;
  const itemsAreaX = paddingX + badgeWidth + 14;
  const itemsAreaWidth = availableBoardWidth - badgeWidth - 14;

  // 4. Calculate Item Placements & Reveal Sequence (Bottom-to-Top Countdown)
  const FPS = 30;
  const introDuration = speed === "fast" ? 0.6 : speed === "normal" ? 1.0 : 1.4;
  const itemDelaySec = speed === "fast" ? 0.28 : speed === "normal" ? 0.42 : 0.65;
  const topTierPauseSec = speed === "fast" ? 0.8 : speed === "normal" ? 1.4 : 2.0;
  const outroDuration = speed === "fast" ? 2.0 : speed === "normal" ? 2.8 : 3.5;

  const placements: ItemPlacement[] = [];
  let currentSec = introDuration;

  // Iterate tiers from bottom (lowest tier) up to S-tier
  const reversedTierIndices = [...tiers.keys()].reverse();

  for (const tIdx of reversedTierIndices) {
    const tier = tiers[tIdx];
    const isTopTier = tIdx === 0;

    if (isTopTier && placements.length > 0) {
      currentSec += topTierPauseSec;
    }

    const rowY = boardTop + tIdx * (rowHeight + rowGap);
    const itemCardSize = Math.max(rowHeight - 16, 60);
    const itemGap = 10;
    const maxItemsPerRow = Math.floor((itemsAreaWidth - 12) / (itemCardSize + itemGap));

    tier.items.forEach((item, itemIdx) => {
      const col = itemIdx % maxItemsPerRow;
      const rowInTier = Math.floor(itemIdx / maxItemsPerRow);

      const targetX = itemsAreaX + 8 + col * (itemCardSize + itemGap);
      const targetY = rowY + 8 + rowInTier * (itemCardSize + itemGap);

      placements.push({
        item,
        tierId: tier.id,
        tierLabel: tier.label,
        isTopTier,
        targetX,
        targetY,
        targetWidth: itemCardSize,
        targetHeight: itemCardSize,
        revealFrame: Math.round(currentSec * FPS),
      });

      currentSec += itemDelaySec;
    });
  }

  const totalFrames = Math.round((currentSec + outroDuration) * FPS);

  // 5. Setup MediaRecorder with cross-browser mime types
  const stream = canvas.captureStream(FPS);
  if (audioDest) {
    const audioTrack = audioDest.stream.getAudioTracks()[0];
    if (audioTrack) stream.addTrack(audioTrack);
  }

  const mimeTypes = [
    'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
    "video/mp4",
    'video/webm; codecs="vp9, opus"',
    'video/webm; codecs="vp8, opus"',
    "video/webm",
  ];
  let selectedMime = "video/webm";
  for (const mime of mimeTypes) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      selectedMime = mime;
      break;
    }
  }

  const recordedChunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: selectedMime,
    videoBitsPerSecond: ratio === "9:16" ? 7_000_000 : 5_500_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  recorder.start();

  // Active particle explosions
  const particles: Particle[] = [];

  // 6. Deterministic Render Loop
  for (let frame = 0; frame < totalFrames; frame++) {
    // Trigger audio SFX and particles on exact reveal frame
    placements.forEach((p) => {
      if (frame === p.revealFrame) {
        playDropSound(0, p.isTopTier);

        // Spawn golden spark particles on top tier drop
        if (p.isTopTier) {
          for (let k = 0; k < 36; k++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 8;
            particles.push({
              x: p.targetX + p.targetWidth / 2,
              y: p.targetY + p.targetHeight / 2,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 2,
              size: 3 + Math.random() * 5,
              color: Math.random() > 0.5 ? "#fbbf24" : "#f43f5e",
              alpha: 1,
              life: 0,
              maxLife: 25 + Math.random() * 15,
            });
          }
        }
      }
    });

    // --- DRAW BACKGROUND ---
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, width, height);

    // Subtle Radial Vignette & Glow
    const bgGlow = ctx.createRadialGradient(
      width / 2,
      height * 0.35,
      100,
      width / 2,
      height * 0.4,
      width * 0.75
    );
    bgGlow.addColorStop(0, "rgba(99, 102, 241, 0.15)");
    bgGlow.addColorStop(1, "rgba(9, 9, 11, 0.95)");
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, width, height);

    // --- DRAW HEADER ---
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Header Title
    ctx.font = `900 ${ratio === "9:16" ? "48px" : ratio === "1:1" ? "36px" : "44px"} system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 12;
    ctx.fillText(boardTitle.toUpperCase(), width / 2, headerTop);

    // Subtitle Creator Tag
    ctx.font = `600 ${ratio === "9:16" ? "24px" : "20px"} system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "#a1a1aa";
    ctx.shadowBlur = 0;
    ctx.fillText(`Ranked by @${authorName} • Tier List Maker`, width / 2, headerTop + 48);
    ctx.restore();

    // --- DRAW TIER BOARD ROWS ---
    tiers.forEach((tier, tIdx) => {
      const rowY = boardTop + tIdx * (rowHeight + rowGap);

      // Row background panel
      ctx.save();
      ctx.fillStyle = "rgba(24, 24, 27, 0.85)";
      ctx.strokeStyle = "rgba(63, 63, 70, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(paddingX, rowY, availableBoardWidth, rowHeight, 16);
      ctx.fill();
      ctx.stroke();

      // Tier Label Badge
      const tierGrad = getTierGradient(ctx, tier.color, paddingX, rowY, badgeWidth, rowHeight);
      ctx.fillStyle = tierGrad;
      ctx.beginPath();
      ctx.roundRect(paddingX, rowY, badgeWidth, rowHeight, [16, 0, 0, 16]);
      ctx.fill();

      // Tier Label Text
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${rowHeight > 100 ? "34px" : "28px"} system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 6;
      ctx.fillText(tier.label, paddingX + badgeWidth / 2, rowY + rowHeight / 2);
      ctx.restore();
    });

    // --- DRAW PLACED ITEMS ---
    placements.forEach((p) => {
      if (frame < p.revealFrame) return; // Not yet revealed

      const framesSinceReveal = frame - p.revealFrame;
      const animProgress = Math.min(framesSinceReveal / 12, 1); // 12 frames = 0.4s arrival

      let scale = 1.0;
      let alpha = 1.0;
      let offsetY = 0;

      if (animProgress < 1) {
        const ease = easeOutBack(animProgress);
        scale = 1.6 - (1.6 - 1.0) * ease;
        alpha = animProgress;
        offsetY = (1 - ease) * -120; // Drops from above
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      const cx = p.targetX + p.targetWidth / 2;
      const cy = p.targetY + p.targetHeight / 2 + offsetY;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-p.targetWidth / 2, -p.targetHeight / 2);

      // Card Background / Shadow
      ctx.shadowColor = p.isTopTier ? "rgba(251, 191, 36, 0.6)" : "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = p.isTopTier ? 16 : 8;

      ctx.beginPath();
      ctx.roundRect(0, 0, p.targetWidth, p.targetHeight, 10);
      ctx.fillStyle = "#18181b";
      ctx.fill();

      // Item Image or Text Card
      const cachedImg = p.item.imageUrl ? images.get(p.item.imageUrl) : null;
      if (cachedImg) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, p.targetWidth, p.targetHeight, 10);
        ctx.clip();
        ctx.drawImage(cachedImg, 0, 0, p.targetWidth, p.targetHeight);
        ctx.restore();
      } else {
        // Text fallback tile
        ctx.fillStyle = "rgba(99, 102, 241, 0.25)";
        ctx.beginPath();
        ctx.roundRect(0, 0, p.targetWidth, p.targetHeight, 10);
        ctx.fill();

        ctx.fillStyle = "#f4f4f5";
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.item.name, p.targetWidth / 2, p.targetHeight / 2, p.targetWidth - 8);
      }

      // Border outline
      ctx.strokeStyle = p.isTopTier ? "rgba(251, 191, 36, 0.9)" : "rgba(82, 82, 91, 0.7)";
      ctx.lineWidth = p.isTopTier ? 2.5 : 1.5;
      ctx.stroke();

      ctx.restore();
    });

    // --- DRAW & UPDATE PARTICLES ---
    for (let i = particles.length - 1; i >= 0; i--) {
      const part = particles[i];
      part.x += part.vx;
      part.y += part.vy;
      part.vy += 0.22; // Gravity
      part.life++;
      part.alpha = Math.max(0, 1 - part.life / part.maxLife);

      if (part.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = part.alpha;
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- DRAW WATERMARK / BRANDING ---
    if (withWatermark) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const waterY = height - (ratio === "9:16" ? 90 : 50);

      ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "#71717a";
      ctx.fillText("⚡ TIER LIST MAKER • tierlistmaker.app", width / 2, waterY);
      ctx.restore();
    }

    // Report progress callback
    if (onProgress && frame % 10 === 0) {
      onProgress(Math.round((frame / totalFrames) * 100), frame, totalFrames);
    }

    // Yield back to browser microtask loop to allow MediaRecorder frame capture
    await new Promise((resolve) => setTimeout(resolve, 1000 / FPS));
  }

  // 7. Stop Recording & Finalize Blob
  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      if (audioCtx) audioCtx.close();
      const videoBlob = new Blob(recordedChunks, { type: selectedMime });
      const videoUrl = URL.createObjectURL(videoBlob);
      if (onProgress) onProgress(100, totalFrames, totalFrames);
      resolve({ blob: videoBlob, url: videoUrl, mimeType: selectedMime });
    };

    recorder.onerror = (err) => {
      if (audioCtx) audioCtx.close();
      reject(err);
    };

    recorder.stop();
  });
}
