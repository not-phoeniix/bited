import app from "ags/gtk4/app";
import { Argument, ArgumentFunc } from "./types";

type ArgumentSignature = { func: ArgumentFunc, hasValue: boolean };
const ARGS: Record<string, ArgumentSignature> = Object.seal({
    "--help": { func: printHelp, hasValue: false },
    "-h": { func: printHelp, hasValue: false },
});

const HELP_MESSAGE = `
[bitshell] - A minimal GTK shell

Usage: bitshell [options]

Options: 
    --help
        prints this message
`;

function printHelp() {
    print(HELP_MESSAGE);
    app.quit();
}

function parseArgs(argv: string[]): Argument[] {
    let parsedArgs: Argument[] = [];

    for (let i = 0; i < argv.length; i++) {
        const name = argv[i];
        let value: string | undefined;

        let arg = ARGS[name];
        if (!arg) {
            print(`argument "${name}" not recognized!`);
            arg = ARGS["--help"];
        }

        if (arg.hasValue) {
            value = argv[++i];
        }

        parsedArgs.push({ name, value, func: arg.func });
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
