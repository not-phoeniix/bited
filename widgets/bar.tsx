import { App, Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import { bind, execAsync, Variable } from "astal";
import AstalHyprland from "gi://AstalHyprland";
import * as Settings from "../extra/settings";
import { hour, hourMilit, minute } from "../extra/time";
import { networkIcon, batteryIcon, bluetoothIcon, volumeIcon } from "./icons";
import AstalTray from "gi://AstalTray";
import AstalNotifd from "gi://AstalNotifd";
import { Location } from "../extra/types";

const hyprland = AstalHyprland.get_default();
const tray = AstalTray.get_default();
const notifd = AstalNotifd.get_default();

// #region workspace widget things!!!!

// a singular workspace icon indicator/button
function wsIcon(workspace: { id?: number, name?: string, special?: boolean }, hideIfNotExist: boolean = false, iconOverwrite: string = ""): JSX.Element {
    // function that runs to update the internals of a workspace icon 
    //   whenever something changes in hyprland
    function updateWsIcon(button: Widget.Button, workspace: { id?: number, name?: string, special?: boolean }, hideIfNotExist: boolean, icon: string) {
        const focusedWs = hyprland.get_focused_workspace();

        let workspaceFocused = false;
        if (focusedWs.name === workspace.name) {
            workspaceFocused = true;
        }
        if (focusedWs.id === workspace.id) {
            workspaceFocused = true;
        }

        if (workspace.special) {
            workspace.name = "special:special";
            workspaceFocused = true;
        }

        const workspaceExists = hyprland.workspaces
            .some((ws) => ws.name === workspace.name || ws.id === workspace.id);

        button.toggleClassName("focused", workspaceFocused);
        button.label = icon != "" ? icon : workspaceExists ? "" : "";

        if (hideIfNotExist) {
            button.visible = workspaceExists;
        }
    }

    return <button
        onClick={() => {
            if (workspace.special) {
                hyprland.dispatch("togglespecialworkspace", "");
            } else {
                let dispatchArg = "";
                if (workspace.id) dispatchArg = workspace.id.toString();
                if (workspace.name) dispatchArg = `name:${workspace.name}`;

                hyprland.dispatch("workspace", dispatchArg);
            }
        }}
        className="workspace"
        setup={(self) => {
            const update = () => updateWsIcon(self, workspace, hideIfNotExist, iconOverwrite);
            self.hook(hyprland, "event", update);
            update();
        }} />;
}

// all workspace icons collected together
function workspaces(): JSX.Element {
    return <box spacing={20} vertical={bind(Settings.runtimeSettings.barIsVertical)}>
        <box
            className="widget"
            css="padding: 4px;"
            homogeneous={true}
            vertical={bind(Settings.runtimeSettings.barIsVertical)}>
            {wsIcon({ id: 1 })}
            {wsIcon({ id: 2 })}
            {wsIcon({ id: 3 })}
            {wsIcon({ id: 4 })}
            {wsIcon({ id: 5 })}
        </box>
        <box
            homogeneous={true}
            vertical={bind(Settings.runtimeSettings.barIsVertical)}>
            {wsIcon({ id: 6 }, true, "")}
            {wsIcon({ id: 7 }, true, "󰍡")}
            {wsIcon({ id: 8 }, true, "")}
            {wsIcon({ special: true }, true, "󱁤")}
        </box>
    </box>;
}

function focusedTitle() {
    const label = <label
        className="widget-label"
        maxWidthChars={40}
        truncate={true}
    /> as Widget.Label;

    label.hook(hyprland, "event", self => {
        self.label = hyprland.focusedClient?.title ?? "";
    });

    const visible = Variable.derive(
        [bind(label, "label"), Settings.runtimeSettings.barIsVertical],
        (l, v) => Boolean(l) && !v
    );

    return <box
        className="widget"
        visible={bind(visible)}>
        {label}
    </box>;
}

// #endregion

// #region time clock thingy :D 

function time(): JSX.Element {
    const hourDerived = Variable.derive(
        [hour, hourMilit, Settings.configSettings.use24hTime],
        (h, h24, use24) => use24 ? h24 : h
    )

    return <box className="widget">
        <box vertical={bind(Settings.runtimeSettings.barIsVertical)} spacing={8}>
            <label label={bind(hourDerived)} />
            <label label={bind(minute)} className="accent" />
        </box>
    </box>;
}

// #endregion

// #region status icons / quick settings button

function statusIcons(): JSX.Element {
    const quickMenu = App.get_window("quickMenu");

    return <button
        className={quickMenu ? bind(quickMenu, "visible").as(v => `widget ${v ? "open" : ""}`) : "widget"}
        onClick={() => {
            if (quickMenu) {
                quickMenu.visible = !quickMenu.visible;
            }
        }}>
        <box vertical={bind(Settings.runtimeSettings.barIsVertical)} spacing={10}>
            {networkIcon("bar-status-icon")}
            {bluetoothIcon("bar-status-icon")}
            {volumeIcon("bar-status-icon")}
            {batteryIcon("bar-status-icon")}
        </box>
    </button>;
}

// #endregion

// #region notification history

function notifHistory(): JSX.Element {
    // const notifHistory = App.get_window("notifHistory");
    const notifHistory: Gtk.Window | null = null;

    return <button
        className={notifHistory ? bind(notifHistory, "visible").as(v => `widget ${v ? "open" : ""}`) : "widget"}
        onClick={() => {
            // if (notifHistory) {
            //     notifHistory.visible = !notifHistory.visible;
            // }
        }}>
        <label
            label={bind(notifd, "dont_disturb").as(d => d ? "" : "")}
            className="widget-label"
        />
    </button>;
}

// #endregion

// #region system tray :]

function systemTray(): JSX.Element {
    function icon(item: AstalTray.TrayItem) {
        return <menubutton
            tooltipMarkup={bind(item, "tooltipMarkup")}
            className="tray-icon"
            usePopover={false}
            actionGroup={bind(item, "actionGroup").as(group => ["dbusmenu", group])}
            menuModel={bind(item, "menuModel")}>
            <icon gicon={bind(item, "gicon")} />
        </menubutton>;
    }

    return <box
        className="widget"
        visible={bind(tray, "items").as(items => items.length > 0)}
        vertical={bind(Settings.runtimeSettings.barIsVertical)}>
        {bind(tray, "items").as(items => items.map(icon))}
    </box>
}

// #endregion

function barWidgets(): JSX.Element {

    return <box vertical={bind(Settings.runtimeSettings.barIsVertical)}>
        { /* start widget, workspace things */}
        <box vertical={bind(Settings.runtimeSettings.barIsVertical)} spacing={10}>
            {workspaces()}
            {focusedTitle()}

            { /* expanding box to push above widgets to the start */}
            <box vexpand={true} hexpand={true} />
        </box>

        { /* middle widget, empty */}
        <box vertical={bind(Settings.runtimeSettings.barIsVertical)} spacing={10}>
        </box>

        {/* end widget, control panel things */}
        <box vertical={bind(Settings.runtimeSettings.barIsVertical)} spacing={10}>
            { /* expanding box to push below widgets to the end */}
            <box vexpand={true} hexpand={true} />

            {systemTray()}
            {notifHistory()}
            {statusIcons()}
            {time()}
        </box>

    </box>;
}

export default function (monitor: Gdk.Monitor, name: string): JSX.Element {
    return <window
        gdkmonitor={monitor}
        exclusivity={Astal.Exclusivity.EXCLUSIVE}
        name={name}
        application={App}
        anchor={bind(Settings.configSettings.barLocation).as(Location.toAnchorExpanded)}>
        <box
            vertical={bind(Settings.runtimeSettings.barIsVertical)}
            className="panel"
            css="border-radius: 0px;"
            widthRequest={bind(Settings.configSettings.barSize)}
            heightRequest={bind(Settings.configSettings.barSize)}>
            {barWidgets()}
        </box>
    </window>;
}