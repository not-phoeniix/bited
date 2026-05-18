import { bind } from "astal";
import { Astal, Gdk } from "astal/gtk3";
import AstalApps from "gi://AstalApps";
import AstalHyprland from "gi://AstalHyprland?version=0.1";
import * as Settings from "../extra/settings";
import { Location } from "../extra/types";

const hyprland = AstalHyprland.get_default();
const apps = new AstalApps.Apps();

function dockApp(app: AstalApps.Application) {
    if (!app) {
        return null;
    }

    return <button onClicked={() => app.launch()} tooltipMarkup={app.name}>
        <icon icon={app.iconName || ""} css={bind(Settings.configSettings.dockIconSize).as(s => `font-size: ${s}px;`)} />
    </button >;
}

function dockRow() {
    return <box spacing={5} css="margin: 10px;" className="panel" vertical={bind(Settings.runtimeSettings.dockIsVertical)}>
        {bind(Settings.configSettings.dockApps)
            .as(appNames => appNames.map(name => apps.fuzzy_query(name)[0]))
            .as(appObjects => appObjects.map(dockApp))}
    </box>;
}

export default function (monitor: Gdk.Monitor): JSX.Element {
    function checkFloating(window: Astal.Window) {
        window.visible = true;

        const focusedClient = hyprland.focusedClient;
        if (
            (focusedClient && !focusedClient.floating) ||
            hyprland.focusedWorkspace.hasFullscreen
        ) {
            window.visible = false;
        }
    }

    return <window
        anchor={bind(Settings.configSettings.dockLocation).as(Location.toAnchor)}
        setup={self => self.hook(hyprland, "event", checkFloating)}
        gdkmonitor={monitor}>
        {dockRow()}
    </window>;
}