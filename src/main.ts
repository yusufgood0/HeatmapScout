import dotenv from "dotenv";
dotenv.config(); // loads variables from .env into process.env

const API_KEY = process.env.API_KEY;
const SHEET_ID = process.env.SHEET_ID;

if (!API_KEY) { throw new Error("API_KEY is not defined in .env");}
if (!SHEET_ID) { throw new Error("SHEET_ID is not defined in .env");}
console.log("API_KEY and SHEET_ID loaded successfully");


const url =
  `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${API_KEY}`;

const SHEET_NAME = "RawScouterData";
const RANGE = "A1:AA"; // change as needed
const TEAMNUMBERHEADER = "Team Number"
const LINE_WIDTH = 20;
const IMAGE_SCALE = 1200 / 800;


// Optional: override full URL (leave null to auto-build)
const CUSTOM_URL = null;
// ===== TYPES =====

interface SheetResponse {
  values: string[][];
}
interface SheetRequest {
  range?: string | undefined;
  APIkey?: string | undefined;
  sheetID?: string | undefined;
  sheetName?: string | undefined;
  filter?: Filter | undefined;
}
interface Filter {
  key: string;
  value: string | number
}
export interface VertexPoint {
  x: number;
  y: number;
}

let translations: any;

async function loadTranslations() {
  translations = await fetch("../public/translations.json").then(r => r.json());
  console.log("Translations loaded:", translations);
}
export function GetTranslations() {
  return translations;
}
function hexToRgb(hex: string | { r: number, g: number, b: number }): { r: number, g: number, b: number } {
  if (typeof hex === "object") {
    return hex; // already in RGB format
  }
  // Remove the hash if present
  hex = hex.replace(/^#/, '');

  // Parse 3-digit hex shorthand
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b }; // object with r, g, b values
}

function DrawPolyLineWithGradiant(
  points: VertexPoint[],
  ctx: CanvasRenderingContext2D,
  pathData: PathData | null
) {
  if (points.length < 2) return;

  const color1 = hexToRgb(pathData?.color1 ?? "#ff3c00");
  const color2 = hexToRgb(pathData?.color2 ?? "#00ff00");
  const opacity = pathData?.opacity ?? 0.1;

  ctx.lineWidth = LINE_WIDTH;
  ctx.lineCap = "round"; // smoother line ends
  ctx.lineJoin = "round";

  // Draw all segments in one path, but interpolate color gradually
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];
    if (!p1 || !p2) continue;

    // t is along the entire path, not just per segment
    const tStart = (i - 1) / (points.length - 1);
    const tEnd = i / (points.length - 1);

    const rStart = Math.round(color1.r + (color2.r - color1.r) * tStart);
    const gStart = Math.round(color1.g + (color2.g - color1.g) * tStart);
    const bStart = Math.round(color1.b + (color2.b - color1.b) * tStart);

    const rEnd = Math.round(color1.r + (color2.r - color1.r) * tEnd);
    const gEnd = Math.round(color1.g + (color2.g - color1.g) * tEnd);
    const bEnd = Math.round(color1.b + (color2.b - color1.b) * tEnd);

    // create gradient for this segment
    const grad = ctx.createLinearGradient(
      p1.x * IMAGE_SCALE, p1.y * IMAGE_SCALE,
      p2.x * IMAGE_SCALE, p2.y * IMAGE_SCALE
    );
    grad.addColorStop(0, `rgba(${rStart},${gStart},${bStart},${opacity})`);
    grad.addColorStop(1, `rgba(${rEnd},${gEnd},${bEnd},${opacity})`);

    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(p1.x * IMAGE_SCALE, p1.y * IMAGE_SCALE);
    ctx.lineTo(p2.x * IMAGE_SCALE, p2.y * IMAGE_SCALE);
    ctx.stroke();
  }
}
export function DecodePolyline(str: string): VertexPoint[] {
  let index = 0;
  let x = 0;
  let y = 0;

  const points: VertexPoint[] = [];

  while (index < str.length) {
    x += decodeValue();
    y += decodeValue();

    points.push({ x, y });
  }

  return points;

  function decodeValue(): number {
    let result = 0;
    let shift = 0;
    let b: number;

    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    return (result & 1) ? ~(result >> 1) : (result >> 1);
  }
}


// ===== UTIL =====

// Convert sheet rows → objects using header row
function rowsToObjects(rows: string[][], filter?: Filter | null) {
  const headers = rows[0];
  const dataRows = rows.slice(1);

  if (!headers) return [];

  // Map rows to objects
  const objects = dataRows.map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? "";
    });
    return obj;
  });

  if (filter) {
    return objects.filter(obj => obj[filter.key ?? TEAMNUMBERHEADER] === String(filter.value));
  }

  return objects;
}


export function CompileAndAverage(
  records: Record<string, string>[]
): Record<string, string> {

  const result: Record<string, string> = {};
  const keySet = new Set<string>();

  records.forEach(r => Object.keys(r).forEach(k => keySet.add(k)));

  for (const key of keySet) {

    const values = records
      .map(r => r[key])
      .filter((v): v is string => v !== undefined && v !== "");

    if (values.length === 0) continue;

    const forceString = key in translations?.options && key in translations.options;

    // FORCE STRING LOGIC
    if (forceString) {

      const counts: Record<string, number> = {};

      values.forEach(v => {
        counts[v] = (counts[v] ?? 0) + 1;
      });

      const parts = Object.keys(counts).map(val => {
        const percent = Math.round((counts[val] ?? 0 / values.length) * 100);
        return `${translations?.options[key][val] ?? val}: ${Math.round(percent / values.length)}%`;
      });

      result[key] = parts.join(", ");
      continue;
    }

    // NUMERIC LOGIC
    const nums = values.map(v => Number(v));
    const allNumeric = nums.every(v => !isNaN(v));

    if (allNumeric) {
      const avg = nums.reduce((sum, n) => sum + n, 0) / nums.length;
      result[key] = avg.toFixed(2).replace(/\.00$/, "");
    } 
    else {
      // default string logic
      const counts: Record<string, number> = {};

      values.forEach(v => {
        counts[v] = (counts[v] ?? 0) + 1;
      });

      const parts = Object.keys(counts).map(val => {
        const percent = Math.round((counts[val] ?? 0 / values.length) * 100);
        return `${val}: ${Math.round(percent / values.length)}%`;
      });

      result[key] = parts.join(", ");
    }
  }

  return result;
}

// ===== MAIN FETCH =====
export async function FetchSheetData(requestInput: SheetRequest | null): Promise<Record<string, string>[] | null> {
  try {
    const request = requestInput ?? {};
    const sheetID = request.sheetID ?? SHEET_ID;
    const sheetName = request.sheetName ?? SHEET_NAME;
    const APIKey = request.APIkey ?? API_KEY;
    const range = request.range ?? RANGE;
    const url =
      CUSTOM_URL ??
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${sheetName}!${range}?key=${APIKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data: SheetResponse = await response.json();

    const parsed = rowsToObjects(data.values, request.filter ?? null);

    return parsed;

  } catch (err) {

    console.error("Sheet fetch failed:", err);

    const output = document.getElementById("output");

    if (output) {
      output.textContent = "Failed to load sheet data.";
    }

    return null;
  }
}


// ===== DISPLAY =====

function display(data: unknown) {

  const output = document.getElementById("output");

  if (!output) return;

  output.textContent = JSON.stringify(data, null, 2);
}

// ===== CANVAS =====
// ===== LOAD IMAGE =====
function loadBackgroundImage(src: string = "public/background.png"): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

// ===== REFRESH CANVAS =====
export function ClearCanvas() {
  const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!canvas || !ctx) return;

  loadBackgroundImage().then(img => {
    const aspectRatio = img.height / img.width;
    canvas.height = canvas.width * aspectRatio;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  });
}

// ===== DRAW PATHS =====
export function DrawPaths(
  paths: VertexPoint[][],
  pathData: PathData | null
) {
  const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");

  if (!ctx || paths.length === 0) return;

  paths.forEach(path => {
    DrawPolyLineWithGradiant(path, ctx, pathData??null);
  });
}

interface PathData {
  color1: { r: number, g: number, b: number } | string;
  color2: { r: number, g: number, b: number } | string;
  opacity: number;
}

// ===== INIT =====
export function ImportAndDrawPath(teamNumber: number = -1, pathData: PathData | null = null) {
  if (teamNumber === -1) {
    return;
  }
  const request: SheetRequest = {
    range: RANGE,
    APIkey: API_KEY,
    sheetID: SHEET_ID,
    sheetName: SHEET_NAME,
    filter: { key: TEAMNUMBERHEADER, value: teamNumber },
  };

  FetchSheetData(request).then(i =>
    DrawPaths(
      i?.map(x => DecodePolyline(x["Autonomous Path"] ?? "")) || [],
      pathData
    )
  );
}

// ===== DISPLAY PANEL =====
const displayData: Record<string,string> = {};

export function SetDisplayValue(title:string,value:string){
  displayData[title] = value;
}

export function GetDisplayData(){
  return displayData;
}

// ===== START =====
ClearCanvas();
loadTranslations();
