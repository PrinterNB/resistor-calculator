const COLOR_DEFS = {
  black: { name: "Black", digit: 0, multiplier: 1 },
  brown: { name: "Brown", digit: 1, multiplier: 10, tolerance: 1 },
  red: { name: "Red", digit: 2, multiplier: 100, tolerance: 2 },
  orange: { name: "Orange", digit: 3, multiplier: 1000 },
  yellow: { name: "Yellow", digit: 4, multiplier: 10000 },
  green: { name: "Green", digit: 5, multiplier: 100000, tolerance: 0.5 },
  blue: { name: "Blue", digit: 6, multiplier: 1000000, tolerance: 0.25 },
  violet: { name: "Violet", digit: 7, multiplier: 10000000, tolerance: 0.1 },
  gray: { name: "Gray", digit: 8, multiplier: 100000000, tolerance: 0.05 },
  white: { name: "White", digit: 9, multiplier: 1000000000 },
  gold: { name: "Gold", multiplier: 0.1, tolerance: 5 },
  silver: { name: "Silver", multiplier: 0.01, tolerance: 10 },
  none: { name: "None", tolerance: 20 },
};

const BODY_TYPES = {
  beige: {
    label: "Beige body, 4-band",
    bands: [
      { role: "digit", label: "Band 1" },
      { role: "digit", label: "Band 2" },
      { role: "multiplier", label: "Band 3" },
      { role: "tolerance", label: "Band 4" },
    ],
    bodyColor: "#d9b680",
    defaultValues: ["brown", "black", "red", "gold"],
  },
  blue: {
    label: "Blue body, 5-band",
    bands: [
      { role: "digit", label: "Band 1" },
      { role: "digit", label: "Band 2" },
      { role: "digit", label: "Band 3" },
      { role: "multiplier", label: "Band 4" },
      { role: "tolerance", label: "Band 5" },
    ],
    bodyColor: "#4f7ab6",
    defaultValues: ["brown", "black", "black", "red", "gold"],
  },
};

const OPTION_SETS = {
  digit: ["black", "brown", "red", "orange", "yellow", "green", "blue", "violet", "gray", "white"],
  multiplier: ["black", "brown", "red", "orange", "yellow", "green", "blue", "violet", "gray", "white", "gold", "silver"],
  tolerance: ["brown", "red", "green", "blue", "violet", "gray", "gold", "silver", "none"],
};

const DETECTION_RGB = {
  black: [27, 26, 24],
  brown: [138, 76, 36],
  red: [210, 59, 42],
  orange: [229, 123, 30],
  yellow: [242, 209, 43],
  green: [61, 155, 87],
  blue: [54, 102, 207],
  violet: [139, 75, 214],
  gray: [155, 155, 155],
  white: [245, 245, 245],
  gold: [201, 162, 69],
  silver: [192, 199, 208],
  beige: [217, 182, 128],
  bodyBlue: [79, 122, 182],
};

const DIGIT_SET = new Set(OPTION_SETS.digit);
const MULTIPLIER_SET = new Set(OPTION_SETS.multiplier);
const TOLERANCE_SET = new Set(OPTION_SETS.tolerance);

const resistorTypeSelect = document.getElementById("resistorType");
const bandControls = document.getElementById("bandControls");
const resistorPreview = document.getElementById("resistorPreview");
const resistanceValue = document.getElementById("resistanceValue");
const resistanceDetail = document.getElementById("resistanceDetail");
const orientationNote = document.getElementById("orientationNote");
const photoInput = document.getElementById("photoInput");
const photoStatus = document.getElementById("photoStatus");
const photoCanvas = document.getElementById("photoCanvas");
const photoResult = document.getElementById("photoResult");
const applyDetectionButton = document.getElementById("applyDetection");

const photoCtx = photoCanvas.getContext("2d");
const analysisCanvas = document.createElement("canvas");
const analysisCtx = analysisCanvas.getContext("2d", { willReadFrequently: true });
const sampleCanvas = document.createElement("canvas");
const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });

let currentPhoto = null;
let currentDetection = null;

function formatResistance(value) {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${trimNumber(value / 1000000)} MΩ`;
  }
  if (absValue >= 1000) {
    return `${trimNumber(value / 1000)} kΩ`;
  }
  return `${trimNumber(value)} Ω`;
}

function trimNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(value < 10 ? 2 : 1).replace(/\.0+$|(?<=\.[0-9]*?)0+$/, "");
}

function bandColor(name) {
  const colors = {
    black: "#1b1a18",
    brown: "#8a4c24",
    red: "#d23b2a",
    orange: "#e57b1e",
    yellow: "#f2d12b",
    green: "#3d9b57",
    blue: "#3666cf",
    violet: "#8b4bd6",
    gray: "#9b9b9b",
    white: "#f5f5f5",
    gold: "#c9a245",
    silver: "#c0c7d0",
    none: "transparent",
  };
  return colors[name] || colors.black;
}

function readableColor(name) {
  return name === "gold" || name === "yellow" || name === "white" || name === "silver" ? "#24190f" : "#fff8ef";
}

function getCurrentType() {
  return BODY_TYPES[resistorTypeSelect.value] || BODY_TYPES.beige;
}

function createBandSelect(type, bandIndex, value) {
  const optionGroup = document.createElement("div");
  optionGroup.className = "band-option";

  const label = document.createElement("label");
  label.setAttribute("for", `band-${bandIndex}`);
  label.textContent = type.label;

  const select = document.createElement("select");
  select.id = `band-${bandIndex}`;
  select.dataset.role = type.role;

  OPTION_SETS[type.role].forEach((colorName) => {
    const option = document.createElement("option");
    option.value = colorName;
    option.textContent = COLOR_DEFS[colorName].name;
    select.appendChild(option);
  });

  select.value = value;
  select.addEventListener("change", updateCalculator);

  optionGroup.append(label, select);
  return optionGroup;
}

function getBandValues() {
  return [...bandControls.querySelectorAll("select")].map((select) => select.value);
}

function renderControls() {
  const currentType = getCurrentType();
  bandControls.innerHTML = "";

  currentType.bands.forEach((band, index) => {
    const defaultValue = currentType.defaultValues[index];
    bandControls.appendChild(createBandSelect(band, index + 1, defaultValue));
  });

  renderPreview();
  updateCalculator();
}

function renderPreview() {
  const currentType = getCurrentType();
  resistorPreview.innerHTML = "";
  resistorPreview.style.setProperty("--body-color", currentType.bodyColor);

  const track = document.createElement("div");
  track.className = "resistor-track";

  const leftLead = document.createElement("div");
  leftLead.className = "resistor-lead left";

  const rightLead = document.createElement("div");
  rightLead.className = "resistor-lead right";

  const body = document.createElement("div");
  body.className = "resistor-body";

  const values = getBandValues();
  const bodyWidth = currentType.bands.length === 4 ? 11 : 13;
  const spacing = currentType.bands.length === 4 ? 18 : 14;
  const start = 50 - ((currentType.bands.length - 1) * spacing) / 2;

  currentType.bands.forEach((band, index) => {
    const bandEl = document.createElement("div");
    bandEl.className = `band ${band.role === "multiplier" ? "multiplier" : ""} ${index === 0 ? "first" : ""} ${band.role === "tolerance" ? "tolerance-band" : ""}`.trim();
    bandEl.style.left = `calc(${start + index * spacing}% - ${bodyWidth / 2}px)`;
    bandEl.style.background = bandColor(values[index]);
    bandEl.style.color = readableColor(values[index]);

    body.appendChild(bandEl);
  });

  track.append(leftLead, rightLead, body);
  resistorPreview.appendChild(track);

  orientationNote.textContent = "The first band is the one marked 1. Read toward the tolerance band, which is usually the separated one on the right.";
}

function updateCalculator() {
  const currentType = getCurrentType();
  const values = getBandValues();

  const digits = values.slice(0, currentType.bands.length - 2).map((colorName) => COLOR_DEFS[colorName].digit);
  const multiplierColor = values[currentType.bands.length - 2];
  const toleranceColor = values[currentType.bands.length - 1];

  const multiplier = COLOR_DEFS[multiplierColor].multiplier;
  const tolerance = COLOR_DEFS[toleranceColor].tolerance;

  const resistance = Number(`${digits.join("")}`) * multiplier;

  resistanceValue.textContent = formatResistance(resistance);
  resistanceDetail.textContent = `Formula: ${digits.join("")} x ${multiplier} = ${formatResistance(resistance)}. Tolerance: ${tolerance ?? "?"}%`;

  renderPreview();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbDistance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }

    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  return { h, s, l };
}

function colorSummary(rgb) {
  return rgbToHsl(rgb[0], rgb[1], rgb[2]);
}

function averagePixelRegion(imageData, x0, y0, x1, y1) {
  const { data, width, height } = imageData;
  const startX = clamp(Math.floor(x0), 0, width - 1);
  const endX = clamp(Math.ceil(x1), startX + 1, width);
  const startY = clamp(Math.floor(y0), 0, height - 1);
  const endY = clamp(Math.ceil(y1), startY + 1, height);

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const index = (y * width + x) * 4;
      r += data[index];
      g += data[index + 1];
      b += data[index + 2];
      count += 1;
    }
  }

  return count ? [r / count, g / count, b / count] : [0, 0, 0];
}

function averageBorderColor(imageData, margin = 6) {
  const { data, width, height } = imageData;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isBorder = x < margin || y < margin || x >= width - margin || y >= height - margin;
      if (!isBorder) {
        continue;
      }

      const index = (y * width + x) * 4;
      r += data[index];
      g += data[index + 1];
      b += data[index + 2];
      count += 1;
    }
  }

  return count ? [r / count, g / count, b / count] : [255, 255, 255];
}

function classifyBodyColor(rgb) {
  const beigeDist = rgbDistance(rgb, DETECTION_RGB.beige);
  const blueDist = rgbDistance(rgb, DETECTION_RGB.bodyBlue);
  if (beigeDist <= blueDist) {
    return { name: "beige", distance: beigeDist };
  }
  return { name: "blue", distance: blueDist };
}

function classifyStripeColor(rgb, bodyColorName) {
  const bodyRgb = DETECTION_RGB[bodyColorName];
  const bodyDistance = rgbDistance(rgb, bodyRgb);
  const hsl = colorSummary(rgb);

  let bestName = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  Object.entries(DETECTION_RGB).forEach(([name, candidateRgb]) => {
    if (name === "beige" || name === "bodyBlue") {
      return;
    }

    const candidateDistance = rgbDistance(rgb, candidateRgb);
    if (candidateDistance < bestDistance) {
      bestName = name;
      bestDistance = candidateDistance;
    }
  });

  if (!bestName) {
    return { name: null, confidence: 0 };
  }

  const bodyMuchCloser = bodyDistance + 12 < bestDistance;
  const tooDull = hsl.s < 0.08 && bestName !== "black" && bestName !== "gray" && bestName !== "white" && bestName !== "silver";

  if (bodyMuchCloser || tooDull || bestDistance > 125) {
    return { name: null, confidence: 0 };
  }

  const confidence = clamp(1 - bestDistance / 130, 0, 1);
  return { name: bestName, confidence };
}

function median(values) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function medianPixelRegion(imageData, x0, y0, x1, y1, step = 2) {
  const { data, width, height } = imageData;
  const startX = clamp(Math.floor(x0), 0, width - 1);
  const endX = clamp(Math.ceil(x1), startX + 1, width);
  const startY = clamp(Math.floor(y0), 0, height - 1);
  const endY = clamp(Math.ceil(y1), startY + 1, height);
  const reds = [];
  const greens = [];
  const blues = [];

  for (let y = startY; y < endY; y += step) {
    for (let x = startX; x < endX; x += step) {
      const index = (y * width + x) * 4;
      reds.push(data[index]);
      greens.push(data[index + 1]);
      blues.push(data[index + 2]);
    }
  }

  return [median(reds), median(greens), median(blues)];
}

function normalizeRgb(rgb) {
  const total = Math.max(1, rgb[0] + rgb[1] + rgb[2]);
  return [rgb[0] / total, rgb[1] / total, rgb[2] / total];
}

function chromaDistance(a, b) {
  const normalizedA = normalizeRgb(a);
  const normalizedB = normalizeRgb(b);
  return Math.hypot(
    normalizedA[0] - normalizedB[0],
    normalizedA[1] - normalizedB[1],
    normalizedA[2] - normalizedB[2],
  );
}

function classifyLightingTolerantColor(rgb, bodyRgb) {
  const { h, s, l } = colorSummary(rgb);
  const bodyChromaDistance = chromaDistance(rgb, bodyRgb);
  const references = Object.entries(DETECTION_RGB)
    .filter(([name]) => name !== "beige" && name !== "bodyBlue")
    .map(([name, candidate]) => ({ name, distance: chromaDistance(rgb, candidate) }));
  const closest = references.reduce((best, item) => (item.distance < best.distance ? item : best));

  // Hue survives exposure changes more reliably than raw RGB. Neutrals need luminance.
  let name = closest.name;
  if (l < 0.18) {
    name = "black";
  } else if (s < 0.09) {
    name = l > 0.78 ? "white" : (l > 0.52 ? "silver" : "gray");
  } else if (h >= 12 && h < 42) {
    name = l < 0.36 ? "brown" : "orange";
  } else if (h >= 42 && h < 72) {
    name = l < 0.7 ? "gold" : "yellow";
  } else if (h >= 72 && h < 174) {
    name = "green";
  } else if (h >= 174 && h < 262) {
    name = "blue";
  } else if (h >= 262 && h < 340) {
    name = "violet";
  } else {
    name = h < 12 || h >= 340 ? "red" : name;
  }

  const referenceDistance = chromaDistance(rgb, DETECTION_RGB[name]);
  const contrast = Math.min(1, bodyChromaDistance * 5 + Math.abs(l - colorSummary(bodyRgb).l) * 1.4);
  return {
    name,
    confidence: clamp((1 - referenceDistance * 2.8) * 0.6 + contrast * 0.4, 0, 1),
  };
}

function buildForegroundMask(imageData) {
  const { width, height } = imageData;
  const border = averageBorderColor(imageData);
  const borderHsl = colorSummary(border);
  const mask = new Uint8Array(width * height);
  const { data } = imageData;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const rgb = [data[index], data[index + 1], data[index + 2]];
      const hsl = colorSummary(rgb);
      const distance = rgbDistance(rgb, border);
      const contrast = Math.abs(hsl.l - borderHsl.l);
      if (distance > 42 || (distance > 28 && hsl.s > 0.16) || (contrast > 0.16 && hsl.s > 0.1)) {
        mask[y * width + x] = 1;
      }
    }
  }

  return { mask, width, height };
}

function findLargestComponent(maskInfo) {
  const { mask, width, height } = maskInfo;
  const visited = new Uint8Array(mask.length);
  let best = null;

  function enqueueNeighbors(queue, x, y) {
    for (let ny = y - 1; ny <= y + 1; ny += 1) {
      if (ny < 0 || ny >= height) {
        continue;
      }
      for (let nx = x - 1; nx <= x + 1; nx += 1) {
        if (nx < 0 || nx >= width || (nx === x && ny === y)) {
          continue;
        }
        const index = ny * width + nx;
        if (mask[index] && !visited[index]) {
          visited[index] = 1;
          queue.push(index);
        }
      }
    }
  }

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || visited[index]) {
      continue;
    }

    visited[index] = 1;
    const queue = [index];
    let size = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    while (queue.length > 0) {
      const current = queue.pop();
      const x = current % width;
      const y = Math.floor(current / width);
      size += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      enqueueNeighbors(queue, x, y);
    }

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const aspect = boxWidth / Math.max(1, boxHeight);
    const centered = 1 - Math.min(1, Math.abs((minX + maxX) / 2 - width / 2) / (width / 2));
    const fillsFrame = boxWidth > width * 0.94 && boxHeight > height * 0.94;
    const elongated = clamp((aspect - 1.4) / 3.5, 0, 1);
    const score = fillsFrame ? 0 : size * (0.25 + elongated * 2.4 + centered * 0.2);

    if (!best || score > best.score) {
      best = {
        score,
        size,
        x: minX,
        y: minY,
        w: boxWidth,
        h: boxHeight,
      };
    }
  }

  return best;
}

function detectBoundsFromCanvas(sourceCanvas) {
  const maxSample = 180;
  const scale = Math.min(1, maxSample / Math.max(sourceCanvas.width, sourceCanvas.height));
  const sampleWidth = Math.max(1, Math.round(sourceCanvas.width * scale));
  const sampleHeight = Math.max(1, Math.round(sourceCanvas.height * scale));

  sampleCanvas.width = sampleWidth;
  sampleCanvas.height = sampleHeight;
  sampleCtx.drawImage(sourceCanvas, 0, 0, sampleWidth, sampleHeight);

  const sampledImageData = sampleCtx.getImageData(0, 0, sampleWidth, sampleHeight);
  const maskInfo = buildForegroundMask(sampledImageData);
  const component = findLargestComponent(maskInfo);

  if (!component || component.size < sampleWidth * sampleHeight * 0.012) {
    const fallbackWidth = Math.floor(sampleWidth * 0.72);
    const fallbackHeight = Math.floor(sampleHeight * 0.44);
    const fallbackX = Math.floor((sampleWidth - fallbackWidth) / 2);
    const fallbackY = Math.floor((sampleHeight - fallbackHeight) / 2);
    return {
      x: fallbackX / scale,
      y: fallbackY / scale,
      w: fallbackWidth / scale,
      h: fallbackHeight / scale,
    };
  }

  const padX = Math.max(3, Math.round(component.w * 0.08));
  const padY = Math.max(3, Math.round(component.h * 0.18));
  const x = clamp(component.x - padX, 0, sampleWidth - 1);
  const y = clamp(component.y - padY, 0, sampleHeight - 1);
  const w = clamp(component.w + padX * 2, 1, sampleWidth - x);
  const h = clamp(component.h + padY * 2, 1, sampleHeight - y);

  return {
    x: x / scale,
    y: y / scale,
    w: w / scale,
    h: h / scale,
  };
}

function smoothColumnColors(columns) {
  return columns.map((column, index) => {
    const counts = new Map();
    for (let offset = -2; offset <= 2; offset += 1) {
      const neighbor = columns[index + offset];
      if (!neighbor || !neighbor.color) {
        continue;
      }
      counts.set(neighbor.color, (counts.get(neighbor.color) || 0) + 1);
    }

    let bestColor = null;
    let bestCount = 0;
    counts.forEach((count, color) => {
      if (count > bestCount) {
        bestColor = color;
        bestCount = count;
      }
    });

    if (bestCount >= 3) {
      return { ...column, color: bestColor };
    }

    return { ...column, color: column.color };
  });
}

function buildRuns(columns) {
  const runs = [];
  let current = null;

  columns.forEach((column) => {
    if (!column.color) {
      if (current) {
        runs.push(current);
        current = null;
      }
      return;
    }

    if (current && current.color === column.color) {
      current.end = column.x;
      current.width += 1;
      current.confidenceSum += column.confidence;
      return;
    }

    if (current) {
      runs.push(current);
    }

    current = {
      color: column.color,
      start: column.x,
      end: column.x,
      width: 1,
      confidenceSum: column.confidence,
    };
  });

  if (current) {
    runs.push(current);
  }

  return runs
    .map((run) => ({
      ...run,
      center: (run.start + run.end) / 2,
      averageConfidence: run.confidenceSum / run.width,
      score: run.width * (0.65 + run.averageConfidence),
    }))
    .filter((run) => run.width >= 4);
}

function scoreSequence(sequence) {
  if (sequence.length === 4) {
    const roles = ["digit", "digit", "multiplier", "tolerance"];
    return sequence.reduce((total, colorName, index) => {
      const role = roles[index];
      if (role === "digit") {
        return total + (DIGIT_SET.has(colorName) ? 1 : 0);
      }
      if (role === "multiplier") {
        return total + (MULTIPLIER_SET.has(colorName) ? 1 : 0);
      }
      return total + (TOLERANCE_SET.has(colorName) ? 1 : 0);
    }, 0);
  }

  if (sequence.length === 5) {
    const roles = ["digit", "digit", "digit", "multiplier", "tolerance"];
    return sequence.reduce((total, colorName, index) => {
      const role = roles[index];
      if (role === "digit") {
        return total + (DIGIT_SET.has(colorName) ? 1 : 0);
      }
      if (role === "multiplier") {
        return total + (MULTIPLIER_SET.has(colorName) ? 1 : 0);
      }
      return total + (TOLERANCE_SET.has(colorName) ? 1 : 0);
    }, 0);
  }

  return 0;
}

function getBandProfile(imageData, bounds) {
  const xStart = Math.round(bounds.x + bounds.w * 0.1);
  const xEnd = Math.round(bounds.x + bounds.w * 0.9);
  const yStart = Math.round(bounds.y + bounds.h * 0.22);
  const yEnd = Math.round(bounds.y + bounds.h * 0.78);
  const rawColumns = [];

  for (let x = xStart; x <= xEnd; x += 1) {
    rawColumns.push({ x, rgb: medianPixelRegion(imageData, x, yStart, x + 1, yEnd) });
  }

  // A channel-wise median ignores the narrow color bands and is stable in shadows.
  const bodyRgb = [
    median(rawColumns.map((column) => column.rgb[0])),
    median(rawColumns.map((column) => column.rgb[1])),
    median(rawColumns.map((column) => column.rgb[2])),
  ];

  return rawColumns.map((column, index) => {
    const neighborhood = rawColumns.slice(Math.max(0, index - 30), Math.min(rawColumns.length, index + 31));
    const baseline = [
      median(neighborhood.map((item) => item.rgb[0])),
      median(neighborhood.map((item) => item.rgb[1])),
      median(neighborhood.map((item) => item.rgb[2])),
    ];
    const { l } = colorSummary(column.rgb);
    const baselineLightness = colorSummary(baseline).l;
    const localContrast = chromaDistance(column.rgb, baseline) + Math.abs(l - baselineLightness) * 0.45;
    const classification = classifyLightingTolerantColor(column.rgb, bodyRgb);

    return {
      x: column.x,
      color: localContrast > 0.065 ? classification.name : null,
      confidence: localContrast > 0.065 ? classification.confidence * clamp(localContrast / 0.18, 0.35, 1) : 0,
    };
  });
}

function sequenceCandidates(runs, count) {
  const candidates = [];
  const choose = (start, picked) => {
    if (picked.length === count) {
      candidates.push(picked);
      return;
    }
    for (let index = start; index <= runs.length - (count - picked.length); index += 1) {
      choose(index + 1, [...picked, runs[index]]);
    }
  };
  choose(0, []);
  return candidates;
}

function findBestBandSequence(runs) {
  let best = null;

  [4, 5].forEach((count) => {
    sequenceCandidates(runs, count).forEach((candidate) => {
      const averageConfidence = candidate.reduce((total, run) => total + run.averageConfidence, 0) / count;
      const averageWidth = candidate.reduce((total, run) => total + run.width, 0) / count;
      const widthsArePlausible = candidate.every((run) => run.width < averageWidth * 3.5);
      if (!widthsArePlausible) {
        return;
      }

      const forward = candidate.map((run) => run.color);
      const reverse = [...forward].reverse();
      const forwardScore = scoreSequence(forward);
      const reverseScore = scoreSequence(reverse);
      const semanticScore = Math.max(forwardScore, reverseScore) / count;
      const bands = reverseScore > forwardScore ? reverse : forward;
      const score = semanticScore * 0.72 + averageConfidence * 0.28;

      if (!best || score > best.score) {
        best = { count, bands, score, semanticScore, averageConfidence };
      }
    });
  });

  return best;
}

function analyzePhoto() {
  if (!currentPhoto) {
    return null;
  }

  const maxDim = 1200;
  const scale = Math.min(1, maxDim / Math.max(currentPhoto.width, currentPhoto.height));
  analysisCanvas.width = Math.max(1, Math.round(currentPhoto.width * scale));
  analysisCanvas.height = Math.max(1, Math.round(currentPhoto.height * scale));
  analysisCtx.drawImage(currentPhoto, 0, 0, analysisCanvas.width, analysisCanvas.height);

  const bounds = detectBoundsFromCanvas(analysisCanvas);
  const imageData = analysisCtx.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);

  const columns = getBandProfile(imageData, bounds);
  const smoothedColumns = smoothColumnColors(columns);
  const runs = buildRuns(smoothedColumns)
    .filter((run) => run.width <= bounds.w * 0.13 && run.averageConfidence >= 0.2);
  const best = findBestBandSequence(runs);

  if (!best) {
    return {
      ok: false,
      message: "I could not isolate a valid band sequence. Fill more of the frame with one resistor and avoid a busy background.",
      bounds,
    };
  }

  const bodySample = medianPixelRegion(
    imageData,
    bounds.x + bounds.w * 0.42,
    bounds.y + bounds.h * 0.3,
    bounds.x + bounds.w * 0.58,
    bounds.y + bounds.h * 0.7,
  );
  const bodyColor = classifyBodyColor(bodySample);
  const confidence = best.score;

  if (best.semanticScore < 1 || confidence < 0.58) {
    return {
      ok: false,
      message: "I found possible bands, but the colors are not distinct enough to read safely. Try diffuse light, reduce glare, and keep the resistor horizontal.",
      bounds,
      bodyColor: bodyColor.name,
      expectedCount: best.count,
    };
  }

  return {
    ok: true,
    message: `Detected ${best.count}-band resistor. Bands: ${best.bands.map((name) => COLOR_DEFS[name].name).join(", ")}.`,
    bounds,
    bodyColor: best.count === 5 ? "blue" : "beige",
    expectedCount: best.count,
    confidence,
    bands: best.bands,
  };
}

function drawPhotoPreview(image, detection = null) {
  const ctx = photoCtx;
  const canvas = photoCanvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, "#0d1118");
  background.addColorStop(1, "#171a23");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!image) {
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(14, 14, canvas.width - 28, canvas.height - 28);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = "600 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Photo preview will appear here", canvas.width / 2, canvas.height / 2 - 8);
    ctx.font = "500 14px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("Best results: one resistor, horizontal, plain background", canvas.width / 2, canvas.height / 2 + 22);
    return;
  }

  const fit = Math.min((canvas.width - 20) / image.width, (canvas.height - 20) / image.height);
  const drawWidth = image.width * fit;
  const drawHeight = image.height * fit;
  const drawX = (canvas.width - drawWidth) / 2;
  const drawY = (canvas.height - drawHeight) / 2;

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  if (detection?.bounds) {
    const boxScale = drawWidth / analysisCanvas.width;
    const x = drawX + detection.bounds.x * boxScale;
    const y = drawY + detection.bounds.y * boxScale;
    const w = detection.bounds.w * boxScale;
    const h = detection.bounds.h * boxScale;
    ctx.save();
    ctx.strokeStyle = "rgba(217, 165, 92, 0.95)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 7]);
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "rgba(217, 165, 92, 0.92)";
    ctx.font = "700 14px monospace";
    ctx.fillText("detected resistor", x + 8, Math.max(18, y - 10));
    ctx.restore();
  }
}

function setPhotoPlaceholder() {
  drawPhotoPreview(null);
  photoStatus.textContent = "No photo selected.";
  photoResult.textContent = "";
  applyDetectionButton.disabled = true;
  currentDetection = null;
}

function setPhotoResult(detection) {
  currentDetection = detection;
  if (!detection) {
    photoResult.textContent = "";
    applyDetectionButton.disabled = true;
    return;
  }

  if (detection.ok) {
    const confidence = Math.round(detection.confidence * 100);
    photoResult.textContent = `${detection.message} Confidence: ${confidence}%.`;
    applyDetectionButton.disabled = false;
  } else {
    photoResult.textContent = detection.message;
    applyDetectionButton.disabled = true;
  }
}

function applyDetectedBands(detection) {
  if (!detection?.ok) {
    return;
  }

  resistorTypeSelect.value = detection.bodyColor;
  renderControls();

  const selects = [...bandControls.querySelectorAll("select")];
  detection.bands.forEach((band, index) => {
    if (selects[index]) {
      selects[index].value = band;
    }
  });

  updateCalculator();
}

function summarizeFile(file) {
  const sizeInMb = file.size / (1024 * 1024);
  return `${file.name} (${sizeInMb < 1 ? `${Math.round(file.size / 1024)} KB` : `${sizeInMb.toFixed(1)} MB`})`;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load image."));
    };
    image.src = objectUrl;
  });
}

async function handlePhotoSelection(file) {
  if (!file) {
    currentPhoto = null;
    setPhotoPlaceholder();
    return;
  }

  photoStatus.textContent = `Loading ${summarizeFile(file)}...`;
  photoResult.textContent = "";
  applyDetectionButton.disabled = true;

  try {
    currentPhoto = await loadImageFromFile(file);
    drawPhotoPreview(currentPhoto);
    photoStatus.textContent = `Analyzing ${summarizeFile(file)} locally...`;

    const detection = analyzePhoto();
    drawPhotoPreview(currentPhoto, detection?.ok ? detection : null);
    setPhotoResult(detection);

    if (detection?.ok) {
      photoStatus.textContent = `Detected ${BODY_TYPES[detection.bodyColor].label.toLowerCase()}.`;
    } else {
      photoStatus.textContent = "Photo analyzed, but the reading is uncertain.";
    }
  } catch (error) {
    currentPhoto = null;
    setPhotoPlaceholder();
    photoStatus.textContent = "Could not read that image.";
  }
}

resistorTypeSelect.addEventListener("change", renderControls);
photoInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  handlePhotoSelection(file);
});

applyDetectionButton.addEventListener("click", () => {
  applyDetectedBands(currentDetection);
});

drawPhotoPreview(null);
setPhotoPlaceholder();
renderControls();
