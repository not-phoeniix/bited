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
