import AstalWp from "gi://AstalWp";
import { Gdk, Gtk, Astal, Widget } from "astal/gtk3";
import { bind, Variable } from "astal";
import { volumeIcon } from "./icons";
import CustomBrightness from "../extra/brightness";

const audio = AstalWp.get_default()?.audio;
const brightness = CustomBrightness.get_default();

export default function (monitor: Gdk.Monitor) {
    const barHeight = 8;

    // set up visible variable and subscribe event so that 
    //   whenever "visible" changes to true it starts a timeout 
    //   for whenever it should be reset to false again
    const timeoutTime = 3000;
    let timeoutId = 0;
    const visible = Variable(false);
    visible.subscribe(isVisible => {
        if (isVisible) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => visible.set(false), timeoutTime).get_id();
        }
    });

    const page = Variable("volume");

    const volIcon = volumeIcon() as Widget.Label;

    // volume slider collection, is undefined when audio is falsy (null/undefined)
    const volSlider = !audio ? undefined :
        <box hexpand={true} name="volume" spacing={10}>
            {volIcon}
            <levelbar
                mode={Gtk.LevelBarMode.CONTINUOUS}
                hexpand={true}
                valign={Gtk.Align.CENTER}
                heightRequest={barHeight}
                setup={self => {
                    let muted = false;
                    let volume = 0;

                    self.hook(audio.defaultSpeaker, "notify", () => {
                        // only show bar when muted status or volume changes
                        if (
                            audio.defaultSpeaker.mute != muted ||
                            audio.defaultSpeaker.volume != volume
                        ) {
                            muted = audio.defaultSpeaker.mute;
                            volume = audio.defaultSpeaker.volume;

                            page.set("volume");
                            visible.set(true);
                            self.value = audio.defaultSpeaker.mute ? 0 : audio.defaultSpeaker.volume;
                            volIcon.toggleClassName("accent", muted);
                        }
                    });
                }}
            />
        </box>;

    // brightness slider collection, is undefined when brightness is falsy (null/undefined)
    const brightSlider = !brightness ? undefined :
        <box hexpand={true} name="brightness" spacing={10}>
            <label label="󰃠" />
            <levelbar
                mode={Gtk.LevelBarMode.CONTINUOUS}
                hexpand={true}
                valign={Gtk.Align.CENTER}
                heightRequest={barHeight}
                setup={self => self.hook(brightness, "notify", () => {
                    self.value = brightness.screen;
                    visible.set(true);
                    page.set("brightness");
                })}
            />
        </box>;

    // full window, "visible" variable and stack "page" variable are bound
    return <window
        gdkmonitor={monitor}
        visible={bind(visible)}
        layer={Astal.Layer.OVERLAY}
        anchor={Astal.WindowAnchor.BOTTOM}>
        <box className="volume-popup" css="margin: 10px;">
            <stack shown={bind(page)} widthRequest={400}>
                {volSlider}
                {brightSlider}
            </stack>
        </box>
    </window>;
}
