import { execAsync } from "ags/process";
import { createPoll } from "ags/time";
import { StateObject, Time } from "./types";
import { createState } from "gnim";
import { Astal } from "ags/gtk4";
import Gio from "gi://Gio";

const DEFAULT_TIME: Time = Object.seal({
    hour: 0,
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
        const [hourStr, minStr, secStr, yearStr, monthStr, dayStr] =
            (await execAsync("date +%H,%M,%S,%Y,%m,%d")).split(",");

        return {
            hour: Number(hourStr),
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
