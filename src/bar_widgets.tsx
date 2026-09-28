import AstalHyprland from "gi://AstalHyprland";
import AstalTray from "gi://AstalTray";
import GLib from "gi://GLib";
import { Gdk, Gtk } from "ags/gtk4";
import { Accessor, createBinding, createComputed, createState, For } from "gnim";
import { registerPanel } from "./arguments";
import config from "./config";
import { batteryIcon, bluetoothIcon, networkIcon, volumeIcon } from "./icons";
import quickMenu from "./quick_menu";
import { createTimePoll, padNumberStr } from "./utils";
import { isTimeCalConfig, isTypedArray, isWorkspaceDesc, isWorkspacesNiriConfig, WorkspaceDesc, WorkspacesNiriConfig } from "./types";
import GObject from "gnim/gobject";
import KWM from "./kwm";
import Niri, { NiriWorkspace } from "./niri";

interface WidgetProps {
    orientation: Gtk.Orientation;
    alignment: "start" | "center" | "end";
    widgetConfig: any;
    monitorConnector: string;
};

// example on how the hell to do this found at:
//   https://github.com/Aylur/ags/blob/main/examples/gtk4/simple-bar/Bar.tsx
export function tray(props: WidgetProps) {
    const tray = AstalTray.get_default();
    const trayItems = createBinding(tray, "items");

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
    const popoverPos = props.orientation == Gtk.Orientation.HORIZONTAL
        ? Gtk.PositionType.BOTTOM
        : Gtk.PositionType.RIGHT;

    return (
        <menubutton class="widget">
            <box spacing={config.spacing.widgetSpacing} orientation={props.orientation}>
                {networkIcon("bar-icon")}
                {volumeIcon("bar-icon")}
                {bluetoothIcon("bar-icon")}
                {batteryIcon("bar-icon")}
            </box>
            <popover
                position={popoverPos}
                $={(self) => registerPanel("quick_menu", self)}
            >
                {quickMenu()}
            </popover>
        </menubutton>
    );
}

export function timeCal(props: WidgetProps) {
    let { widgetConfig } = props;

    if (widgetConfig && !isTimeCalConfig(widgetConfig)) {
        console.warn("improper formatting for timeCal config!");
    }

    widgetConfig ??= {};
    widgetConfig.use24h ??= false;

    const time = createTimePoll();
    const [calendarDate, setCalendarDate] = createState(GLib.DateTime.new_now_local());

    return (
        <menubutton class="widget">
            <box spacing={config.spacing.labelSpacing} orientation={props.orientation}>
                <label label={time.as(t => padNumberStr(widgetConfig.use24h ? t.hour : t.hour12))} />
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

export function windowTitleNiri(props: WidgetProps) {
    if (props.orientation === Gtk.Orientation.VERTICAL) {
        return (<box></box>);
    }

    const niri = Niri.get_default();
    if (!niri) return (<box></box>);

    const focusedTitle = createBinding(niri, "focusedWindow")
        .as(w => w?.title || "");

    return (
        <box class="widget" visible={focusedTitle.as(t => t.length > 0)}>
            <label class="window-title" label={focusedTitle} />
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

        const { empty, notEmpty } = config.defaultWorkspaceIcons;
        return (
            <button
                label={exists.as(e => ws.icon ?? (e ? notEmpty : empty))}
                class={focused.as(f => `workspace ${f ? "focused" : ""}`)}
                visible={exists.as(e => e || !ws.separated)}
                onClicked={() => onWsClicked(ws)}
            />
        );
    }

    const workspaces = props.widgetConfig?.workspaces;
    if (!isTypedArray<WorkspaceDesc>(workspaces, isWorkspaceDesc)) {
        console.warn("error in parsing workspace descriptions!");
        return (<box></box>);
    }

    // separate defined workspaces in config into "grouped" and 
    //   "separated" lists, and render in separate boxes later
    const grouped = createComputed(() => workspaces.filter(ws => !ws.separated));
    const separated = createComputed(() => workspaces.filter(ws => ws.separated));

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

export function workspacesNiri(props: WidgetProps) {
    let { widgetConfig } = props;

    if (widgetConfig && !isWorkspacesNiriConfig(widgetConfig)) {
        console.warn("improper formatting for workspacesNiri config!");
    }

    widgetConfig ??= {};
    widgetConfig.namedWorkspaces ??= [];

    // niri state
    const niri = Niri.get_default();
    if (!niri) return (<box></box>);

    const workspaces = createBinding(niri, "workspaces")
        .as(workspaces => workspaces.sort((a, b) => a.idx - b.idx));
    const activeWorkspace = createBinding(niri, "activeWorkspace");

    function workspaceIcon(ws: NiriWorkspace) {
        let icon = (widgetConfig as WorkspacesNiriConfig).namedWorkspaces
            .find(namedWs => namedWs.name === ws.name)?.icon;

        if (!icon) {
            const { empty, notEmpty } = config.defaultWorkspaceIcons;

            if (ws.active_window_id !== null) {
                icon = notEmpty;
            } else {
                icon = empty;
            }
        }

        const isActive = activeWorkspace.as(active => active.id === ws.id);
        return (
            <button
                label={icon}
                class={isActive.as(a => `workspace ${a ? "focused" : ""}`)}
                onClicked={() => niri.action(`focus-workspace ${ws.idx}`)}
            />
        );
    }

    const reversed = props.alignment === "end";

    return (
        <box
            spacing={config.spacing.widgetSpacing}
            orientation={props.orientation}
        >
            <box class="widget" orientation={props.orientation}>
                <For each={workspaces
                    .as(wss => reversed ? wss.reverse() : wss)
                    .as(wss => wss.filter(w => w.output === props.monitorConnector))
                }>
                    {workspaceIcon}
                </For>
            </box>
        </box>
    );
}

const FUNCTIONS: Record<string, (props: WidgetProps) => GObject.Object> = {
    tray,
    statusIcons,
    timeCal,
    windowTitleHyprland,
    windowTitleNiri,
    tagsKwm,
    workspacesHyprland,
    workspacesNiri,
};

export function getWidgetByName(name: string) {
    if (name in FUNCTIONS) {
        return FUNCTIONS[name];
    }

    return null;
}
