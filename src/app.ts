import app from "ags/gtk4/app";
import style from "./style.scss";
import { deregisterAllPanels, parseArgs } from "./arguments";
import bar from "./bar";
import launcher from "./launcher";
import volumePopup from "./volume_popup";
import config, { monitorConfigFile } from "./config";
import paths, { makePath } from "./paths";
import { createBinding, createEffect } from "gnim";
import { Gtk } from "ags/gtk4";
import GObject from "gnim/gobject";

function run() {
    monitorConfigFile(makePath(`${paths.APP_CONFIG_DIR}/config.json`));

    let currentWindows: GObject.Object[] = [];

    const monitors = createBinding(app, "monitors");
    // run every time monitor setup changes or config updates
    createEffect(() => {
        // destroy everything previous
        for (let window of currentWindows) {
            if (window instanceof Gtk.Window && window.get_surface() != null) {
                window.destroy();
            }
        }
        currentWindows.splice(0);
        deregisterAllPanels();

        // create new windows on each monitor change
        monitors().forEach((monitor, i) => {
            config.bars.value().forEach(b => {
                const indices = Array.isArray(b.monitorIdx)
                    ? b.monitorIdx
                    : [b.monitorIdx];

                const hasThisIndex = indices.findIndex((v) => v === i) !== -1;
                const hasAllIndices = indices.findIndex((v) => v === -1) !== -1;

                if (hasThisIndex || hasAllIndices) {
                    currentWindows.push(bar(b, monitor));
                }
            })

            // only apply popup and launcher to primary monitor
            if (i === 0) {
                currentWindows.push(
                    volumePopup(monitor),
                    launcher(monitor),
                );
            }
        });
    });
}

app.start({
    instanceName: "bited",
    css: style,
    requestHandler(argv: string[], res) {
        let retStr = "";

        for (let arg of parseArgs(argv)) {
            retStr += arg.func(arg.value);
        }

        res(retStr);
    },
    main(...argv: string[]) {
        const parsedArgs = parseArgs(argv);
        if (parsedArgs.length > 0) {
            let printStr = "";

            for (let arg of parsedArgs) {
                printStr += arg.func(arg.value);
            }

            print(printStr);

            app.quit();
        } else {
            run();
        }
    },
});
