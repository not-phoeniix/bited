import AstalNetwork from "gi://AstalNetwork";
import AstalBattery from "gi://AstalBattery";
import AstalWp from "gi://AstalWp";
import AstalBluetooth from "gi://AstalBluetooth";
import { Widget } from "astal/gtk3";
import { bind } from "astal";

const battery = AstalBattery.get_default();
const network = AstalNetwork.get_default();
const audio = AstalWp.get_default()?.audio;
const bluetooth = AstalBluetooth.get_default();

export function batteryIcon(iconClass: string = ""): JSX.Element | null {
    // if battery exists and it uses a power supply (meaning it's 
    //   a laptop battery), then return a new bat icon
    if (battery && battery.powerSupply) {
        function update(icon: Widget.Label) {
            switch (battery.state) {
                case AstalBattery.State.DISCHARGING:
                    const icons = ["󱃍", "󰁻", "󰁼", "󰁽", "󰁾", "󰁿", "󰂀", "󰂁", "󰂂", "󰁹"];
                    const index = Math.ceil(battery.percentage * (icons.length)) - 1;
                    icon.label = icons[index];
                    break;
                case AstalBattery.State.CHARGING:
                    icon.label = "󰂄";
                    break;
                case AstalBattery.State.FULLY_CHARGED:
                    icon.label = "󱈑";
                    break;
                case AstalBattery.State.UNKNOWN:
                    break;
            }

            icon.tooltipText = `${AstalBattery.State[battery.state]}: ${battery.percentage * 100}%`;
            icon.toggleClassName("critical", battery.percentage <= 0.2 && !battery.charging);
            icon.toggleClassName("good", battery.state === AstalBattery.State.FULLY_CHARGED);
            icon.toggleClassName("alert", battery.state === AstalBattery.State.CHARGING);
        }

        return <label
            setup={(self) => {
                self.hook(battery, "notify", update);
                update(self);
            }}
            className={iconClass}
        />;

    } else {
        return null;
    }
}

export function networkIcon(iconClass: string = ""): JSX.Element | null {
    // return null if network could not be found
    if (!network) {
        return null;
    }

    // wifi icon bound to wifi network icon name, can be null 
    //   if wifi adapter doesn't exist
    const wifiIcon = network.wifi ? <icon
        icon={bind(network.wifi, "iconName")}
        name={AstalNetwork.Primary.WIFI.toString()}
        className={iconClass}
    /> : null;

    // wired icon bound to wired network icon name, can be null 
    //   if wired adapter doesn't exist
    const wiredIcon = network.wired ? <icon
        icon={bind(network.wired, "iconName")}
        name={AstalNetwork.Primary.WIRED.toString()}
        className={iconClass}
    /> : null;

    // unknown icon, will always be "network error" icon
    const unknownIcon = <icon
        icon="network-error"
        name={AstalNetwork.Primary.UNKNOWN.toString()}
        className={iconClass}
    />;

    // return stack of the three icons that is hooked into 
    //   the network to switch which is shown depending on 
    //   primary network
    return <stack shown={bind(network, "primary").as(p => p.toString())}>
        {unknownIcon}
        {wifiIcon}
        {wiredIcon}
    </stack>;
}

export function volumeIcon(iconClass: string = ""): JSX.Element | null {
    // return null if audio doesn't exist
    // TODO: prevent returning null here and just throw exceptions with invalid audio setups
    if (!audio) {
        return null;
    }

    // icon definitions
    const muted = "󰝟";
    const icons = ["󰕿", "󰖀", "󰕾"];

    // setup function, hooks self to audio's default speakers 
    //   to change icon every time speaker volume or muted 
    //   state changes
    function setup(label: Widget.Label) {
        if (!audio) {
            label.label = "aa";
            return;
        }

        label.hook(audio.defaultSpeaker, "notify", () => {
            let index = Math.floor(audio.defaultSpeaker.volume * icons.length);
            if (index < 0) index = 0;
            if (index >= icons.length) index = icons.length - 1;
            label.label = audio.defaultSpeaker.mute ? muted : icons[index];
        });
    }

    return <label className={iconClass} setup={setup} />;
}

export function bluetoothIcon(iconClass: string = ""): JSX.Element | null {
    // function to update icon depending on bluetooth status
    function changeLabel(self: Widget.Label) {
        if (bluetooth.isConnected) {
            self.label = "󰂱";
        } if (bluetooth.adapter.powered) {
            self.label = "󰂯";
        } else {
            self.label = "󰂲"
        }
    }

    // if bluetooth service and also adapter both exist, return a created label
    if (bluetooth?.adapter) {
        return <label
            className={iconClass}
            setup={self => {
                self.hook(bluetooth, "notify", changeLabel);
                changeLabel(self);
            }}
        />;
    }

    // otherwise return null
    return null;
}
