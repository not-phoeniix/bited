import { Astal, Gdk, Gtk } from "ags/gtk4";
import app from "ags/gtk4/app";
import AstalNotifd from "gi://AstalNotifd";
import { createBinding, createComputed, createState, For } from "gnim";
import config from "./config";
import Pango from "gi://Pango";
import GLib from "gi://GLib";

function notifAction(action: AstalNotifd.Action, closeNotif: () => void) {
    return (
        <button
            class="notif-action-button"
            label={action.label}
            onClicked={() => {
                action.invoke();
                closeNotif();
            }}
        />
    );
}

function notification(notif: AstalNotifd.Notification, closeNotif: () => void) {
    const { VERTICAL, HORIZONTAL } = Gtk.Orientation;
    const { timeout } = config.notifPopups.value();

    const actions = createBinding(notif, "actions");
    const actionsComputed = createComputed(() => {
        const a = actions();
        if (a.length > 1) {
            return a;
        }

        return [];
    });
    let timeoutObj: GLib.Source | undefined = setTimeout(closeNotif, timeout);

    return (
        <box
            class="notification"
            orientation={HORIZONTAL}
            widthRequest={config.notifPopups.value.as(v => v.width)}
        >
            <Gtk.EventControllerLegacy onEvent={(_, event) => {
                const isButtonPress = event.get_event_type() === Gdk.EventType.BUTTON_PRESS;
                if (isButtonPress && event instanceof Gdk.ButtonEvent) {
                    if (event.get_button() === Gdk.BUTTON_PRIMARY) {
                        actions()[0]?.invoke();
                        closeNotif();
                    } else if (event.get_button() === Gdk.BUTTON_SECONDARY) {
                        closeNotif();
                    }
                }
            }} />

            <Gtk.EventControllerMotion onNotifyContainsPointer={(self) => {
                if (self.contains_pointer && timeoutObj) {
                    clearTimeout(timeoutObj);
                    timeoutObj = undefined;
                }

                if (!self.contains_pointer) {
                    if (timeoutObj) {
                        clearTimeout(timeoutObj);
                    }
                    timeoutObj = setTimeout(closeNotif, timeout);
                }
            }} />

            <box>
                <image
                    file={notif.image}
                    class="notif-image"
                    pixelSize={64}
                />
            </box>

            <box orientation={VERTICAL} spacing={config.spacing.notifSpacing / 2}>
                <box orientation={HORIZONTAL}>
                    <label
                        class="notif-title"
                        label={notif.summary}
                        useMarkup={true}
                        ellipsize={Pango.EllipsizeMode.END}
                        maxWidthChars={17}
                        halign={Gtk.Align.START}
                        lines={1}
                        justify={Gtk.Justification.LEFT}
                        hexpand={true}
                    />
                    <button
                        class="notif-close-button"
                        label={"\uf00d"}
                        onClicked={closeNotif}
                    />
                </box>

                <label
                    class="notif-body"
                    label={notif.body}
                    useMarkup={true}
                    ellipsize={Pango.EllipsizeMode.END}
                    maxWidthChars={25}
                    lines={3}
                    halign={Gtk.Align.START}
                    justify={Gtk.Justification.LEFT}
                    wrap={true}
                    wrapMode={Pango.WrapMode.WORD}
                    hexpand={true}
                />

                <box orientation={HORIZONTAL} homogeneous={true}>
                    <For each={actionsComputed}>
                        {(a) => notifAction(a, closeNotif)}
                    </For>
                </box>
            </box>
        </box>
    );
}

export default function notifications(monitor: Gdk.Monitor) {
    const notifd = AstalNotifd.get_default();

    if (!notifd) {
        console.warn("notifications daemon not found!");
        return (<box></box>);
    }

    const [notifList, setNotifList] = createState<AstalNotifd.Notification[]>([]);
    const [visible, setVisible] = createState(false);

    notifd.connect("notified", (_, id) => {
        const n = notifd.get_notification(id);
        if (n) {
            let newList = [n, ...notifList()];

            setVisible(true);

            const { maxVisibleNotifs } = config.notifPopups.value();
            const numOverLimit = Math.max(newList.length - maxVisibleNotifs, 0);
            newList = newList.slice(numOverLimit);

            setNotifList(newList);
        }
    });

    const { TOP, RIGHT } = Astal.WindowAnchor;
    return (
        <window
            visible={visible}
            css="background-color: transparent;"
            anchor={TOP | RIGHT}
            gdkmonitor={monitor}
            name="notifications"
            application={app}
            exclusivity={Astal.Exclusivity.EXCLUSIVE}
            layer={Astal.Layer.OVERLAY}
        >
            <box
                orientation={Gtk.Orientation.VERTICAL}
                spacing={config.spacing.notifSpacing}
                css="margin: 10px;"
            >
                <For each={notifList}>
                    {(self) => notification(
                        self,
                        () => {
                            const newList = notifList()
                                .slice()
                                .filter(n => n.id !== self.id);

                            if (newList.length == 0) {
                                setVisible(false);
                            }

                            setNotifList(newList);
                        }
                    )}
                </For>
            </box>
        </window>
    );
}
