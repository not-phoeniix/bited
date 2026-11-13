import { exec, execAsync } from "ags/process";
import { createPoll } from "ags/time";
import { StateObject, Time } from "./types";
import { createState } from "gnim";
import { Astal } from "ags/gtk4";
import Gio from "gi://Gio";
import { readFile } from "ags/file";

export const escape = (str: string) => str
    .replaceAll(/\\/g, '\\\\')
    .replaceAll(/\'/g, '\\\'')
    .replaceAll(/\"/g, '\\\"')
    .replaceAll(/\`/g, '\\\`');
export const execBash = (...cmd: string[]) => exec(`bash -c '${cmd.join(' ')}'`);
export const execAsyncBash = (...cmd: string[]) => execAsync(`bash -c '${cmd.join(' ')}'`);
export const getEnv = (env: string) => execBash(`echo $${env}`);
export const makePath = (...paths: string[]) => paths.join("/").replaceAll(/\/+/g, "/");

const DEFAULT_TIME: Time = Object.seal({
    hour: 0,
    hour12: 12,
    minute: 0,
    second: 0,
    // was that the bite of 87
    year: 1987,
    month: 11,
    day: 15,
});

export function stateObjectMap<T>(obj: T): StateObject<T> {
    const mapped: any = {};

    for (let key in obj) {
        const initValue = obj[key];
        const [accessor, setter] = createState(initValue);
        mapped[key] = {
            value: accessor,
            set: setter
        };
    }

    return mapped as StateObject<T>;
}

export function createTimePoll(interval: number = 1000) {
    return createPoll<Time>(DEFAULT_TIME, interval, async () => {
        const [hourStr, hour12Str, minStr, secStr, yearStr, monthStr, dayStr] =
            (await execAsync("date +%H,%I,%M,%S,%Y,%m,%d")).split(",");

        return {
            hour: Number(hourStr),
            hour12: Number(hour12Str),
            minute: Number(minStr),
            second: Number(secStr),
            year: Number(yearStr),
            month: Number(monthStr),
            day: Number(dayStr),
        };
    });
}

export function padNumberStr(num: number | string, minDigits: number = 2): string {
    let str = `${num}`;
    const missingDigits = Math.max(minDigits - str.length, 0);
    return ("0".repeat(missingDigits)) + str;
}

export function isVertical(anchor: number) {
    const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;
    return anchor === (TOP | LEFT | BOTTOM)
        || anchor === (TOP | RIGHT | BOTTOM)
        || anchor === LEFT
        || anchor === RIGHT;
}

// keep in scope so they "survive".....................................................
const monitorFiles = new Set<Gio.FileMonitor>();

export function monitorFile(path: string, callback: (filePath: string) => void) {
    const originalFile = Gio.File.new_for_path(path);
    if (!originalFile.query_exists(null)) {
        return null;
    }

    const monitor = originalFile.monitor(Gio.FileMonitorFlags.WATCH_HARD_LINKS, null);

    monitor.connect("changed", (_, file, _2, e) => {
        const newPath = file.get_path();

        // don't operate on invalid or changed/moved file paths
        if (!newPath || newPath !== originalFile.get_path()) {
            return;
        }

        if (e === Gio.FileMonitorEvent.CHANGES_DONE_HINT) {
            callback(newPath);
        }
    });

    monitorFiles.add(monitor);
    return monitor;
}

export function cancelFileMonitor(monitor: Gio.FileMonitor) {
    monitorFiles.delete(monitor);
    monitor.cancel();
}

// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
export function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}


export function processScss(
    fileContent: string,
    overrideVars: Record<string, string>,
    walScssCachePath: string
): string {
    const walScssVars = readFile(walScssCachePath);

    let overrideVarsCombined = "";
    for (let key in overrideVars) {
        let value = overrideVars[key].trim();
        if (value.match(/\$(color[0-9]+|background|foreground)/i)) {
            value = `#{${value}}`;
        }

        overrideVarsCombined += `--${key}: ${value}; `;
    }
    overrideVarsCombined = overrideVarsCombined.replaceAll("\"", "\'");

    let combinedScss = walScssVars + fileContent;

    combinedScss = combinedScss.replace(
        // replacing this str: "/* <INSERT_CSS_VARS_HERE> */"
        /\/\*[ \t]*<INSERT_CSS_VARS_HERE>[ \t]*\*\//,
        overrideVarsCombined ? `:root { ${overrideVarsCombined} }` : ""
    );

    // compile scss
    let retStr = exec(`bash -c "sass --stdin <<'EOF'\n${combinedScss}\nEOF"`);

    // replace all rgba hex codes w expanded rgb
    // retStr = retStr.replaceAll(/rgba\(\#([a-f\d]){6}/gi, str => {
    retStr = retStr.replaceAll(/rgba\(\#[a-f\d]{6}/gi, str => {
        const hex = str.replace(/rgba\(/i, "");
        const rgb = hexToRgb(hex);
        if (rgb) {
            const { r, g, b } = rgb;
            return `rgba(${r}, ${g}, ${b}`;
        }

        return str;
    });

    return retStr;
}

export function fileExists(path: string) {
    return execBash(`[ -e '${path}' ] && echo 'true' || echo 'baha noooo baha nnnooooo'`) === "true";
}

export function filterStringRecord(arg: object): Record<string, string> {
    const ret: Record<string, string> = {};

    for (const [key, value] of Object.entries(arg)) {
        if (typeof value === "string") {
            ret[key] = value;
        }
    }

    return ret;
}
