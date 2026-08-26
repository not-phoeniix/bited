import { Argument, ArgumentFunc } from "./types";
import { Gtk } from "ags/gtk4";

export const ARGS: Record<string, ArgumentFunc> = Object.seal({
    "help": printHelp,
    "--help": printHelp,
    "-h": printHelp,
    "message": printMessage,
    "--message": printMessage,
    "-m": printMessage,
    "toggle": togglePanel,
    "--toggle-panel": togglePanel,
    "-t": togglePanel,
});

const popovers: Record<string, Gtk.Popover[]> = {};
const windows: Record<string, Gtk.Window[]> = {};

const HELP_MESSAGE = (panelNames: string[]) => `
Usage: bited [OPTION]
A tiny custom GTK desktop environment

Options: 
  help, -h, --help
    prints this message and exits

  message, -m, --message [MESSAGE]
    prints a specified message and exits

  toggle, -t, --toggle-panel [PANEL]
    toggles the visibility of one of the following panels:
    [${panelNames.join(", ")}]

Examples:
  bited &\t\t\tlaunches bited asynchronously
  bited toggle launcher\ttoggles the app launcher
  bited -m hi\t\t"hi"
`.trim();

function printMessage(value?: string) {
    return value ?? "missing value!";
}

function printHelp() {
    return HELP_MESSAGE([
        ...Object.keys(popovers),
        ...Object.keys(windows)
    ]);
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

export function parseArgs(argv: string[]): Argument[] {
    let parsedArgs: Argument[] = [];

    for (let i = 0; i < argv.length; i++) {
        const name = argv[i];
        let value: string | undefined;

        let func = ARGS[name];
        if (!func) {
            print(`option "${name}" not recognized!`);
            func = ARGS["--help"];
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
