export declare const API_KEY = "AIzaSyDgIDCWpWFUeOyx0g8wuxbM-HDulR3saxk";
export declare const SHEET_ID = "1n2JIJXDuPiv5y9IbKyQrROachf2W4pz8ADWcptsfLKc";
interface SheetRequest {
    range?: string | undefined;
    APIkey?: string | undefined;
    sheetID?: string | undefined;
    sheetName?: string | undefined;
    filter?: Filter | undefined;
}
interface Filter {
    key: string;
    value: string | number;
}
export interface VertexPoint {
    x: number;
    y: number;
}
export declare function GetTranslations(): any;
export declare function DecodePolyline(str: string): VertexPoint[];
export declare function CompileAndAverage(records: Record<string, string>[]): Record<string, string>;
export declare function FetchSheetData(requestInput: SheetRequest | null): Promise<Record<string, string>[] | null>;
export declare function ClearCanvas(): void;
export declare function DrawPaths(paths: VertexPoint[][], pathData: PathData | null): void;
interface PathData {
    color1: {
        r: number;
        g: number;
        b: number;
    } | string;
    color2: {
        r: number;
        g: number;
        b: number;
    } | string;
    opacity: number;
}
export declare function ImportAndDrawPath(teamNumber?: number, pathData?: PathData | null): void;
export declare function SetDisplayValue(title: string, value: string): void;
export declare function GetDisplayData(): Record<string, string>;
export {};
//# sourceMappingURL=main.d.ts.map