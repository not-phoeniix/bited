import { Gtk } from "ags/gtk4";
import AstalBattery from "gi://AstalBattery";
import { batteryIcon, networkIcon } from "./icons";
import config from "./config";
import { createBinding, createComputed, createState } from "gnim";
import GObject from "gnim/gobject";
import { execAsync } from "ags/process";
import AstalNetwork from "gi://AstalNetwork";
import AstalPowerProfiles from "gi://AstalPowerProfiles";
import { execAsyncBash, execBash, getEnv } from "./utils";

// #region widgets

function network() {
    const network = AstalNetwork.get_default();

    const primary = createBinding(network, "primary");
    const wifi = createBinding(network, "wifi");
    const primaryLabel = primary.as(p => {
        switch (p) {
            case AstalNetwork.Primary.WIRED:
                return "wired";
            case AstalNetwork.Primary.WIFI:
                return wifi()!.ssid;
            case AstalNetwork.Primary.UNKNOWN:
                return "unknown";
        }
    });

    return (
        <button
            class={wifi.as(w => `big-button ${w?.enabled ? "enabled" : ""}`)}
            onClicked={() => {
                if (network.wifi) {
                    network.wifi.enabled = !network.wifi.enabled;
                }
            }}
        >
            <box
                halign={Gtk.Align.CENTER}
                spacing={config.spacing.labelSpacing}
            >
                {networkIcon("")}
                <label label={primaryLabel} />
            </box>
        </button>
    );
}

function bluetooth() {
    return (
        <button class="big-button">
            <label label={"ohhh blutoth..\udb80\udcaf"} />
        </button>
    );
}

function powerprofile() {
    const power = AstalPowerProfiles.get_default();

    const activeProfile = createBinding(power, "active_profile");
    const allProfiles = power.get_profiles().map(p => p.profile);
    let idx = allProfiles.indexOf(power.activeProfile);

    return (
        <button class="big-button" onClicked={() => {
            idx++;
            if (idx >= allProfiles.length) {
                idx = 0;
            }

            power.set_active_profile(allProfiles[idx]);
        }}>
            <label label={activeProfile.as(a => `\udb85\udc0b ${a}`)} />
        </button>
    );
}

interface PacmanUpdateCountConfig {
    pollRateHours?: number;
    pollRateMinutes?: number;
    pollRateSeconds?: number;
    terminalCmd: string;
};

function isPacmanUpdateCountConfig(arg: any): arg is PacmanUpdateCountConfig {
    const isUndefOrNum = (a: any) => typeof a === "undefined" || typeof a === "number";

    return (
        typeof arg === "object" &&
        isUndefOrNum(arg.pollRateHours) &&
        isUndefOrNum(arg.pollRateMinutes) &&
        isUndefOrNum(arg.pollRateSeconds) &&
        typeof arg.terminalCmd === "string"
    );
}

const PACMAN_UPDATE_COUNT_DEFAULT_CONFIG: PacmanUpdateCountConfig = Object.seal({
    pollRateHours: 6,
    terminalCmd: getEnv("TERMINAL") || getEnv("TERM") || "xterm"
});

function pacmanUpdateCount(config: any) {
    let cfg = PACMAN_UPDATE_COUNT_DEFAULT_CONFIG;
    if (!isPacmanUpdateCountConfig(config)) {
        cfg = config;
    }

    let pollRate: number = 0;
    if (cfg.pollRateSeconds) pollRate += cfg.pollRateSeconds * 1000;
    if (cfg.pollRateMinutes) pollRate += cfg.pollRateMinutes * 1000 * 60;
    if (cfg.pollRateHours) pollRate += cfg.pollRateHours * 1000 * 60 * 60;


    const [updateablePackageCount, setUpdateablePackageCount] = createState("0");
    const pollUpdatablePackageCount = () =>
        execAsyncBash("pacman -Qu | wc -l")
            .then(setUpdateablePackageCount)
            .then(() => console.log("baha we polled <3"))
            .catch(console.error);

    pollUpdatablePackageCount();
    setInterval(pollUpdatablePackageCount, pollRate);

    return (
        <button class="big-button" onClicked={() => {
            pollUpdatablePackageCount();

            execAsync(`${cfg.terminalCmd} bash -c "
                sudo pacman -Syu && 
                echo 'press ENTER to exit :]' && 
                read
            "`).catch(console.error);
        }}>
            <Gtk.EventControllerMotion />

            <label label={updateablePackageCount.as(c => `\udb82\udcc7 ${c} pkgs`)} />
        </button>
    );
}

const WIDGETS: Record<string, (config: any) => GObject.Object> = Object.seal({
    network,
    bluetooth,
    powerprofile,
    pacmanUpdateCount,
});

// #endregion

function batteryBottomBarWidget() {
    const { labelSpacing } = config.spacing;
    const battery = AstalBattery.get_default();

    const batteryDeviceType = createBinding(battery, "deviceType");
    const batteryPercent = createBinding(battery, "percentage");
    const batteryPercentRounded = createComputed(() => {
        if (batteryDeviceType() !== AstalBattery.Type.BATTERY) {
            return -1;
        }

        return Math.round(batteryPercent() * 100);
    });

    const timeToFull = createBinding(battery, "timeToFull");
    const timeToEmpty = createBinding(battery, "timeToEmpty");
    const chargeTimeText = createComputed(() => {
        const pad = (num: number, padLen: number) => String(num).padStart(padLen, '0');
        const formatTime = (secs: number) => {
            const hours = Math.floor(secs / 60 / 60);
            const minutes = Math.floor((secs - (hours * 60 * 60)) / 60);
            return `${pad(hours, 2)}:${pad(minutes, 2)}`;
        }

        if (battery.charging) {
            return `${formatTime(timeToFull())} to full`;
        } else {
            return `${formatTime(timeToEmpty())} remaining`;
        }
    });

    return (
        <box class="widget">
            <box
                spacing={labelSpacing}
                visible={batteryPercentRounded.as(p => p >= 0)}
                hexpand
            >
                {batteryIcon("")}
                <label
                    label={batteryPercentRounded.as(p => `${p}%`)}
                />
                <label
                    label={chargeTimeText}
                    class="subtitle"
                />
            </box>
            <label class="accent static" label={config.quickMenu.value.as(
                v => execBash(`echo "${v.customTextFmt}"`)
            )} />
        </box>
    );
}

export default function quickMenu() {
    const { widgetSpacing } = config.spacing;
    const widgetConfig = config.quickMenu.value().widgetConfig || {};

    const widgetsContainer = createComputed(() => {
        const filteredWidgets = config.quickMenu.value().widgets
            .map(row => row
                .map(str => {
                    if (str in WIDGETS) {
                        return WIDGETS[str];
                    }

                    console.warn(`quick menu widget name '${str}' not recognized!`);
                    return null;
                })
                .filter(v => v !== null));

        const rowList = filteredWidgets
            .map(row => (
                <box spacing={widgetSpacing} homogeneous>
                    {...row.map(w => w(widgetConfig[w.name]))}
                </box>
            ));

        return (
            <box
                class="widget"
                spacing={widgetSpacing}
                orientation={Gtk.Orientation.VERTICAL}
            >
                {rowList}
            </box>
        );
    });

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={widgetSpacing}
            widthRequest={400}
        >
            {widgetsContainer()}
            {batteryBottomBarWidget()}
        </box>
    );
}
