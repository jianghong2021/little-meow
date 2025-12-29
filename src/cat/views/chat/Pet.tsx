import { onMount, onCleanup, createEffect } from "solid-js";

interface PetProps {
  emotion: PetEmotion;
  size?: number;
}

export function Pet(props: PetProps) {
  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let raf = 0;
  let start = performance.now();

  const size = () => props.size ?? 80;

  onMount(() => {
    canvas.width = size();
    canvas.height = size();
    ctx = canvas.getContext("2d")!;
    loop();
  });

  onCleanup(() => {
    cancelAnimationFrame(raf);
  });

  // 情绪变化时重置时间，让动画“有反应”
  createEffect(() => {
    props.emotion;
    start = performance.now();
  });

  function loop() {
    const now = performance.now();
    const t = (now - start) / 1000;
    draw(t);
    raf = requestAnimationFrame(loop);
  }

  function draw(t: number) {
    ctx.clearRect(0, 0, size(), size());

    const breathe = Math.sin(t * 2) * 2; // 呼吸
    const shake =
      props.emotion === "angry"
        ? Math.sin(t * 20) * 2
        : props.emotion === "speaking"
        ? Math.sin(t * 12) * 1.2
        : 0;

    ctx.save();
    ctx.translate(shake, breathe);

    drawBody(breathe);
    drawFace(t);

    ctx.restore();
  }

  function drawBody(breathe: number) {
    const r = size() / 2 - 4 + breathe * 0.3;
    ctx.fillStyle = "#ff5c93";

    ctx.beginPath();
    ctx.arc(size() / 2, size() / 2, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawFace(t: number) {
    const cx = size() / 2;
    const cy = size() / 2;

    drawEyes(t, cx, cy);
    drawMouth(cx, cy);
  }

  function drawEyes(t: number, cx: number, cy: number) {
    // 眨眼：每 4 秒一次
    const blink =
      Math.abs(Math.sin(t * Math.PI / 2)) > 0.95 ? 1 : 0;

    ctx.fillStyle = "#000";
    ctx.beginPath();

    if (blink) {
      ctx.rect(cx - 15, cy - 6, 6, 1);
      ctx.rect(cx + 9, cy - 6, 6, 1);
    } else {
      ctx.arc(cx - 12, cy - 6, 3, 0, Math.PI * 2);
      ctx.arc(cx + 12, cy - 6, 3, 0, Math.PI * 2);
    }

    ctx.fill();
  }

  function drawMouth(cx: number, cy: number) {
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();

    switch (props.emotion) {
      case "happy":
        ctx.arc(cx, cy + 4, 12, 0, Math.PI);
        break;

      case "sad":
        ctx.arc(cx, cy + 16, 12, Math.PI, Math.PI * 2);
        break;

      case "angry":
        ctx.moveTo(cx - 10, cy + 10);
        ctx.lineTo(cx + 10, cy + 10);
        break;

      case "thinking":
        ctx.moveTo(cx - 6, cy + 8);
        ctx.lineTo(cx + 6, cy + 8);
        break;

      case "speaking":
        ctx.rect(cx - 6, cy + 6, 12, 6);
        break;

      default:
        ctx.moveTo(cx - 6, cy + 10);
        ctx.lineTo(cx + 6, cy + 10);
    }

    ctx.stroke();
  }

  return (
    <canvas
      ref={canvas}
      class="pet-canvas"
    />
  );
}
