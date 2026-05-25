import { Gtk } from "ags/gtk4";
import AstalBattery from "gi://AstalBattery";
import { batteryIcon } from "./icons";
import config from "./config";
import { createBinding, createComputed } from "gnim";

export default function quickMenu() {
    const battery = AstalBattery.get_default();
    const { widgetSpacing, labelSpacing } = config.spacing;

    const batteryDeviceType = createBinding(battery, "deviceType");
    const batteryPercent = createBinding(battery, "percentage");
    const batteryPercentRounded = createComputed(() => {
        if (batteryDeviceType() !== AstalBattery.Type.BATTERY) {
            return -1;
        }

        return Math.round(batteryPercent() * 100);
    });

    return (
        <box
            orientation={Gtk.Orientation.VERTICAL}
            spacing={widgetSpacing}
            widthRequest={400}
        >
            <box class="widget" spacing={widgetSpacing}>
                <label label="haha waow" />
                <label label="cool" />
            </box>

            <box class="widget">
                <box
                    spacing={labelSpacing}
                    visible={batteryPercentRounded.as(p => p >= 0)}
                >
                    {batteryIcon("")}
                    <label label={batteryPercentRounded.as(p => `${p}%`)} />
                </box>
                <box hexpand={true} />
                <label label="lol" />
            </box>

        </box>
    );
}
