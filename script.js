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

resistorTypeSelect.addEventListener("change", renderControls);

renderControls();