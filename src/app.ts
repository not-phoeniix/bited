import app from "ags/gtk4/app";
import style from "./style.scss";
import { parseArgs } from "./arguments";
import bar from "./bar";
import launcher from "./launcher";
import volumePopup from "./volume_popup";
import config from "./config";

function run() {
    app.monitors.forEach((monitor, i) => {
        config.bars.value().forEach(b => {
            if (b.monitorIdx === i) {
                bar(b, monitor);
            }
        })

        volumePopup(monitor);
        launcher(monitor);
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
