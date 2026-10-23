import { Argument, ArgumentFunc } from "./types";
import { Gtk } from "ags/gtk4";
import { clearDisplayedNotifs } from "./notifications";
import { readFile, writeFile } from "ags/file";
import app from "ags/gtk4/app";
import { fileExists, filterStringRecord, processScss } from "./utils";
import style from "./style.scss.txt";
import paths from "./paths";

interface ArgDesc {
    shortFlag: string;
    longFlag?: string;
    func: ArgumentFunc;
    helpMessage: {
        desc: string;
        parameter?: string;
    };
};

const ARGS: Record<string, ArgDesc> = Object.seal({
    "help": {
        shortFlag: "h",
        func: printHelp,
        helpMessage: {
            desc: "prints this message",
        },
    },

    "toggle": {
        shortFlag: "t",
        func: togglePanel,
        helpMessage: {
            desc: "toggles the visibility of a panel",
            parameter: "[PANEL]",
        },
    },

    "message": {
        shortFlag: "m",
        func: printMessage,
        helpMessage: {
            desc: "prints a message",
            parameter: "[MESSAGE]",
        },
    },

    "notifs": {
        shortFlag: "n",
        func: handleNotifs,
        helpMessage: {
            desc: "interfaces with notif daemon",
            parameter: "clear",
        },
    },

    "themeFile": {
        longFlag: "theme-file",
        shortFlag: "T",
        func: parseThemeFile,
        helpMessage: {
            desc: "loads custom CSS vars from a theme file",
            parameter: "[FILE_PATH]",
        },
    },
});

const SHORT_FLAG_PREFIX = "-";
const LONG_FLAG_PREFIX = "--";
const ARG_MAP: Record<string, ArgumentFunc> = Object.seal((() => {
    const retMap: Record<string, ArgumentFunc> = {};

    for (let key in ARGS) {
        let { shortFlag, longFlag, func } = ARGS[key];
        longFlag ||= key;

        retMap[key] = func;
        retMap[`${SHORT_FLAG_PREFIX}${shortFlag}`] = func;
        retMap[`${LONG_FLAG_PREFIX}${longFlag}`] = func;
    }

    return retMap;
})());

let popovers: Record<string, Gtk.Popover[]> = {};
let windows: Record<string, Gtk.Window[]> = {};


function printMessage(value?: string) {
    return value ?? "missing value!";
}

function printHelp() {
    let argsStr = "";
    for (const [key, value] of Object.entries(ARGS)) {
        const { desc, parameter } = value.helpMessage;

        argsStr += `  ${key}, --${value.longFlag || key}, -${value.shortFlag}`;
        if (parameter) {
            argsStr += ` ${parameter}`;
        }
        argsStr += "\n";

        argsStr += `    ${desc}\n`;
        argsStr += "\n";
    }

    return `
Usage: bited [OPTION]
A tiny custom GTK desktop environment

Options: 
${argsStr}
Examples:
  bited &              \tlaunches bited asynchronously
  bited toggle launcher\ttoggles the app launcher
  bited -m hi          \thi
`.trim();
}

function togglePanel(panelName?: string) {
    if (!panelName) {
        return `invalid panel name \"${panelName}\"!`;
    }

    const popoverList = popovers[panelName];
    const windowList = windows[panelName];

    if (!popoverList && !windowList) {
        return `panel name ${panelName} not recognized!`;
    }

    if (popoverList) {
        const firstVisible = popoverList[0]?.is_visible() ?? false;
        for (let popover of popoverList) {
            if (firstVisible) {
                popover.popdown();
            } else {
                popover.popup();
            }
        }
    }

    if (windowList) {
        const firstVisible = windowList[0]?.is_visible() ?? false;
        for (let window of windowList) {
            if (firstVisible) {
                window.hide();
            } else {
                window.show();
            }
        }
    }

    return `panel "${panelName}" toggled!`;
}

function handleNotifs(args?: string) {
    if (args === "clear") {
        clearDisplayedNotifs();
        return "notifs cleared!";
    }

    return "notifs arg not recognized!";
}

function parseThemeFile(file?: string) {
    if (!file) {
        return "missing file path!";
    }

    if (!fileExists(file)) {
        return "file doesn't exist!";
    }

    try {
        const fileContents = readFile(file);
        let { cssVars } = JSON.parse(fileContents);

        if (!cssVars) {
            cssVars = {};
        }

        app.apply_css(processScss(style, filterStringRecord(cssVars)), true);
        writeFile(paths.APP_CACHE_PREV_THEME_FILE, file);
        return `theme ${file} set!`;

    } catch (err) {
        return "error when parsing theme file: " + err;
    }
}

export function parseArgs(argv: string[]): Argument[] {
    let parsedArgs: Argument[] = [];

    for (let i = 0; i < argv.length; i++) {
        const name = argv[i];
        let value: string | undefined;

        let func = ARG_MAP[name];
        if (!func) {
            print(`option "${name}" not recognized!`);
            func = ARG_MAP["--help"];
        }

        if (func.length > 0) {
            value = argv[++i];
        }

        parsedArgs.push({ name, value, func });
    }

    // only print help once if it shows at all
    let helpArg = parsedArgs.find(arg => arg.func === printHelp);
    if (helpArg) {
        parsedArgs = [helpArg];
    }

    return parsedArgs;
}

export function registerPanel(name: string, panel: Gtk.Popover | Gtk.Window) {
    if (panel instanceof Gtk.Popover) {
        popovers[name] = [...(popovers[name] ?? []), panel];
    } else {
        windows[name] = [...(windows[name] ?? []), panel];
    }
}

export function deregisterAllPanels() {
    popovers = {};
    windows = {};
}
