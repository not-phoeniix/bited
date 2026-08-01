import AstalWp from "gi://AstalWp";
import Brightness from "./brightness";
import { Astal, Gdk, Gtk } from "ags/gtk4";
import { Accessor, createBinding, createComputed, createEffect, createState } from "gnim";
import GLib from "gi://GLib";
import config from "./config";
import { Location } from "./types";
import GObject from "gnim/gobject";
import { volumeIcon } from "./icons";
import * as utils from "./utils";

function locToAnchor(loc: Location) {
    const { TOP, LEFT, RIGHT, BOTTOM } = Astal.WindowAnchor;
    switch (loc) {
        case "LEFT": return LEFT;
        case "RIGHT": return RIGHT;
        case "TOP": return TOP;
        case "BOTTOM": return BOTTOM;
    }
}

export default function volumePopup(monitor: Gdk.Monitor) {
    const audio = AstalWp.get_default();
    const brightness = Brightness.get_default();

    const [visible, setVisible] = createState(false);
    const [page, setPage] = createState<"VOLUME" | "BRIGHTNESS">("VOLUME");

    const defaultSpeaker = createBinding(audio, "defaultSpeaker");
    const volume = createBinding(defaultSpeaker(), "volume");
    const muted = createBinding(defaultSpeaker(), "mute");
    createEffect(() => {
        volume();
        muted();
        setVisible(true);
        setPage("VOLUME");
    });

    const screenBrightness = createBinding(brightness, "screen");
    createEffect(() => {
        screenBrightness();
        setVisible(true);
        setPage("BRIGHTNESS");
    });

    // any time visibility changes, make a timeout to 
    //   make it invisible again in a few seconds
    let timeout: GLib.Source | undefined;
    createEffect(() => {
        // track these variables too
        volume();
        muted();
        screenBrightness();

        if (visible()) {
            if (timeout) {
                clearTimeout(timeout);
            }

            timeout = setTimeout(
                () => setVisible(false),
                config.volumePopup.value().timeout
            );
        }
    });

    const anchor = locToAnchor(config.volumePopup.value().location);
    const vertical = utils.isVertical(anchor);
    const orientation = vertical
        ? Gtk.Orientation.VERTICAL
        : Gtk.Orientation.HORIZONTAL;

    const { width, height } = config.volumePopup.value();
    const barSlider = (name: string, icon: GObject.Object, value: Accessor<number>) => (
        <box
            hexpand={true}
            vexpand={true}
            name={name}
            spacing={10}
            orientation={orientation}
            visible={page.as(p => p === name)}
        >
            {icon}
            <levelbar
                mode={Gtk.LevelBarMode.CONTINUOUS}
                inverted={vertical}
                orientation={orientation}
                valign={Gtk.Align.CENTER}
                halign={Gtk.Align.CENTER}
                heightRequest={vertical ? width : height}
                widthRequest={vertical ? height : width}
                value={value}
            />
        </box>
    );

    return (
        <window
            gdkmonitor={monitor}
            visible={visible}
            layer={Astal.Layer.OVERLAY}
            anchor={anchor}
            css={"background-color: transparent;"}
        >
            <box class="volume-popup" css="margin: 10px;">
                {barSlider(
                    "BRIGHTNESS",
                    (<label label="󰃠" />),
                    screenBrightness
                )}
                {barSlider(
                    "VOLUME",
                    volumeIcon(""),
                    createComputed(() => muted() ? 0 : volume())
                )}
            </box>
        </window>
    );
}
