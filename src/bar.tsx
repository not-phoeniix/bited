import app from "ags/gtk4/app";
import { Astal, Gdk, Gtk } from "ags/gtk4"
import { Accessor, createBinding, createComputed, createState, For } from "gnim";
import AstalTray from "gi://AstalTray";
import AstalHyprland from "gi://AstalHyprland";
import { createTimePoll, padNumberStr } from "./utils";
import { WorkspaceDesc } from "./types";
import config from "./config";
import { batteryIcon, bluetoothIcon, networkIcon } from "./icons";

function leftWidgets() {
    // hyprland state
    const hyprland = AstalHyprland.get_default();
    const focusedId = createBinding(hyprland, "focusedWorkspace").as((ws) => ws.id);
    const workspaces = createBinding(hyprland, "workspaces");

    // can map from a workspace desc to a button widget
    function workspaceIcon(ws: WorkspaceDesc) {
        const focused = createComputed(() => focusedId() === ws.id || !!ws.special);
        const exists = createComputed(() => !!workspaces().find(({ id }) => id === ws.id));

        return (
            <button
                label={exists.as(e => ws.icon ?? (e ? "" : ""))}
                class={focused.as(f => `workspace ${f ? "focused" : ""}`)}
                visible={exists.as(e => e || !ws.separated)}
                onClicked={() => ws.id < 0
                    ? hyprland.dispatch("togglespecialworkspace", "")
                    : hyprland.dispatch("workspace", `${ws.id}`)
                }
            />
        );
    }

    // separate defined workspaces in config into "grouped" and 
    //   "separated" lists, and render in separate boxes later
    const grouped = createComputed(() => config.workspaces.value().filter(ws => !ws.separated));
    const separated = createComputed(() => config.workspaces.value().filter(ws => ws.separated));

    return (
        <box $type="start" spacing={config.spacing.widgetSpacing}>
            <box class="widget">
                <For each={grouped}>
                    {workspaceIcon}
                </For>
            </box>
            <box>
                <For each={separated}>
                    {workspaceIcon}
                </For>
            </box>
        </box>
    );
}

// example on how the hell to do this found at:
//   https://github.com/Aylur/ags/blob/main/examples/gtk4/simple-bar/Bar.tsx
function trayIcon(item: AstalTray.TrayItem) {
    return (
        <menubutton
            tooltipMarkup={item.tooltipMarkup}
            class="bar-icon"
            menuModel={item.menuModel}
            visible={!!item.id /* empty IDs won't show */}
            $={(self) => {
                self.insert_action_group("dbusmenu", item.actionGroup);
                item.connect("notify::action-group", () => {
                    self.insert_action_group("dbusmenu", item.actionGroup);
                });
            }}
        >
            <image pixelSize={20} gicon={createBinding(item, "gicon")} />
        </menubutton>
    );
}

function rightWidgets() {
    const tray = AstalTray.get_default();

    const trayItems = createBinding(tray, "items");
    const time = createTimePoll();

    return (
        <box $type="end" spacing={config.spacing.widgetSpacing}>
            {/* tray */}
            <box
                class="widget"
                spacing={config.spacing.labelSpacing}
                visible={trayItems.as(i => i.length > 0)}
            >
                <For each={trayItems}>
                    {trayIcon}
                </For>
            </box>

            {/* status icons */}
            <button class="widget" onClicked={() => print("open quick menu...")}>
                <box spacing={config.spacing.widgetSpacing}>
                    {networkIcon("bar-icon")}
                    {bluetoothIcon("bar-icon")}
                    {batteryIcon("bar-icon")}
                </box>
            </button>

            {/* time */}
            <box class="widget" spacing={config.spacing.labelSpacing}>
                <label label={time.as(t => padNumberStr(t.hour))} />
                <label label={time.as(t => padNumberStr(t.minute))} class="accent" />
            </box>
        </box>
    );
}

export default function bar(monitor: Gdk.Monitor) {
    const { TOP, LEFT, RIGHT } = Astal.WindowAnchor;
    const { barSize } = config;

    return (
        <window
            visible
            name="bar"
            gdkmonitor={monitor}
            application={app}
            exclusivity={Astal.Exclusivity.EXCLUSIVE}
            anchor={TOP | LEFT | RIGHT}
        >
            <centerbox
                class="panel"
                css="border-radius: 0px;"
                widthRequest={barSize.value}
                heightRequest={barSize.value}
            >
                {leftWidgets()}
                <box hexpand $type="center" />
                {rightWidgets()}
            </centerbox>
        </window>
    );
}
