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
import notifications from "./notifications";
import { readFile } from "ags/file";
import { exec } from "ags/process";
import { hexToRgb } from "./utils";

function processScss(fileContent: string, overrideVars: Record<string, string>): string {
    const walScssVars = readFile(makePath(paths.XDG_CACHE_DIR, "wal", "colors.scss"));

    let overrideVarsCombined = "";
    for (let key in overrideVars) {
        let value = overrideVars[key].trim();
        if (value.match(/\$(color[0-9]+|background|foreground)/i)) {
            value = `#{${value}}`;
        }

        overrideVarsCombined += `--${key}: ${value}; `;
    }
    overrideVarsCombined = overrideVarsCombined.replace("\"", "\'");

    let combinedScss = walScssVars + fileContent;

    combinedScss = combinedScss.replace(
        // replacing this str: "/* <INSERT_CSS_VARS_HERE> */"
        /\/\*[ \t]*<INSERT_CSS_VARS_HERE>[ \t]*\*\//,
        overrideVarsCombined ? `:root { ${overrideVarsCombined} }` : ""
    );

    // compile scss
    let retStr = exec(`bash -c "echo -e '${combinedScss}' | sass --stdin"`);

    // replace all rgba hex codes w expanded rgb
    // retStr = retStr.replaceAll(/rgba\(\#([a-f\d]){6}/gi, str => {
    retStr = retStr.replaceAll(/rgba\(\#[a-f\d]{6}/gi, str => {
        const hex = str.replace(/rgba\(/i, "");
        const rgb = hexToRgb(hex);
        if (rgb) {
            const { r, g, b } = rgb;
            return `rgba(${r}, ${g}, ${b}`;
        }

        return str;
    });

    return retStr;
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

const RETRO_THEME_PRESET = {
    "color-accent": "$color6",
    "color-accent-2": "$color4",
    "color-shadow": "transparent",
    "border-radius-panel": "0px",
    "border-radius-widget": "0px",
    "border-radius-small": "0px",
    "border-radius-volume-popup": "0px",
    "border-widget": "3px inset var(--color-fg-2)",
    "border-panel": "2px groove $color7",
    "font-family": "'Serif Bold', Symbols Nerd Font",
    "font-size": "24px",
    "padding-panel": "3px",
    "padding-widget": "0px 5px",
    "padding-workspace-icon": "0 0.3em",
    "padding-button": "2px",
    "padding-small-item": "0px",
};

app.start({
    instanceName: "bited",
    css: processScss(style, {}),
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
