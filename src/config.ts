import { readFileAsync } from "ags/file";
import { AppConfig, isAppConfig } from "./types";
import { StateObject } from "./types";
import { stateObjectMap, monitorFile } from "./utils";

const DEFAULT_CONFIG: AppConfig = Object.seal<AppConfig>({
    bars: [
        {
            size: 30,
            location: "TOP",
            monitorIdx: -1,
            widgets: {
                start: ["timeCal"],
                end: ["tray", "statusIcons"],
            }
        }
    ],
    workspaces: Array(10).map((_, i) => ({ id: i + 1 })),
    volumePopup: {
        height: 8,
        width: 300,
        location: "RIGHT",
        timeout: 3000,
    }
});

const config: StateObject<AppConfig> = stateObjectMap(DEFAULT_CONFIG);

const spacing = Object.seal({
    labelSpacing: 5,
    widgetSpacing: 10,
});

const batteryIcons = Object.seal({
    charging: "󰂄",
    full: "󱈑",
    discharging: ["󱃍", "󰁻", "󰁼", "󰁽", "󰁾", "󰁿", "�", "�󰂁", "󰂂", "󰁹"],
    unknown: "󰂑",
});

const bluetoothIcons = Object.seal({
    connected: "󰂱",
    enabled: "󰂯",
    disabled: "󰂲",
});

const launcher = Object.seal({
    iconSize: 32,
    maxResults: 6,
    widthPx: 600,
});

async function loadFileConfig(path: string) {
    try {
        const str = await readFileAsync(path);
        const configParsed = JSON.parse(str);

        if (!isAppConfig(configParsed)) {
            console.warn(`WARNING: config file format at "${path}" not valid!`)
            return;
        }

        config.bars.set(configParsed.bars);
        config.workspaces.set(configParsed.workspaces);
        config.volumePopup.set(configParsed.volumePopup);

    } catch (err) {
        console.error(`CONFIG PARSE ERR: ${err}`);
    }
}

export function monitorConfigFile(path: string) {
    console.log(`monitoring config file "${path}"...`);

    try {
        loadFileConfig(path);
        monitorFile(path, loadFileConfig);
    } catch (err) {
        console.error(`ERR: ${err}`);
    }
}

export default {
    ...config,
    spacing,
    batteryIcons,
    bluetoothIcons,
    launcher,
};
