import app from "ags/gtk4/app";
import style from "./style.scss.txt";
import bar from "./bar";
import launcher from "./launcher";
import volumePopup from "./volume_popup";
import config, { monitorConfigFile } from "./config";
import paths from "./paths";
import { createBinding, createEffect } from "gnim";
import { Gtk } from "ags/gtk4";
import GObject from "gnim/gobject";
import { notificationPopups } from "./notifications";
import { fileExists, filterStringRecord, processScss, makePath } from "./utils";
import { exec } from "ags/process";
import { readFile } from "ags/file";
import { deregisterAllPanels, monitorPipe } from "./commands";

function tryGetCssVars(): Record<string, string> {
    if (fileExists(paths.APP_CACHE_PREV_THEME_FILE)) {
        try {
            const prevThemePath = readFile(paths.APP_CACHE_PREV_THEME_FILE);
            if (!prevThemePath || !fileExists(prevThemePath)) {
                console.log("prev cached theme path missing or invalid");
                return {};
            }

            const themeFileContents = readFile(prevThemePath);
            const { cssVars } = JSON.parse(themeFileContents);

            if (!cssVars) {
                return {};
            }

            return filterStringRecord(cssVars);

        } catch (err) {
            console.log("error when parsing theme file: " + err);
            return {};
        }

    } else {
        console.log("prev cached theme file not found!");
        return {};
    }
}

function run() {
    monitorConfigFile(makePath(paths.APP_CONFIG_DIR, "config.json"));

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

        const primaryOutput = config.primaryOutput.value();

        // create new windows on each monitor change
        monitors().forEach((monitor) => {
            const monCon = monitor.get_connector() ?? " ???  ?   ??  unknown ? ??? ";

            config.bars.value().forEach(b => {
                const someOutputMatches =
                    monCon === b.output ||
                    (b.outputs?.find(o => o === monCon) !== undefined);

                const matchesDefault =
                    b.output === undefined &&
                    b.outputs === undefined &&
                    monCon === primaryOutput;

                // mutually exclusive
                if (someOutputMatches || matchesDefault) {
                    currentWindows.push(bar(b, monitor));
                }
            })

            // only apply popup and launcher to primary monitor
            if (monCon === primaryOutput) {
                currentWindows.push(
                    volumePopup(monitor),
                    launcher(monitor),
                    notificationPopups(monitor),
                );
            }
        });
    });
}

app.start({
    instanceName: "bited",
    main(...argv: string[]) {
        exec(`mkdir -p ${paths.APP_CACHE_DIR}`);
        exec(`mkdir -p ${paths.APP_RUNTIME_DIR}`);
        exec(`rm -f ${paths.APP_RUNTIME_IN_PIPE_FILE} ${paths.APP_RUNTIME_OUT_PIPE_FILE}`);
        exec(`mkfifo ${paths.APP_RUNTIME_IN_PIPE_FILE} ${paths.APP_RUNTIME_OUT_PIPE_FILE}`);
        monitorPipe(paths.APP_RUNTIME_IN_PIPE_FILE);

        app.apply_css(processScss(
            style,
            tryGetCssVars(),
            makePath(paths.XDG_CACHE_DIR, "wal", "colors.scss")
        ));
        run();
    },
});
