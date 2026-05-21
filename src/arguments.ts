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

const panels: Record<string, Gtk.Popover[]> = {};

const HELP_MESSAGE = `
[bitshell] - A minimal GTK shell

Usage: bitshell [options]

Options: 
  help, -h, --help
    prints this message and exits

  message, -m, --message [MESSAGE]
    prints a specified message and exits

  toggle, -t, --toggle-panel [PANEL]
    toggles the visibility a panel
    possible panels include:
      - "calendar"
      - "quick_menu"
`.trim();

function printMessage(value?: string) {
    return value ?? "missing value!";
}

function printHelp() {
    return HELP_MESSAGE;
}

function togglePanel(panel?: string) {
    if (!panel || !panels[panel]) {
        return `panel "${panel}" not recognized!`;
    }

    const firstVisible = panels[panel][0]?.is_visible() ?? false;
    for (let popover of panels[panel]) {
        if (firstVisible) {
            popover.popdown();
        } else {
            popover.popup();
        }
    }

    return `panel "${panel}" toggled!`;
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

export function registerPanel(name: string, popover: Gtk.Popover) {
    panels[name] = [...(panels[name] ?? []), popover];
}
