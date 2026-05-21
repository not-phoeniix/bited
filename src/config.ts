import { createComputed } from "gnim";
import { AppConfig } from "./types";
import { StateObject } from "./types";
import { stateObjectMap } from "./utils";

const DEFAULT_CONFIG: AppConfig = Object.seal<AppConfig>({
    barSize: 20,
    barLocation: "TOP",
    workspaces: [
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
        { id: 5 },
        { id: 6, icon: "", separated: true, },
        { id: 7, icon: "󰍡", separated: true, },
        { id: 8, icon: "", separated: true, },
        { id: -99, special: true, icon: "󱁤", separated: true, },
    ]
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

export default {
    ...config,
    barIsVertical: () => createComputed(() => {
        const loc = config.barLocation.value();
        return loc === "LEFT" || loc === "RIGHT";
    }),
    spacing,
    batteryIcons,
    bluetoothIcons,
    launcher,
};
