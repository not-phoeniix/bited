import AstalApps from "gi://AstalApps";
import { App, Astal, Gdk, Gtk } from "astal/gtk3";
import { bind } from "astal";

const MAX_RESULTS = 6;

const apps = new AstalApps.Apps();

function appEntry(app: AstalApps.Application): JSX.Element {
    return <button
        onClicked={() => {
            App.toggle_window("appLauncher");
            app.launch();
        }}
        name={app.name}>
        <box spacing={20}>
            <icon icon={app.iconName || ""} iconSize={64} />
            <label label={app.name} />
        </box>
    </button>;
}

export default function (monitor: Gdk.Monitor): JSX.Element {
    // box with list of all apps ever
    const resultEntries = <box
        vertical={true}
        heightRequest={46 * MAX_RESULTS}
        visible={false}
        spacing={10}>
        {/* [unlimited apps but no apps] */}
    </box> as Astal.Box;

    apps.reload();

    function refreshApps(self: Gtk.Entry) {
        const newApps = apps.fuzzy_query(self.text).slice(0, MAX_RESULTS);

        if (self.text) {
            resultEntries.visible = true;
            resultEntries.children = newApps.map(appEntry);
        } else {
            resultEntries.children = [];
            resultEntries.visible = false;
        }
    }

    // search bar that filters box with list of all apps ever
    const searchBar = <entry
        hexpand={true}
        className="search-bar"
        css="padding: 0; border-radius: 0;"

        onChanged={refreshApps}

        onActivate={(self) => {
            App.toggle_window("appLauncher");
            const result = apps.fuzzy_query(self.text)[0];
            result?.launch();
        }}
    /> as Gtk.Entry;

    const refreshButton = <button
        onClick={(self) => {
            apps.reload();
            refreshApps(searchBar);
        }}
        label={""}
        visible={bind(searchBar, "text").as(t => !!t)}
    />;

    return <window
        visible={false}
        gdkmonitor={monitor}
        keymode={Astal.Keymode.ON_DEMAND}
        name="appLauncher"
        application={App}
        onKeyPressEvent={(self, event) => {
            if (event.get_keyval()[1] === Gdk.KEY_Escape) {
                self.visible = false;
            }
        }}
        setup={(self) => {
            self.connect("show", (window) => {
                if (window === self) {
                    searchBar.text = "";
                    searchBar.isFocus = true;
                }
            });
        }}>
        <box className="panel accent-border" css="margin: 20px;" widthRequest={600}>
            <box className="widget" vertical={true} spacing={15}>
                <box vertical={false} spacing={10} css="padding: 5px;">
                    {searchBar}
                    {refreshButton}
                </box>

                <box
                    className="thin-separator-horiz"
                    visible={bind(resultEntries, "visible")}
                />

                {resultEntries}
            </box>
        </box>
    </window>;
}