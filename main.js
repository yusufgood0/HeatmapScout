/*
 disabled as it confuses github's secret scanning. Just remember to create a .env file with API_KEY and SHEET_ID defined when running this locally.
 import dotenv from "dotenv";
 dotenv.config(); // loads variables from .env into process.env
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// or, if using plain TS with a custom build script:
export const API_KEY = process.env.API_KEY;
export const SHEET_ID = process.env.SHEET_ID;
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
// Optional: override full URL (leave null to auto-build)
const CUSTOM_URL = null;
let translations;
function loadTranslations() {
    return __awaiter(this, void 0, void 0, function* () {
        translations = yield fetch("../translations.json").then(r => r.json());
        console.log("Translations loaded:", translations);
    });
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
function DrawPolyLineWithGradiant(points, ctx, pathData) {
    var _a, _b, _c;
    if (points.length < 2)
        return;
    const color1 = hexToRgb((_a = pathData === null || pathData === void 0 ? void 0 : pathData.color1) !== null && _a !== void 0 ? _a : "#ff3c00");
    const color2 = hexToRgb((_b = pathData === null || pathData === void 0 ? void 0 : pathData.color2) !== null && _b !== void 0 ? _b : "#00ff00");
    const opacity = (_c = pathData === null || pathData === void 0 ? void 0 : pathData.opacity) !== null && _c !== void 0 ? _c : 0.1;
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
            var _a;
            obj[header] = (_a = row[i]) !== null && _a !== void 0 ? _a : "";
        });
        return obj;
    });
    if (filter) {
        return objects.filter(obj => { var _a; return obj[(_a = filter.key) !== null && _a !== void 0 ? _a : TEAMNUMBERHEADER] === String(filter.value); });
    }
    return objects;
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
        const forceString = key in (translations === null || translations === void 0 ? void 0 : translations.options) && key in translations.options;
        // FORCE STRING LOGIC
        if (forceString) {
            const counts = {};
            values.forEach(v => {
                var _a;
                counts[v] = ((_a = counts[v]) !== null && _a !== void 0 ? _a : 0) + 1;
            });
            const parts = Object.keys(counts).map(val => {
                var _a, _b;
                const percent = Math.round(((_a = counts[val]) !== null && _a !== void 0 ? _a : 0 / values.length) * 100);
                return `${(_b = translations === null || translations === void 0 ? void 0 : translations.options[key][val]) !== null && _b !== void 0 ? _b : val}: ${Math.round(percent / values.length)}%`;
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
                var _a;
                counts[v] = ((_a = counts[v]) !== null && _a !== void 0 ? _a : 0) + 1;
            });
            const parts = Object.keys(counts).map(val => {
                var _a;
                const percent = Math.round(((_a = counts[val]) !== null && _a !== void 0 ? _a : 0 / values.length) * 100);
                return `${val}: ${Math.round(percent / values.length)}%`;
            });
            result[key] = parts.join(", ");
        }
    }
    return result;
}
// ===== MAIN FETCH =====
export function FetchSheetData(requestInput) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        try {
            const request = requestInput !== null && requestInput !== void 0 ? requestInput : {};
            const sheetID = (_a = request.sheetID) !== null && _a !== void 0 ? _a : SHEET_ID;
            const sheetName = (_b = request.sheetName) !== null && _b !== void 0 ? _b : SHEET_NAME;
            const APIKey = (_c = request.APIkey) !== null && _c !== void 0 ? _c : API_KEY;
            const range = (_d = request.range) !== null && _d !== void 0 ? _d : RANGE;
            const url = CUSTOM_URL !== null && CUSTOM_URL !== void 0 ? CUSTOM_URL : `https://sheets.googleapis.com/v4/spreadsheets/${sheetID}/values/${sheetName}!${range}?key=${APIKey}`;
            const response = yield fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            const data = yield response.json();
            const parsed = rowsToObjects(data.values, (_e = request.filter) !== null && _e !== void 0 ? _e : null);
            return parsed;
        }
        catch (err) {
            console.error("Sheet fetch failed:", err);
            const output = document.getElementById("output");
            if (output) {
                output.textContent = "Failed to load sheet data.";
            }
            return null;
        }
    });
}
// ===== DISPLAY =====
function display(data) {
    const output = document.getElementById("output");
    if (!output)
        return;
    output.textContent = JSON.stringify(data, null, 2);
}
// ===== CANVAS =====
// ===== LOAD IMAGE =====
function loadBackgroundImage(src = "public/background.png") {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
}
// ===== REFRESH CANVAS =====
export function ClearCanvas() {
    const canvas = document.getElementById("myCanvas");
    const ctx = canvas.getContext("2d");
    if (!canvas || !ctx)
        return;
    loadBackgroundImage().then(img => {
        const aspectRatio = img.height / img.width;
        canvas.height = canvas.width * aspectRatio;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    });
}
// ===== DRAW PATHS =====
export function DrawPaths(paths, pathData) {
    const canvas = document.getElementById("myCanvas");
    const ctx = canvas.getContext("2d");
    if (!ctx || paths.length === 0)
        return;
    paths.forEach(path => {
        DrawPolyLineWithGradiant(path, ctx, pathData !== null && pathData !== void 0 ? pathData : null);
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
    FetchSheetData(request).then(i => DrawPaths((i === null || i === void 0 ? void 0 : i.map(x => { var _a; return DecodePolyline((_a = x["Autonomous Path"]) !== null && _a !== void 0 ? _a : ""); })) || [], pathData));
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