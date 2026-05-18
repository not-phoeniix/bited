import { App, Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import { bind, Binding, execAsync, Variable, } from "astal";
import * as Settings from "../extra/settings";
import { batteryIcon, bluetoothIcon, networkIcon, volumeIcon } from "./icons";
import { day, monthNum, year } from "../extra/time";
import Calendar from "../extra/calendar";
import AstalNotifd from "gi://AstalNotifd";
import AstalNetwork from "gi://AstalNetwork";
import CustomBrightness from "../extra/brightness";
import AstalBattery from "gi://AstalBattery";
import AstalWp from "gi://AstalWp";
import AstalBluetooth from "gi://AstalBluetooth";
import AstalMpris from "gi://AstalMpris";
import AstalPowerProfiles from "gi://AstalPowerProfiles";
import { CornerLocation, Location } from "../extra/types";

const notifd = AstalNotifd.get_default();
const network = AstalNetwork.get_default();
const audio = AstalWp.get_default()?.audio;
const brightness = CustomBrightness.get_default();
const bluetooth = AstalBluetooth.get_default();
const battery = AstalBattery.get_default();
const spotify = AstalMpris.Player.new("spotify");
const powerProfiles = AstalPowerProfiles.get_default();

enum MenuPage { MAIN, WIFI, BLUETOOTH, AUDIO, NOTIFS, DISPLAY_MODE }

// #region big buttons

// a button function that has a control-center-toggle-like style, 
//   controls one system toggle, i.e. bluetooth, wifi, etc,
//   can have a page that leads to a different config page
function bigButton(
    icon: any,
    description: Widget.Label | undefined,
    onClick: (() => void) | undefined,
    enabledBind: Binding<boolean> | undefined,
    page: MenuPage | undefined = undefined,
    pageStack: Widget.Stack
) {
    // icon has any type so i am able to check if toggleClassName exists
    if (icon && typeof icon.toggleClassName === "function") {
        icon.toggleClassName("big-button-icon", true);
    }

    // description is always label (or undefined) so that's fine
    if (description) {
        description.hexpand = true;
        description.xalign = 0.0;
        description.toggleClassName("big-button-desc", true);
    }

    const pageSwitchButton = page ? <button
        label="󰅂"
        onClick={() => pageStack.shown = MenuPage[page]}
        className="page-switch-button"
    /> : undefined;

    return <eventbox
        className={enabledBind?.as(e => `big-button ${e ? "enabled" : ""}`) ?? "big-button"}
        widthRequest={220}>
        <box>
            <button
                hexpand={true}
                className="main-button"
                onClick={onClick}>
                <box spacing={10}>
                    {icon}
                    {description}
                </box>
            </button>

            {page ? <box className="thin-separator-vert" vexpand={true} /> : null}
            {pageSwitchButton}
        </box>
    </eventbox>;
};

function dndButton(pageStack: Widget.Stack) {
    return bigButton(
        new Widget.Label({ label: "" }),
        new Widget.Label({
            label: bind(notifd, "dontDisturb").as(d =>
                d ? "dnd on" : "dnd off")
        }),
        () => notifd.dontDisturb = !notifd.dontDisturb,
        bind(notifd, "dont_disturb"),
        undefined,
        pageStack
    );
}

function wifiButton(pageStack: Widget.Stack) {
    const ssid = Variable.derive(
        [bind(network.wifi, "ssid"), bind(network.wifi, "enabled")],
        (ssid, enabled) => enabled ? ssid : "disabled"
    );

    return bigButton(
        networkIcon(),
        new Widget.Label({ label: bind(ssid) }),
        () => network.wifi.enabled = !network.wifi.enabled,
        bind(network.wifi, "enabled"),
        MenuPage.WIFI,
        pageStack
    );
};

function btButton(pageStack: Widget.Stack) {
    function updateLabel(self: Widget.Label) {
        if (!bluetooth.adapter.powered) {
            self.label = "off";
        } else if (bluetooth.devices) {
            const connectedName = bluetooth.devices.find(d => d.connected)?.name;
            self.label = connectedName ?? "disconnected";
        } else {
            self.label = "err";
        }
    };

    return bigButton(
        bluetoothIcon(),
        new Widget.Label({
            setup: (self) => {
                self.hook(bluetooth, "notify", updateLabel);
                updateLabel(self);
            }
        }),
        () => bluetooth.adapter.powered = !bluetooth.adapter.powered,
        bind(bluetooth.adapter, "powered"),
        MenuPage.BLUETOOTH,
        pageStack
    );
}

function audioButton(pageStack: Widget.Stack) {
    if (!audio) {
        return undefined;
    }

    return bigButton(
        volumeIcon(),
        new Widget.Label({
            label: bind(audio.defaultSpeaker, "mute")
                .as(m => m ? "muted" : "unmuted")
        }),
        () => audio.defaultSpeaker.mute = !audio.defaultSpeaker.mute,
        bind(audio.defaultSpeaker, "mute").as(m => !m),
        MenuPage.AUDIO,
        pageStack
    );
}

function displayModeButton(pageStack: Widget.Stack) {
    return bigButton(
        <label label="󰍹" /> as Widget.Label,
        <label label="640x360@15Hz" /> as Widget.Label,
        undefined,
        undefined,
        MenuPage.DISPLAY_MODE,
        pageStack
    );
}

// this is an inside joke <3
function yummyYummyButton(pageStack: Widget.Stack) {
    return bigButton(
        new Widget.Label({ label: "😋" }),
        new Widget.Label({ label: "yummy yummy" }),
        () => execAsync(`notify-send "yummyyyyyy" "mmmm mm m mmmm mm yummersssss"`)
            .catch(() => print("ERROR IN YUMMY YUMMY NOTIFY SEND <3333")),
        undefined,
        undefined,
        pageStack
    );
}

function powerProfilesButton(pageStack: Widget.Stack) {
    const trueVar = Variable(true);

    return bigButton(
        <label label="󱐋" /> as Widget.Label,
        <label label={bind(powerProfiles, "activeProfile")} /> as Widget.Label,
        () => {
            // map profiles to an array of strings
            const profiles = powerProfiles.get_profiles().map(p => p.profile);

            // get current index and go to next index, 
            //   looping back to zero if exceeded bounds
            let i = profiles.indexOf(powerProfiles.activeProfile);
            i++;
            if (i >= profiles.length) i -= profiles.length;

            // set active profile to this next index value
            powerProfiles.activeProfile = profiles[i];
        },
        bind(trueVar),
        undefined,
        pageStack
    );
}

function bigButtonGrid(pageStack: Widget.Stack) {
    return <box vertical={true} homogeneous={true} spacing={10} className="widget">
        <box homogeneous={true} spacing={10}>
            {wifiButton(pageStack)}
            {btButton(pageStack)}
        </box>
        <box homogeneous={true} spacing={10}>
            {dndButton(pageStack)}
            {audioButton(pageStack)}
        </box>
        <box homogeneous={true} spacing={10}>
            {powerProfilesButton(pageStack)}
            {displayModeButton(pageStack)}
        </box>
    </box>;
}

// #endregion

// #region button pages

function page(layout: Gtk.Widget, page: MenuPage, pageStack: Widget.Stack) {
    return <box name={MenuPage[page]} vertical={true} spacing={10}>
        {layout}

        {/* <box vexpand={true} /> */}

        <box className="widget" css="padding: 5px">
            <button onClicked={() => pageStack.shown = MenuPage[MenuPage.MAIN]}>
                <label label="" className="page-nav-text" />
            </button>

            <box hexpand={true} />

            <label label={`[${MenuPage[page]}]`} className="page-nav-text accent" />
        </box>
    </box>;
}

function wifiPage(pageStack: Widget.Stack) {
    function wifiEntry(accessPoint: AstalNetwork.AccessPoint) {
        // function connect(password: string) {
        //     execAsync(`nmcli device wifi connect ${accessPoint.ssid} password ${password}`)
        //         .catch((err) => print(err))
        // }

        // const passwdEntry = <entry
        //     onActivate={(self) => connect(self.text)}
        //     className="wifi-passwd-entry"
        //     hexpand={true}
        // /> as Widget.Entry;

        // const passwdPopup = <box visible={true}>
        //     {passwdEntry}
        //     <button label="hi" onClicked={() => connect(passwdEntry.text)} />
        // </box>;

        const entryButton = <button
            onClick={() =>
                execAsync(`nmcli connection up ${accessPoint.ssid}`)
                    .catch((err) => print(err))}
            className={bind(network.wifi, "ssid").as(ssid => ssid === accessPoint.ssid ? "enabled" : "")}>
            <box spacing={10}>
                <icon iconName={bind(accessPoint, "iconName")} />
                <label label={accessPoint.ssid} />
                <box hexpand={true} />
            </box>
        </button>;

        return <box vertical={true}>
            {entryButton}
            {/* {passwdPopup} */}
        </box>;
    }

    const layout = <box vertical={true} spacing={10}>
        <box className="widget" spacing={5}>
            {networkIcon()}
            <button
                label={bind(network.wifi, "enabled").as(e => e ? "" : "󰨙")}
                // className={bind(network.wifi, "enabled").as(e => e ? "enabled" : "")}
                onClicked={() => network.wifi.enabled = !network.wifi.enabled}
            />

            <box hexpand={true} />

            <button label="" onClicked={() => execAsync("nm-connection-editor")} />
        </box>

        <scrollable className="widget" vexpand={true}>
            <box vertical={true}>
                {bind(network.wifi, "accessPoints")
                    // sort based on strength
                    .as(a => a.sort((a, b) => b.strength - a.strength))

                    // remove invalid/falsy ssid's
                    .as(a => a.filter((pt) => Boolean(pt.ssid)))

                    // remove duplicates
                    .as(a => {
                        const existing: string[] = [];
                        return a.filter((pt) => {
                            if (!existing.includes(pt.ssid)) {
                                existing.push(pt.ssid);
                                return true;
                            }

                            return false;
                        });
                    })

                    // map to entry widgets
                    .as(a => a.map(wifiEntry))}
            </box>
        </scrollable>
    </box>;

    // network.wifi.scan();

    return page(layout, MenuPage.WIFI, pageStack);
}

function audioPage(pageStack: Widget.Stack) {
    function endpointEntry(endpoint: AstalWp.Endpoint) {
        const desc: Variable<string> = Variable.derive(
            [bind(endpoint, "isDefault"), bind(endpoint, "description")],
            (isDefault, description) => isDefault ? "󰁔 " + description : description
        );

        return <button
            className={bind(endpoint, "isDefault").as(d => d ? "enabled" : "")}
            onClicked={() => execAsync(`wpctl set-default ${endpoint.id}`)}>
            <box>
                {/* <icon iconName={bind(endpoint, "icon")} /> */}
                <label label={bind(desc)} xalign={0.0} truncate={true} />
            </box>
        </button>;
    }

    const layout = <box vertical={true} spacing={10}>
        <box className="widget" vertical={true} vexpand={true} spacing={10}>
            <label label="output" />
            <box className="thin-separator-horiz" />
            <scrollable vexpand={true}>
                <box vertical={true}>
                    {bind(audio!, "speakers").as(d => d.map(endpointEntry))}
                </box>
            </scrollable>
        </box>

        <box className="widget" vertical={true} vexpand={true} spacing={10}>
            <label label="input" />
            <box className="thin-separator-horiz" />
            <scrollable vexpand={true}>
                <box vertical={true}>
                    {bind(audio!, "microphones").as(d => d.map(endpointEntry))}
                </box>
            </scrollable>
        </box>
    </box>;

    return page(layout, MenuPage.AUDIO, pageStack);
}

function displayModePage(pageStack: Widget.Stack) {
    function displayOption(label: string) {
        return <button>
            <label label={label} xalign={0.0} truncate={true} />
        </button>;
    }

    function monitorConfig(monitor: string) {
        return <box className="widget" vertical={true} spacing={10}>
            <label label={`${monitor} modes`} />
            <box className="thin-separator-horiz" />

            <box vertical={true}>
                {/* {bind(hyprland, "")} */}
                {/* {hyprland.monitors[0].availableModes.map(displayOption)} */}
                {displayOption("2880x1920@120.00Hz")}
                {displayOption("2880x1920@60.00Hz")}
            </box>
        </box>;
    }

    const layout = <box vertical={true} spacing={10} vexpand={true}>
        <box className="widget">
            <label label="display modes" />
        </box>

        <scrollable vexpand={true}>
            <box vertical={true} spacing={10}>
                {monitorConfig("eDP-1")}
            </box>
        </scrollable>
    </box>;

    return page(layout, MenuPage.DISPLAY_MODE, pageStack);
}

// #endregion

// #region main page !!

function volBrightBars() {
    const barHeight = 10;

    const volumeBar = <levelbar
        mode={Gtk.LevelBarMode.CONTINUOUS}
        hexpand={true}
        valign={Gtk.Align.CENTER}
        heightRequest={barHeight}
        setup={self => {
            // only if audio exists, then hook self into audio speaker thingy
            if (audio) {
                self.hook(
                    audio.defaultSpeaker,
                    "notify",
                    () => self.value = audio.defaultSpeaker.mute ? 0 : audio.defaultSpeaker.volume
                );
            }
        }}
    />;

    const brightnessBar = <levelbar
        mode={Gtk.LevelBarMode.CONTINUOUS}
        hexpand={true}
        heightRequest={barHeight}
        valign={Gtk.Align.CENTER}
        value={bind(brightness, "screen")}
    />;

    return <box className="widget" vertical={false} spacing={10}>
        <box vertical={true} spacing={10} vexpand={true} homogeneous={true}>
            {volumeIcon()}
            <label label="󰃠" />
        </box>
        <box vertical={true} spacing={10} vexpand={true} homogeneous={true}>
            {volumeBar}
            {brightnessBar}
        </box>
    </box>;
}

function secToHrMinStr(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds - (hours * 3600)) / 60);
    const hourStr = `${hours < 10 ? "0" : ""}${hours}`;
    const minStr = `${mins < 10 ? "0" : ""}${mins}`;
    return `${hourStr}:${minStr}`;
}

function secToMinSecStr(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds - (60 * minutes));
    const minStr = `${minutes < 10 ? "0" : ""}${minutes}`;
    const secStr = `${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
    return `${minStr}:${secStr}`;
}

function bottomSysWidgets(calPanelRef: Widget.Box) {
    return <box className="widget" spacing={10}>
        {batteryIcon()}
        <label label={bind(battery, "percentage").as(b => `${Math.round(b * 100)}%`)} />

        <box hexpand={true} />

        <label
            visible={bind(battery, "charging").as(c => !c)}
            label={bind(battery, "timeToEmpty").as(sec => `${secToHrMinStr(sec)} left`)}
            className="bat-time"
        />
        <label
            visible={bind(battery, "charging")}
            label={bind(battery, "timeToFull").as(sec => `${secToHrMinStr(sec)} to full`)}
            className="bat-time"
        />

        <box hexpand={true} />

        <button
            label="󰃭"
            onClick={(self) => {
                calPanelRef.visible = !calPanelRef.visible;
                self.toggleClassName("enabled", calPanelRef.visible);
            }}
        />
        <button label="⏻" />
    </box>

}

function nowPlaying() {
    const widgetHeight = 120;

    // set up widgets for nowplaying to be updated in the update() function
    const songTitle = <label truncate={true} xalign={0.0} className="now-playing-title" /> as Widget.Label;
    const songArtist = <label truncate={true} xalign={0.0} className="now-playing-artist" /> as Widget.Label;
    const songArt = <box widthRequest={widgetHeight - 10} className="now-playing-art" /> as Widget.Box;
    const playerIcon = <label
        className="now-playing-player-icon"
        label=""
        valign={Gtk.Align.START}
        halign={Gtk.Align.END}
    /> as Widget.Label;
    const progressBar = <levelbar
        mode={Gtk.LevelBarMode.CONTINUOUS}
        hexpand={true}
        heightRequest={4}
        valign={Gtk.Align.CENTER}
    /> as Widget.LevelBar;
    const positionLabel = <label className="now-playing-time" /> as Widget.Label;
    const lengthLabel = <label className="now-playing-time" /> as Widget.Label;

    // function that updates the content of previous widget references 
    //   depending on the currently playing song in a passed-in player
    function update(self: Widget.Box, player: AstalMpris.Player) {
        self.visible = player.available;

        if (player.available) {
            songTitle.label = player.title;
            songArtist.label = player.artist;
            songArt.css = `background-image: url("${player.artUrl}");`;
            progressBar.value = player.position / player.length;
            lengthLabel.label = secToMinSecStr(player.length);
            positionLabel.label = secToMinSecStr(player.position);
        }
    }

    // actual box layout return, hooked into spotify player
    return <box
        className="widget"
        heightRequest={widgetHeight}
        vertical={false}
        spacing={5}
        setup={self => {
            self.hook(spotify, "notify", () => update(self, spotify));
            update(self, spotify);
        }}
    >
        {songArt}
        <overlay>
            <box vertical={true} hexpand={true} spacing={5} css="padding: 5px;">
                <box vexpand={true} vertical={true}>
                    {songTitle}
                    {songArtist}
                </box>
                <box spacing={5}>
                    {positionLabel}
                    {progressBar}
                    {lengthLabel}
                </box>
            </box>
            {playerIcon}
        </overlay>
    </box>;
}

function mainPage(pageStack: Widget.Stack, calPanelRef: Widget.Box) {
    return <box
        vertical={true}
        name={MenuPage[MenuPage.MAIN]}
        spacing={10}>
        {bigButtonGrid(pageStack)}
        {nowPlaying()}
        {volBrightBars()}
        {bottomSysWidgets(calPanelRef)}
    </box>;
}

// #endregion

// #region panels themselves

function resetCal(cal: Calendar) {
    if (!cal) return;
    cal.day = Number(day.get());
    cal.month = Number(monthNum.get()) - 1;
    cal.year = Number(year.get());
}

function calendarPanel(): Widget.Box {
    return <box
        setup={self => self.connect("show", () => resetCal(self.child as Calendar))}
        className="panel"
        visible={false}>
        <Calendar
            day={bind(day).as(d => Number(d))}
            month={bind(monthNum).as(m => Number(m) - 1)}
            year={bind(year).as(y => Number(y))}
            className="widget"
            hexpand={true}
        />
    </box> as Widget.Box;
}

// full panel, contains all quick settings and 
//   notifications in the quick menu
function settingsPanel(calPanelRef: Widget.Box) {
    const pageStack = new Widget.Stack();
    pageStack.set_children([
        mainPage(pageStack, calPanelRef),
        wifiPage(pageStack),
        audioPage(pageStack),
        displayModePage(pageStack)
    ]);

    return <box className="panel" vertical={true} spacing={10}>
        {pageStack}
    </box>;
}

// #endregion

export default function (monitor: Gdk.Monitor, name: string): JSX.Element {
    let calendar: Widget.Box;
    
    const anchorBinding = bind(Settings.configSettings.barLocation).as(l => {
        switch (l) {
            case Location.TOP: return CornerLocation.TOP_RIGHT;
            case Location.LEFT: return CornerLocation.BOTTOM_LEFT;
            case Location.RIGHT: return CornerLocation.BOTTOM_RIGHT;
            case Location.BOTTOM: return CornerLocation.BOTTOM_RIGHT
        }
    }).as(CornerLocation.toAnchor);

    return <window
        gdkmonitor={monitor}
        visible={false}
        name={name}
        application={App}
        setup={self => self.connect("show", () => resetCal(calendar.child as Calendar))}
        anchor={anchorBinding}>
        <box
            vertical={true}
            spacing={10}
            css="margin: 10px;">

            {/* swap layout & calendar location if bar is on top of screen */}
            {bind(Settings.configSettings.barLocation)
                .as(loc => {
                    calendar = calendarPanel();
                    const main = settingsPanel(calendar);

                    return loc === Location.TOP ?
                        [main, calendar] :
                        [calendar, main]
                })}
        </box>
    </window>;
}
