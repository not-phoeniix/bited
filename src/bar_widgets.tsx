import AstalHyprland from "gi://AstalHyprland";
import AstalTray from "gi://AstalTray";
import GLib from "gi://GLib";
import { Gtk } from "ags/gtk4";
import { Accessor, createBinding, createComputed, createState, For } from "gnim";
import { registerPanel } from "./arguments";
import config from "./config";
import { batteryIcon, bluetoothIcon, networkIcon, volumeIcon } from "./icons";
import quickMenu from "./quick_menu";
import { createTimePoll, padNumberStr } from "./utils";
import { WorkspaceDesc } from "./types";
import GObject from "gnim/gobject";
import KWM from "./kwm";

interface WidgetProps {
    orientation: Gtk.Orientation;
    alignment: "start" | "center" | "end";
};

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

export function tray(props: WidgetProps) {
    const tray = AstalTray.get_default();
    const trayItems = createBinding(tray, "items");

    return (
        <box
            class="widget"
            spacing={config.spacing.labelSpacing}
            visible={trayItems.as(i => i.length > 0)}
            orientation={props.orientation}
        >
            <For each={trayItems}>
                {trayIcon}
            </For>
        </box>
    );
}

export function statusIcons(props: WidgetProps) {
    return (
        <menubutton class="widget">
            <box spacing={config.spacing.widgetSpacing} orientation={props.orientation}>
                {networkIcon("bar-icon")}
                {volumeIcon("bar-icon")}
                {bluetoothIcon("bar-icon")}
                {batteryIcon("bar-icon")}
            </box>
            <popover $={(self) => registerPanel("quick_menu", self)}>
                {quickMenu()}
            </popover>
        </menubutton>
    );
}

export function timeCal(props: WidgetProps) {
    const time = createTimePoll();
    const [calendarDate, setCalendarDate] = createState(GLib.DateTime.new_now_local());

    return (
        <menubutton class="widget">
            <box spacing={config.spacing.labelSpacing} orientation={props.orientation}>
                <label label={time.as(t => padNumberStr(t.hour))} />
                <label label={time.as(t => padNumberStr(t.minute))} class="accent" />
            </box>
            <popover
                onShow={() => setCalendarDate(GLib.DateTime.new_now_local())}
                $={(self) => registerPanel("calendar", self)}
            >
                <Gtk.Calendar class="widget" date={calendarDate} />
            </popover>
        </menubutton>
    )
}

// TODO: windowTitleKwm

export function windowTitleHyprland(props: WidgetProps) {
    const hyprland = AstalHyprland.get_default();
    if (!hyprland) return (<box></box>);

    const focusedTitle = createBinding(hyprland, "focusedClient")
        .as(client => client.title);

    return (
        <box class="widget">
            <label label={focusedTitle} />
        </box>
    );
}

function workspacesGeneric(
    focusedIds: Accessor<number[]>,
    existsIds: Accessor<number[]>,
    onWsClicked: (ws: WorkspaceDesc) => void,
    props: WidgetProps
) {
    // can map from a workspace desc to a button widget
    function workspaceIcon(ws: WorkspaceDesc) {
        const focused = createComputed(
            () => focusedIds().find(id => id === ws.id) !== undefined || ws.special
        );
        const exists = createComputed(
            () => existsIds().find((id) => id === ws.id) !== undefined
        );

        return (
            <button
                label={exists.as(e => ws.icon ?? (e ? "" : ""))}
                class={focused.as(f => `workspace ${f ? "focused" : ""}`)}
                visible={exists.as(e => e || !ws.separated)}
                onClicked={() => onWsClicked(ws)}
            />
        );
    }

    // separate defined workspaces in config into "grouped" and 
    //   "separated" lists, and render in separate boxes later
    const grouped = createComputed(() => config.workspaces.value().filter(ws => !ws.separated));
    const separated = createComputed(() => config.workspaces.value().filter(ws => ws.separated));

    const reversed = props.alignment === "end";

    const children = [
        <box class="widget" orientation={props.orientation}>
            <For each={grouped.as(g => reversed ? g.reverse() : g)}>
                {workspaceIcon}
            </For>
        </box>,
        <box orientation={props.orientation}>
            <For each={separated.as(s => reversed ? s.reverse() : s)}>
                {workspaceIcon}
            </For>
        </box>
    ];

    return (
        <box
            spacing={config.spacing.widgetSpacing}
            orientation={props.orientation}
        >
            {reversed ? children.reverse() : children}
        </box>
    );
}

export function tagsKwm(props: WidgetProps) {
    const kwm = KWM.get_default();

    const activeTags = createBinding(kwm, "activeTags");
    const existingTags = activeTags;

    return workspacesGeneric(
        activeTags,
        existingTags,
        () => { },
        props
    );
}

export function workspacesHyprland(props: WidgetProps) {
    // hyprland state
    const hyprland = AstalHyprland.get_default();
    if (!hyprland) return (<box></box>);

    const focusedIds = createBinding(hyprland, "focusedWorkspace").as((ws) => [ws.id]);
    const existsIds = createBinding(hyprland, "workspaces")
        .as(workspaces => workspaces.map(ws => ws.id));

    return workspacesGeneric(
        focusedIds,
        existsIds,
        (ws) => {
            if (ws.id < 0) {
                hyprland.dispatch("togglespecialworkspace", "");
            } else {
                hyprland.dispatch("workspace", `${ws.id}`);
            }
        },
        props
    );
}

const FUNCTIONS: Record<string, (props: WidgetProps) => GObject.Object> = {
    tray,
    statusIcons,
    timeCal,
    windowTitleHyprland,
    tagsKwm,
    workspacesHyprland,
};

export function getWidgetByName(name: string) {
    if (name in FUNCTIONS) {
        return FUNCTIONS[name];
    }

    return null;
}
