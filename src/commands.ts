import { subprocess } from "ags/process";
import { execBash, fileExists, filterStringRecord, makePath, processScss } from "./utils";
import { Gtk } from "ags/gtk4";
import paths from "./paths";
import { isCommandDesc } from "./types";
import { clearDisplayedNotifs } from "./notifications";
import { readFile, writeFile } from "ags/file";
import style from "./style.scss.txt";
import app from "ags/gtk4/app";

let popovers: Record<string, Gtk.Popover[]> = {};
let windows: Record<string, Gtk.Window[]> = {};

// #region COMMAND FUNCTIONS 

type CommandFunc = (arg?: string) => string;
const COMMANDS: Record<string, CommandFunc> = Object.seal({
    toggle,
    list,
    notifs,
    theme,
    ping,
});

function toggle(panelName?: string) {
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

function list() {
    const panels = [
        ...Object.keys(popovers),
        ...Object.keys(windows),
    ].join(', ');

    return `registered panels:\n  ${panels}`;
}

function notifs(arg?: string) {
    if (arg === "clear") {
        clearDisplayedNotifs();
        return "notifs cleared!";
    }

    return `notifs arg '${arg}' not recognized!`;
}

function theme(file?: string) {
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

        app.apply_css(
            processScss(
                style,
                filterStringRecord(cssVars),
                makePath(paths.XDG_CACHE_DIR, "wal", "colors.scss")
            ),
            true
        );
        writeFile(paths.APP_CACHE_PREV_THEME_FILE, file);
        return `theme ${file} set!`;

    } catch (err) {
        return "error when parsing theme file: " + err;
    }
}

function ping() {
    return "pong :}";
}

// #endregion

// #region MISC MANAGEMENT FUNCTIONS

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

function respond(msg: string) {
    execBash(`echo '${msg}' > ${paths.APP_RUNTIME_OUT_PIPE_FILE}`);
}

function handlePipe(stdout: string) {
    console.log("request:", stdout);

    try {
        const desc = JSON.parse(stdout);
        // ignore response messages from us
        if (desc.msg) { return; }

        if (!isCommandDesc(desc)) {
            respond("command json in improper format!");
            return;
        }

        const cmd = COMMANDS[desc.cmd];
        if (!cmd) {
            respond(`command \'${cmd}\' not recognized!`);
        }

        respond(cmd(desc.arg));

    } catch (err) {
        respond("error parsing pipe message!");
    }
}

export function monitorPipe(path: string) {
    if (!fileExists(path)) {
        console.error("error, cannot monitor pipe, file does not exist!");
        return;
    }

    subprocess(
        `tail -f ${path}`,
        handlePipe,
        (err) => console.error(err)
    );
}

// #endregion