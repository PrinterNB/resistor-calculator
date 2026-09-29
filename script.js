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

const resistorTypeSelect = document.getElementById("resistorType");
const bandControls = document.getElementById("bandControls");
const resistorPreview = document.getElementById("resistorPreview");
const resistanceValue = document.getElementById("resistanceValue");
const resistanceDetail = document.getElementById("resistanceDetail");
const orientationNote = document.getElementById("orientationNote");
const cameraVideo = document.getElementById("cameraVideo");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const startCameraButton = document.getElementById("startCamera");
const scanCameraButton = document.getElementById("scanCamera");
const stopCameraButton = document.getElementById("stopCamera");
const scanStatus = document.getElementById("scanStatus");
const scanResult = document.getElementById("scanResult");
const scanReadout = document.getElementById("scanReadout");
const scanReadoutDetail = document.getElementById("scanReadoutDetail");
const applyScanButton = document.getElementById("applyScan");

let cameraStream;
let detectedBands = [];

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

function getCurrentType() {
  return BODY_TYPES[resistorTypeSelect.value] || BODY_TYPES.beige;
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

function getBandValues() {
  return [...bandControls.querySelectorAll("select")].map((select) => select.value);
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

function rgbToHsv(red, green, blue) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;

  if (delta) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    if (max === green) hue = 60 * ((blue - red) / delta + 2);
    if (max === blue) hue = 60 * ((red - green) / delta + 4);
  }

  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: max ? delta / max : 0,
    value: max / 255,
  };
}

function averagePatch(context, x, y, width, height) {
  const pixels = context.getImageData(Math.max(0, x - width / 2), Math.max(0, y - height / 2), width, height).data;
  let red = 0;
  let green = 0;
  let blue = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    red += pixels[index];
    green += pixels[index + 1];
    blue += pixels[index + 2];
  }

  const count = pixels.length / 4;
  return rgbToHsv(red / count, green / count, blue / count);
}

function classifyBandColor(hsv) {
  const { hue, saturation, value } = hsv;

  if (value < 0.16) return "black";
  if (saturation < 0.14) {
    if (value > 0.82) return "white";
    if (value > 0.58) return "silver";
    return "gray";
  }
  if (hue < 12 || hue >= 345) return value < 0.35 ? "brown" : "red";
  if (hue < 42) return value < 0.58 ? "brown" : value > 0.78 ? "gold" : "orange";
  if (hue < 72) return "yellow";
  if (hue < 165) return "green";
  if (hue < 255) return "blue";
  if (hue < 315) return "violet";
  return "red";
}

function scanFrame() {
  const currentType = getCurrentType();
  const width = cameraVideo.videoWidth;
  const height = cameraVideo.videoHeight;
  if (!width || !height) {
    scanResult.textContent = "The camera is still starting. Try again in a moment.";
    return;
  }

  cameraCanvas.width = width;
  cameraCanvas.height = height;
  const context = cameraCanvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(cameraVideo, 0, 0, width, height);

  const bandCount = currentType.bands.length;
  const start = 0.3;
  const spacing = 0.4 / (bandCount - 1);
  detectedBands = currentType.bands.map((band, index) => {
    const hsv = averagePatch(context, Math.round(width * (start + index * spacing)), Math.round(height * 0.5), Math.max(8, Math.round(width * 0.035)), Math.max(8, Math.round(height * 0.16)));
    const detectedColor = band.role === "tolerance" && classifyBandColor(hsv) === "yellow" ? "gold" : classifyBandColor(hsv);
    return OPTION_SETS[band.role].includes(detectedColor) ? detectedColor : OPTION_SETS[band.role][0];
  });

  const names = detectedBands.map((colorName) => COLOR_DEFS[colorName].name);
  const resistance = calculateResistance(detectedBands, currentType);
  scanReadout.hidden = false;
  scanReadoutDetail.textContent = `${names.join(" / ")} · ${formatResistance(resistance)}. Check the colors below before applying.`;
  scanResult.textContent = "Scan complete. The guide samples the bands from left to right.";
}

function calculateResistance(values, type) {
  const digits = values.slice(0, type.bands.length - 2).map((colorName) => COLOR_DEFS[colorName].digit);
  return Number(`${digits.join("")}`) * COLOR_DEFS[values[type.bands.length - 2]].multiplier;
}

function stopCamera() {
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = undefined;
  cameraVideo.srcObject = null;
  cameraVideo.classList.remove("active");
  cameraPlaceholder.hidden = false;
  scanStatus.textContent = "Camera off";
  startCameraButton.disabled = false;
  scanCameraButton.disabled = true;
  stopCameraButton.disabled = true;
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    scanResult.textContent = "Camera access needs HTTPS or localhost in a modern browser.";
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    cameraVideo.srcObject = cameraStream;
    await cameraVideo.play();
    cameraVideo.classList.add("active");
    cameraPlaceholder.hidden = true;
    scanStatus.textContent = "Camera live";
    scanResult.textContent = "Align the resistor across the guide, then scan it.";
    startCameraButton.disabled = true;
    scanCameraButton.disabled = false;
    stopCameraButton.disabled = false;
  } catch (error) {
    scanResult.textContent = error.name === "NotAllowedError" ? "Camera permission was blocked. Allow it in your browser settings and try again." : "Could not start the camera. Try using HTTPS or localhost.";
  }
}

function applyScan() {
  if (!detectedBands.length) return;
  detectedBands.forEach((colorName, index) => {
    const select = document.getElementById(`band-${index + 1}`);
    if (select && [...select.options].some((option) => option.value === colorName)) select.value = colorName;
  });
  updateCalculator();
  scanResult.textContent = "Detected bands applied. Adjust any color that looks off in the manual controls.";
}

resistorTypeSelect.addEventListener("change", renderControls);
startCameraButton.addEventListener("click", startCamera);
scanCameraButton.addEventListener("click", scanFrame);
stopCameraButton.addEventListener("click", stopCamera);
applyScanButton.addEventListener("click", applyScan);
window.addEventListener("pagehide", stopCamera);

renderControls();