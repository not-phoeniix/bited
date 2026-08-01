import AstalBluetooth from "gi://AstalBluetooth";
import AstalNetwork from "gi://AstalNetwork";
import AstalBattery from "gi://AstalBattery";
import AstalWp from "gi://AstalWp";
import { createBinding, createComputed } from "gnim";
import config from "./config";

export function batteryIcon(extraClass: string) {
    const battery = AstalBattery.get_default();

    const isLaptop =
        battery.deviceType === AstalBattery.Type.BATTERY &&
        battery.powerSupply === true;

    if (!isLaptop) {
        return null;
    }

    const percentage = createBinding(battery, "percentage");
    const state = createBinding(battery, "state");
    const icon = createComputed(() => {
        switch (state()) {
            case AstalBattery.State.DISCHARGING:
                const idx = Math.ceil(percentage() * config.batteryIcons.discharging.length) - 1;
                return config.batteryIcons.discharging[idx];
            case AstalBattery.State.CHARGING:
                return config.batteryIcons.charging;
            case AstalBattery.State.FULLY_CHARGED:
                return config.batteryIcons.full;
        }

        return config.batteryIcons.unknown;
    });

    const labelClass = createComputed(() => {
        let classes = [extraClass];
        if (state() === AstalBattery.State.CHARGING) {
            classes.push("alert");
        } else if (percentage() < 0.2) {
            classes.push("critical");
        }
        return classes.join(" ");
    });

    return (
        <label
            label={icon}
            class={labelClass}
        />
    );
}

export function bluetoothIcon(extraClass: string) {
    const bluetooth = AstalBluetooth.get_default();

    const isConnected = createBinding(bluetooth, "isConnected");
    const powered = createBinding(bluetooth, "isPowered");
    const text = createComputed(() => {
        if (isConnected()) {
            return config.bluetoothIcons.connected;
        } else if (powered()) {
            return config.bluetoothIcons.enabled;
        } else {
            return config.bluetoothIcons.disabled;
        }
    });

    return (
        <label
            label={text}
            // only show bluetooth icon if an adapter exists
            visible={createBinding(bluetooth, "adapter").as(a => !!a)}
            class={extraClass}
        />
    );
}

export function networkIcon(extraClass: string) {
    const network = AstalNetwork.get_default();

    const primary = createBinding(network, "primary");
    const wifiIcon = createBinding(network, "wifi").as(wifi => wifi?.iconName);
    const wiredIcon = createBinding(network, "wired").as(wired => wired?.iconName);

    const icon = createComputed(() => {
        let icon: string | undefined;

        switch (primary()) {
            case AstalNetwork.Primary.WIRED:
                icon = wiredIcon();
                break;
            case AstalNetwork.Primary.WIFI:
                icon = wifiIcon();
                break;
        }

        return icon ?? "network-error";
    });

    return (
        <image iconName={icon} class={extraClass} />
    );
}

export function volumeIcon(extraClass: string) {
    const audio = AstalWp.get_default();

    const ICON_MUTED = "󰝟";
    const ICONS_REGULAR = ["󰕿", "󰖀", "󰕾"];
    const defaultSpeaker = createBinding(audio, "defaultSpeaker");
    const volume = createBinding(defaultSpeaker(), "volume");
    const muted = createBinding(defaultSpeaker(), "mute");

    const label = createComputed(() => {
        let index = Math.floor(volume() * ICONS_REGULAR.length);
        if (index < 0) index = 0;
        if (index >= ICONS_REGULAR.length) index = ICONS_REGULAR.length - 1;
        return muted() ? ICON_MUTED : ICONS_REGULAR[index];
    });

    return (
        <label class={extraClass} label={label} />
    );
}

