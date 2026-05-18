import { App, Astal, Gdk, Widget } from "astal/gtk3";
import Settings from "../extra/settings";
import { bind } from "astal";

export default function (monitor: Gdk.Monitor, name: string): JSX.Element {
    return <window
        gdkmonitor={monitor}
        visible={false}
        name={name}
        application={App}
        anchor={Astal.WindowAnchor.NONE}>
        <box
            vertical={true}
            spacing={10}
            className="panel"
            css="margin: 10px;">
        </box>
    </window>;
}
