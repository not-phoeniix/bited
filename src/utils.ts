import { execAsync } from "ags/process";
import { createPoll } from "ags/time";
import { StateObject, Time } from "./types";
import { createState } from "gnim";
import { Astal } from "ags/gtk4";

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
        || anchor === (TOP | RIGHT | BOTTOM);
}
