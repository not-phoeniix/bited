import app from "ags/gtk4/app";
import style from "./style.scss";
import bar from "./bar";
import { createBinding, createEffect } from "gnim";
import { parseArgs } from "./arguments";

function run() {
    const monitors = createBinding(app, "monitors");

    createEffect(() => {
        monitors().map(bar);
    });
}

app.start({
    instanceName: "bitshell",
    css: style,
    main(...argv: string[]) {
        const parsedArgs = parseArgs(argv);
        if (parsedArgs.length > 0) {
            for (let arg of parsedArgs) {
                arg.func(arg.value);
            }
        } else {
            run();
        }
    },
});
