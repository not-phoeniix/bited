import { App } from "astal/gtk3";
import { monitorFile } from "astal/file";
import { exec } from "astal/process";
import { GLib } from "astal";

export const cacheDir = `${GLib.get_user_cache_dir()}/astal/`;
export const cssCachePath = `${cacheDir}style.css`;
export const configDir = `${GLib.get_user_config_dir()}/desktop/`;
export const themesDir = `${configDir}/themes/`;
export const settingsFile = `${configDir}config.json`;
export const homeDir = `/home/${GLib.get_user_name()}/`
const walCacheDir = `${GLib.get_user_cache_dir()}/wal/`;

exec("mkdir -p " + cacheDir);

// set cache path and monitor style file to re-compile css 
//   every time it changes and hot-reload the program's styling
function reloadCss() {
    exec(["sass", `--load-path=${walCacheDir}`, `./style.scss:${cssCachePath}`]);
    App.reset_css();
    App.apply_css(cssCachePath);
}

monitorFile("./style.scss", reloadCss);
reloadCss();
