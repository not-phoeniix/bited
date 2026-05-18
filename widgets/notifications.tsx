import AstalNotifd from "gi://AstalNotifd";
import { App, Astal, Gdk, Gtk, Widget } from "astal/gtk3";
import Pango from "gi://Pango";
import * as Settings from "../extra/settings";
import { bind } from "astal";
import AstalHyprland from "gi://AstalHyprland";
import { CornerLocation } from "../extra/types";

const notifd = AstalNotifd.get_default();
const hyprland = AstalHyprland.get_default();

// notifd settings setup
notifd.ignoreTimeout = false;
Settings.runtimeSettings.notifDnd.subscribe((dnd) => notifd.dontDisturb = dnd);

function action(notif: AstalNotifd.Notification, label: string, id: string): JSX.Element {
    return <button
        label={label}
        className="notif-action-button"
        onClick={() => {
            const client = hyprland.clients.find((client) => client.class == notif.appName);
            if (client) {
                hyprland.dispatch("workspace", `${client.workspace.id}`);
            } else {
                console.warn("can't find client that notif was sent from!");
            }

            notif.invoke(id);
            notif.dismiss();
        }}
    />;
}

function notification(notif: AstalNotifd.Notification): JSX.Element {
    // image content, either notification image or icon
    const imageSize = 70;
    let image;
    if (notif.image) {
        image = <box
            className="notif-image"
            css={`
                min-width: ${imageSize}px;
                min-height: ${imageSize}px;
                border-radius: 10px;
                background-image: url("${notif.image}");
                background-size: contain;
                background-repeat: no-repeat;
            `}
            vexpand={true} />;
    } else {
        image = <icon
            className="notif-app-icon"
            icon={notif.appIcon || "dialog-information-symbolic"}
            css={`font-size: ${imageSize}px;`} />;
    }

    // text content, both the summary and body of the notif, as well as action buttons
    const content = <box vertical={true} spacing={10}>
        {/* title and close button */}
        <box>
            <label
                className="notif-title"
                xalign={0}
                truncate={true}
                label={notif.summary} />
            <box hexpand={true} />
            <button
                className={"notif-close-button"}
                onClicked={() => notif.dismiss()}
                label="" />
        </box>

        {/* body */}
        <label
            className="notif-body"
            xalign={0}
            wrap={true}
            wrapMode={Pango.WrapMode.WORD_CHAR}
            label={notif.body} />

        {/* separator and actions */}
        <box className="thin-separator-horiz" visible={notif.actions.length > 0}></box>
        <box homogeneous={true}>
            {bind(notif, "actions").as(actions =>
                actions.map(a => action(notif, a.label, a.id))
            )}
        </box>
    </box>;

    // widget notif itself, combination of text and image content
    const widget = <box
        className="notification"
        spacing={15}>
        {image}
        {content}
    </box>;

    // notification dismiss timeout, manual because I couldn't 
    //   get actual built-in timeout to work lol
    if (!notifd.ignoreTimeout) {
        setTimeout(() => notif.dismiss(), Settings.configSettings.notifTimeout.get());
    }

    return <eventbox
        onClick={(_, event) => {
            if (event.button === Astal.MouseButton.SECONDARY) {
                notif.dismiss();
            }
        }}
        hexpand={true}
        name={notif.id.toString()}>
        {widget}
    </eventbox>;
}

function notifsList(): JSX.Element {
    function setup(box: Widget.Box) {
        // connect function called whenever a new notification
        //   is sent to the notification daemon
        notifd.connect("notified", (_, id) => {
            if (!notifd.dontDisturb) {
                const notif = notifd.get_notification(id);
                box.children = [...box.children, notification(notif)];
            }
        });

        // connect function called whenever a notification 
        //   is resolved/closed in some way
        notifd.connect("resolved", (_, id) => {
            // when dismissing, find the widget, remove it 
            //   from children and destroy it :]
            const widget = box.children.find(n => n.name === id.toString());
            box.children = box.children.filter((w) => w !== widget);
            widget?.destroy();
        });
    }

    return <box
        spacing={10}
        vertical={true}
        widthRequest={450}
        css="padding: 10px;"
        setup={setup} />;
}

export function clearNotifs() {
    notifd.notifications.forEach((notif) => notif.dismiss());
}

export default function (monitor: Gdk.Monitor): JSX.Element {
    return <window
        name={`notifications_${monitor}`}
        anchor={bind(Settings.configSettings.notifLocation).as(CornerLocation.toAnchor)}
        application={App}
        layer={Astal.Layer.OVERLAY}
        gdkmonitor={monitor}>
        {notifsList()}
    </window>;
}
