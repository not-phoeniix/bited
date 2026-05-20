import app from "ags/gtk4/app";
import { Argument, ArgumentFunc } from "./types";

const ARGS: Record<string, ArgumentFunc> = Object.seal({
    "--help": printHelp,
    "-h": printHelp,
    "--message": printMessage,
    "-m": printMessage,
});

const HELP_MESSAGE = `
[bitshell] - A minimal GTK shell

Usage: bitshell [options]

Options: 
  -h, --help
    prints this message and exits

  -m, --message MESSAGE
    prints a specified message and exits
`;

function printMessage(value?: string) {
    print(value);
    app.quit();
}

function printHelp() {
    print(HELP_MESSAGE);
    app.quit();
}

function parseArgs(argv: string[]): Argument[] {
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

export {
    ARGS,
    parseArgs,
}
