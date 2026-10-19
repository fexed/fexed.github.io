(() => {
  const starCanvas = document.getElementById("starfield");
  const moonCanvas = document.getElementById("moon");
  const phaseLabel = document.getElementById("moon-phase");
  const dateLabel = document.getElementById("moon-date");
  const motionControl = document.getElementById("motion-control");
  const motionButton = document.getElementById("motion-button");
  const motionStatus = document.getElementById("motion-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!(starCanvas instanceof HTMLCanvasElement) || !(moonCanvas instanceof HTMLCanvasElement)) {
    return;
  }

  const starContext = starCanvas.getContext("2d");
  const moonContext = moonCanvas.getContext("2d");
  if (!starContext || !moonContext) {
    return;
  }

  let width = 0;
  let height = 0;
  let stars = [];
  let pointer = { x: 0, y: 0 };
  let offset = { x: 0, y: 0 };
  let animationFrame = 0;

  function randomGenerator(seed) {
    let value = seed >>> 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function resizeStarfield() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    starCanvas.width = Math.round(width * ratio);
    starCanvas.height = Math.round(height * ratio);
    starContext.setTransform(ratio, 0, 0, ratio, 0, 0);

    const random = randomGenerator(19082026);
    const count = Math.min(220, Math.max(90, Math.round((width * height) / 6200)));
    stars = Array.from({ length: count }, () => ({
      x: random() * width,
      y: random() * height,
      radius: 0.35 + random() * 1.05,
      alpha: 0.22 + random() * 0.62,
      tint: random() > 0.82 ? "#b9ccff" : "#f1f4ff",
    }));
    drawStarfield();
  }

  function drawStarfield() {
    if (!starContext) return;
    starContext.clearRect(0, 0, width, height);
    for (const star of stars) {
      const x = (star.x + offset.x * star.radius * 2 + width) % width;
      const y = (star.y + offset.y * star.radius * 2 + height) % height;
      starContext.globalAlpha = star.alpha;
      starContext.fillStyle = star.tint;
      starContext.beginPath();
      starContext.arc(x, y, star.radius, 0, Math.PI * 2);
      starContext.fill();
    }
    starContext.globalAlpha = 1;
  }

  function animate() {
    if (reducedMotion.matches) {
      offset = { x: 0, y: 0 };
      drawStarfield();
      animationFrame = 0;
      return;
    }
    offset.x += (pointer.x - offset.x) * 0.035;
    offset.y += (pointer.y - offset.y) * 0.035;
    drawStarfield();
    animationFrame = window.requestAnimationFrame(animate);
  }

  function startAnimation() {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    if (!reducedMotion.matches) animationFrame = window.requestAnimationFrame(animate);
    else drawStarfield();
  }

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || reducedMotion.matches) return;
    pointer = {
      x: ((event.clientX / width) - 0.5) * 2,
      y: ((event.clientY / height) - 0.5) * 2,
    };
    if (!animationFrame) startAnimation();
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    pointer = { x: 0, y: 0 };
  });
  window.addEventListener("resize", resizeStarfield, { passive: true });
  reducedMotion.addEventListener("change", startAnimation);
  resizeStarfield();
  startAnimation();

  const orientationAvailable =
    window.matchMedia("(pointer: coarse)").matches && "DeviceOrientationEvent" in window;
  if (orientationAvailable && motionControl && motionButton && motionStatus) {
    motionControl.hidden = false;

    window.addEventListener("deviceorientation", (event) => {
      if (reducedMotion.matches || event.beta === null || event.gamma === null) return;
      pointer = {
        x: Math.max(-1, Math.min(1, event.gamma / 35)),
        y: Math.max(-1, Math.min(1, event.beta / 45)),
      };
      if (!animationFrame) startAnimation();
    }, { passive: true });

    motionButton.addEventListener("click", async () => {
      const orientationEvent = window.DeviceOrientationEvent;
      if (typeof orientationEvent.requestPermission === "function") {
        try {
          const permission = await orientationEvent.requestPermission();
          if (permission !== "granted") {
            motionStatus.textContent = "Motion permission was not granted.";
            return;
          }
        } catch (error) {
          motionStatus.textContent = "Motion could not be enabled on this device.";
          return;
        }
      }
      motionButton.hidden = true;
      motionStatus.textContent = "Move your device to explore.";
    });
  }

  const lunarMonth = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const now = new Date();
  const daysSinceNewMoon = (now.getTime() - knownNewMoon) / 86400000;
  const phase = ((daysSinceNewMoon % lunarMonth) + lunarMonth) % lunarMonth / lunarMonth;
  const illumination = (1 - Math.cos(phase * Math.PI * 2)) / 2;

  function describePhase(value) {
    if (value < 0.035 || value > 0.965) return "New moon";
    if (value < 0.22) return "Waxing crescent";
    if (value < 0.28) return "First quarter";
    if (value < 0.47) return "Waxing gibbous";
    if (value < 0.53) return "Full moon";
    if (value < 0.72) return "Waning gibbous";
    if (value < 0.78) return "Last quarter";
    return "Waning crescent";
  }

  phaseLabel.textContent = `${describePhase(phase)} · ${Math.round(illumination * 100)}%`;
  dateLabel.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(now);
  moonCanvas.setAttribute("aria-label", `${describePhase(phase)}, approximately ${Math.round(illumination * 100)} percent illuminated`);

  const moonImage = new Image();
  moonImage.addEventListener("load", () => {
    const size = 512;
    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = size;
    baseCanvas.height = size;
    const baseContext = baseCanvas.getContext("2d", { willReadFrequently: true });
    if (!baseContext) return;

    baseContext.save();
    baseContext.beginPath();
    baseContext.arc(size / 2, size / 2, size * 0.49, 0, Math.PI * 2);
    baseContext.clip();
    const cropSize = Math.min(moonImage.naturalWidth, moonImage.naturalHeight) / 2;
    const sourceX = (moonImage.naturalWidth - cropSize) / 2;
    const sourceY = (moonImage.naturalHeight - cropSize) / 2 - cropSize * 0.05;
    baseContext.drawImage(moonImage, sourceX, sourceY, cropSize, cropSize, 0, 0, size, size);
    baseContext.restore();

    const image = baseContext.getImageData(0, 0, size, size);
    const angle = phase * Math.PI * 2;
    for (let y = 0; y < size; y += 1) {
      const ny = (y + 0.5 - size / 2) / (size * 0.49);
      for (let x = 0; x < size; x += 1) {
        const index = (y * size + x) * 4;
        if (image.data[index + 3] === 0) continue;
        const nx = (x + 0.5 - size / 2) / (size * 0.49);
        const distance = nx * nx + ny * ny;
        if (distance > 1) continue;
        const nz = Math.sqrt(1 - distance);
        const light = Math.max(0, Math.sin(angle) * nx - Math.cos(angle) * nz);
        const brightness = 0.055 + 0.945 * Math.pow(light, 0.72);
        image.data[index] *= brightness;
        image.data[index + 1] *= brightness;
        image.data[index + 2] *= brightness;
      }
    }

    baseContext.putImageData(image, 0, 0);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    moonCanvas.width = Math.round(size * ratio);
    moonCanvas.height = Math.round(size * ratio);
    moonContext.clearRect(0, 0, moonCanvas.width, moonCanvas.height);
    moonContext.drawImage(baseCanvas, 0, 0, moonCanvas.width, moonCanvas.height);
  });
  moonImage.src = "img/photos/portfolio/themes/astrophotography/20110914_moon.png";
})();
