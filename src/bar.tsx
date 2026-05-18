import app from "ags/gtk4/app";
import { Astal, Gdk } from "ags/gtk4"
import { Accessor, createComputed, createState } from "gnim";
import { createTimePoll, padNumberStr } from "./utils";
import { WorkspaceDesc } from "./types";
import config from "./config";

import AstalHyprland from "gi://AstalHyprland";
const hyprland = AstalHyprland.get_default();

function leftWidgets() {
    const [focusedId, setFocusedId] = createState(0);
    const [workspaces, setWorkspaces] = createState<AstalHyprland.Workspace[]>(hyprland.workspaces);

    hyprland.connect("event", () => setFocusedId(hyprland.focusedWorkspace.id));
    hyprland.connect("workspace-added", () => setWorkspaces(hyprland.workspaces));
    hyprland.connect("workspace-removed", () => setWorkspaces(hyprland.workspaces));

    const configMap: Record<string, WorkspaceDesc> = {};
    config.workspaces.value()
        .forEach(wsDesc => configMap[`${wsDesc.id}`] = wsDesc);

    const grouped = config.workspaces.value().filter(ws => !ws.separated);
    const separated = config.workspaces.value().filter(ws => ws.separated);

    function workspaceIcon(ws: WorkspaceDesc) {
        const focused = createComputed(() => focusedId() === ws.id || !!ws.special);
        const exists = createComputed(() =>
            !!workspaces().find(workspace => workspace.id === ws.id)
        );

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

    return (
        <box $type="start" spacing={config.spacing.widgetSpacing}>
            <box class="widget">
                {grouped.map(workspaceIcon)}
            </box>
            <box>
                {separated.map(workspaceIcon)}
            </box>
        </box>
    );
}

function rightWidgets() {
    const time = createTimePoll();

    return (
        <box class="widget" $type="end" spacing={config.spacing.labelSpacing}>
            <label label={time.as(t => padNumberStr(t.hour))} />
            <label label={time.as(t => padNumberStr(t.minute))} class="accent" />
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
