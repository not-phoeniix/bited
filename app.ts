import { App } from "astal/gtk3";
import Bar from "./widgets/bar";
import * as Paths from "./extra/paths";
import * as Settings from "./extra/settings";
import Notifications, { clearNotifs } from "./widgets/notifications";
import Launcher from "./widgets/launcher";
import QuickMenu from "./widgets/quick_menu";
import VolumePopup from "./widgets/volume_popup";
import Dock from "./widgets/dock";
import Wallpapers from "./widgets/wallpapers";

App.start({
    css: Paths.cssCachePath,
    requestHandler(request: string, res: (response: any) => void) {
        switch (request) {
            case "clearNotifs":
                clearNotifs();
                res("cleared all notifs :D");
                break;

            default:
                res("request not recognized!");
                break;
        }
    },

    main() {
        Settings.init();

        const mainMonitor = App.get_monitors()[0];

        Notifications(mainMonitor);
        Launcher(mainMonitor);
        QuickMenu(mainMonitor, "quickMenu");
        VolumePopup(mainMonitor);
        Dock(mainMonitor);
        Bar(mainMonitor, `bar_0`);
        Wallpapers(mainMonitor);
    }
});
