import app from "ags/gtk4/app";
import style from "./style.scss";
import bar from "./bar";
import { createBinding, createEffect } from "gnim";

app.start({
    css: style,
    main() {
        const monitors = createBinding(app, "monitors");

        createEffect(() => {
            monitors().map(bar);
        });
    },
});
