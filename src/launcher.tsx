import AstalApps from "gi://AstalApps";
import app from "ags/gtk4/app";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import { Accessor, createBinding, createComputed, For } from "gnim";
import config from "./config";
import { registerPanel } from "./arguments";

const apps = new AstalApps.Apps();

function appEntry(sysApp: AstalApps.Application, window: Gtk.Window) {
    return (
        <button
            onClicked={() => {
                window.close();
                sysApp.launch();
            }}
            name={sysApp.name}
        >
            <box spacing={20}>
                <image
                    iconName={createBinding(sysApp, "iconName")}
                    pixelSize={config.launcher.iconSize}
                />
                <label label={createBinding(sysApp, "name")} />
            </box>
        </button>
    );
}

function innerWidgets(window: Gtk.Window) {
    let appQuery: Accessor<AstalApps.Application[]>;

    const entry = (
        <entry
            // clear out text upon window showing
            $={(self) => window.connect("show", () => self.text = "")}
            hexpand={true}
            class="search-bar"
            css="padding: 0; border-radius: 0;"
            onActivate={() => {
                window.hide();
                appQuery()[0]?.launch();
            }}
        />
    ) as Gtk.Entry;

    const entryText = createBinding(entry, "text");
    appQuery = createComputed(() => {
        return apps.fuzzy_query(entryText())
            .slice(0, config.launcher.maxResults)
    });

    return (
        <box
            class="widget" spacing={config.spacing.widgetSpacing}
            orientation={Gtk.Orientation.VERTICAL}
        >
            {entry}

            <box
                visible={entryText.as(text => !!text)}
                class="thin-separator-horiz"
            />

            <box
                orientation={Gtk.Orientation.VERTICAL}
                heightRequest={46 * config.launcher.maxResults}
                spacing={config.spacing.widgetSpacing}
                visible={entryText.as(text => !!text)}
            >
                <For each={appQuery}>
                    {(app) => appEntry(app, window)}
                </For>
            </box>

        </box>
    );
}

export default function launcher(monitor: Gdk.Monitor) {
    const window = (
        <window
            $={(self) => registerPanel("app_launcher", self)}
            css="background-color: transparent;"
            visible={false}
            gdkmonitor={monitor}
            keymode={Astal.Keymode.ON_DEMAND}
            name="app_launcher"
            application={app}
            onShow={() => apps.reload()}
        >
            <Gtk.EventControllerKey onKeyPressed={(source, key, _, mod) => {
                if (key === Gdk.KEY_Escape) {
                    window.hide();
                }
            }} />
        </window >
    ) as Gtk.Window;

    window.child = (
        <box
            class="panel accent-border"
            css="margin: 20px;"
            widthRequest={config.launcher.widthPx}
        >
            {innerWidgets(window)}
        </box>
    ) as Gtk.Box;

    return window;
}
