import app from "ags/gtk4/app";
import { Astal, Gdk, Gtk } from "ags/gtk4"
import config from "./config";
import { getWidgetByName } from "./bar_widgets";
import { BarDesc } from "./types";
import { isVertical } from "./utils";

function locToAnchor(loc: "LEFT" | "RIGHT" | "TOP" | "BOTTOM") {
    const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;
    switch (loc) {
        case "LEFT": return TOP | LEFT | BOTTOM;
        case "RIGHT": return TOP | RIGHT | BOTTOM;
        case "TOP": return LEFT | TOP | RIGHT;
        case "BOTTOM": return LEFT | BOTTOM | RIGHT;
    }
}

export default function bar(barConfig: BarDesc, monitor: Gdk.Monitor) {
    const { size, location, widgets } = barConfig;

    const anchor = locToAnchor(location);
    const orientation = isVertical(anchor)
        ? Gtk.Orientation.VERTICAL
        : Gtk.Orientation.HORIZONTAL;

    const mapWidgets = (names: string[], alignment: "start" | "center" | "end") => names
        .map(name => {
            const widget = getWidgetByName(name);
            if (!widget) {
                print(`WARNING: widget name "${name}" not recognized!`);
            }
            return widget;
        })
        .filter(w => !!w)
        .map(w => w({ orientation, alignment }));

    return (
        <window
            visible
            name="bar"
            gdkmonitor={monitor}
            application={app}
            exclusivity={Astal.Exclusivity.EXCLUSIVE}
            anchor={locToAnchor(location)}
        >
            <centerbox
                class="panel"
                css="border-radius: 0px;"
                widthRequest={size}
                heightRequest={size}
                orientation={orientation}
            >
                <box
                    $type="start"
                    spacing={config.spacing.widgetSpacing}
                    orientation={orientation}
                >
                    {mapWidgets(widgets.start ?? [], "start")}
                </box>

                <box
                    hexpand
                    halign={Gtk.Align.CENTER}
                    $type="center"
                    orientation={orientation}
                >
                    {mapWidgets(widgets.center ?? [], "center")}
                </box>

                <box
                    $type="end"
                    spacing={config.spacing.widgetSpacing}
                    orientation={orientation}
                >
                    {mapWidgets(widgets.end ?? [], "end")}
                </box>
            </centerbox>
        </window>
    );
}
