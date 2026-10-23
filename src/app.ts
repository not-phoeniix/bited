import app from "ags/gtk4/app";
import style from "./style.scss.txt";
import { deregisterAllPanels, parseArgs } from "./arguments";
import bar from "./bar";
import launcher from "./launcher";
import volumePopup from "./volume_popup";
import config, { monitorConfigFile } from "./config";
import paths, { makePath } from "./paths";
import { createBinding, createEffect } from "gnim";
import { Gtk } from "ags/gtk4";
import GObject from "gnim/gobject";
import notifications from "./notifications";
import { fileExists, filterStringRecord, processScss } from "./utils";
import { exec } from "ags/process";
import { readFile } from "ags/file";

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
                    notifications(monitor),
                );
            }
        });
    });
}

app.start({
    instanceName: "bited",
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
            exec("mkdir -p " + paths.APP_CACHE_DIR);
            app.apply_css(processScss(style, tryGetCssVars()));
            run();
        }
    },
});
