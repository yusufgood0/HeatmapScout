/*
 disabled as it confuses github's secret scanning. Just remember to create a .env file with API_KEY and SHEET_ID defined when running this locally.
 import dotenv from "dotenv";
 dotenv.config(); // loads variables from .env into process.env
*/
// import { API_KEY, SHEET_ID } from "./config";
//
// or, if using plain TS with a custom build script:
export const API_KEY = "AIzaSyDgIDCWpWFUeOyx0g8wuxbM-HDulR3saxk";
export const SHEET_ID = "1n2JIJXDuPiv5y9IbKyQrROachf2W4pz8ADWcptsfLKc";
const BASE = import.meta?.env?.BASE_URL ?? "./";
if (!API_KEY) {
    throw new Error("API_KEY is not defined in .env");
}
if (!SHEET_ID) {
    throw new Error("SHEET_ID is not defined in .env");
}
console.log("API_KEY and SHEET_ID loaded successfully");
const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1?key=${API_KEY}`;
const SHEET_NAME = "RawScouterData";
const RANGE = "A1:AA"; // change as needed
const TEAMNUMBERHEADER = "Team Number";
const LINE_WIDTH = 20;
const IMAGE_SCALE = 1200 / 800;
let translations;
async function loadTranslations() {
    translations = await fetch(BASE + 'translations.json').then(r => r.json());
    console.log("Translations loaded:", translations);
}
export function GetTranslations() {
    return translations;
}
function hexToRgb(hex) {
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
function DrawPolyLineWithGradient(points, ctx, pathData) {
    if (points.length < 2)
        return;
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
        if (!p1 || !p2)
            continue;
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
        const grad = ctx.createLinearGradient(p1.x * IMAGE_SCALE, p1.y * IMAGE_SCALE, p2.x * IMAGE_SCALE, p2.y * IMAGE_SCALE);
        grad.addColorStop(0, `rgba(${rStart},${gStart},${bStart},${opacity})`);
        grad.addColorStop(1, `rgba(${rEnd},${gEnd},${bEnd},${opacity})`);
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(p1.x * IMAGE_SCALE, p1.y * IMAGE_SCALE);
        ctx.lineTo(p2.x * IMAGE_SCALE, p2.y * IMAGE_SCALE);
        ctx.stroke();
    }
}
export function DecodePolyline(str) {
    let index = 0;
    let x = 0;
    let y = 0;
    const points = [];
    while (index < str.length) {
        x += decodeValue();
        y += decodeValue();
        points.push({ x, y });
    }
    return points;
    function decodeValue() {
        let result = 0;
        let shift = 0;
        let b;
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
function rowsToObjects(rows, filter) {
    const headers = rows[0];
    const dataRows = rows.slice(1);
    if (!headers)
        return [];
    // Map rows to objects
    const objects = dataRows.map(row => {
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = row[i] ?? "";
        });
        return obj;
    });
    if (filter) {
        return ApplyFilter(objects, filter);
    }
    return objects;
}
function ApplyFilter(records, filter) {
    console.log("Applying filter:", filter, "to records:", records);
    if (!filter || !records)
        return records ?? [];
    return records.filter(r => String(r[filter.key ?? TEAMNUMBERHEADER]) === String(filter.value));
}
export function CompileAndAverage(records) {
    const result = {};
    const keySet = new Set();
    records.forEach(r => Object.keys(r).forEach(k => keySet.add(k)));
    for (const key of keySet) {
        const values = records
            .map(r => r[key])
            .filter((v) => v !== undefined && v !== "");
        if (values.length === 0)
            continue;
        const forceString = key in translations?.options && key in translations.options;
        // FORCE STRING LOGIC
        if (forceString) {
            const counts = {};
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
            const counts = {};
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
export async function FetchSheetData(requestInput) {
    const url = FormatUrl(requestInput);
    const parsed = await FetchSheetDataFromNetwork(requestInput);
    if (parsed) {
        await SetCachedSheetData(url, parsed); // Update cache with fresh data
        return parsed;
    }
    const cachedData = await GetCachedSheetData(requestInput);
    if (cachedData)
        return cachedData;
    return null;
}
async function FetchSheetDataFromNetwork(requestInput) {
    try {
        const url = FormatUrl(requestInput);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        const data = await response.json();
        return rowsToObjects(data.values, requestInput.filter);
    }
    catch (err) {
        console.error("Network fetch failed:", err);
        return null;
    }
}
function FormatUrl(request) {
    const sheetID = request.sheetID ?? SHEET_ID;
    const sheetName = request.sheetName ?? SHEET_NAME;
    const APIKey = request.APIkey ?? API_KEY;
    const range = request.range ?? RANGE;
    return `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${sheetName}!${range}?key=${APIKey}`;
}
async function SetCachedSheetData(url, data) {
    // Cache the JSON response for offline use
    if ("caches" in window) {
        const cache = await caches.open("sheet-data-cache");
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const responseToCache = new Response(blob, { status: 200, statusText: "OK" });
        await cache.put(url, responseToCache);
    }
}
async function GetCachedSheetData(requestInput) {
    requestInput = {
        range: requestInput.range ?? RANGE,
        APIkey: requestInput.APIkey ?? API_KEY,
        sheetID: requestInput.sheetID ?? SHEET_ID,
        sheetName: requestInput.sheetName ?? SHEET_NAME,
        filter: { key: requestInput.filter?.key ?? TEAMNUMBERHEADER, value: requestInput.filter?.value ?? "" }
    };
    if ("caches" in window) {
        try {
            const cache = await caches.open("sheet-data-cache");
            const cachedResponse = await cache.match(FormatUrl(requestInput));
            if (cachedResponse) {
                const cachedData = await cachedResponse.json();
                return ApplyFilter(cachedData, requestInput.filter);
            }
        }
        catch {
            return null;
        }
    }
    return null;
}
// ===== CANVAS =====
// ===== LOAD IMAGE =====
// ===== LOAD IMAGE =====
function loadBackgroundImage(src = BASE + 'background.png') {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    });
}
// ===== CLEAR CANVAS =====
export async function ClearCanvas() {
    const canvas = document.getElementById("myCanvas");
    if (!canvas)
        return;
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return;
    try {
        const img = await loadBackgroundImage();
        const aspectRatio = img.height / img.width;
        canvas.height = canvas.width * aspectRatio;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    catch (err) {
        console.error(err);
    }
}
// ===== DRAW PATHS =====
export async function DrawPaths(paths, pathData) {
    const canvas = document.getElementById("myCanvas");
    if (!canvas || paths.length === 0)
        return;
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return;
    // Make sure background is loaded and drawn first
    await ClearCanvas();
    paths.forEach(path => {
        // Make sure your function name matches
        DrawPolyLineWithGradient(path, ctx, pathData ?? null);
    });
}
// ===== INIT =====
export function ImportAndDrawPath(teamNumber = -1, pathData = null) {
    if (teamNumber === -1) {
        return;
    }
    const request = {
        range: RANGE,
        APIkey: API_KEY,
        sheetID: SHEET_ID,
        sheetName: SHEET_NAME,
        filter: { key: TEAMNUMBERHEADER, value: teamNumber },
    };
    FetchSheetData(request).then(i => DrawPaths(FormatAutonomousPaths(i), pathData));
}
export function ImportAndDrawPathFromCache(teamNumber = -1, pathData = null) {
    if (teamNumber === -1) {
        return;
    }
    const request = {
        range: RANGE,
        APIkey: API_KEY,
        sheetID: SHEET_ID,
        sheetName: SHEET_NAME,
        filter: { key: TEAMNUMBERHEADER, value: teamNumber },
    };
    GetCachedSheetData(request).then(i => DrawPaths(FormatAutonomousPaths(i), pathData));
}
function FormatAutonomousPaths(records) {
    return records?.map(x => DecodePolyline(x["Autonomous Path"] ?? "")) || [];
}
// ===== DISPLAY PANEL =====
const displayData = {};
export function SetDisplayValue(title, value) {
    displayData[title] = value;
}
export function GetDisplayData() {
    return displayData;
}
// ===== START =====
ClearCanvas();
loadTranslations();
//# sourceMappingURL=main.js.map