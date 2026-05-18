import { exec, monitorFile, readFile, Variable, writeFile } from "astal";
import { ConfigSettings, RuntimeSettings, Location, SettingsValue, JsonValue, SettingsDesc, CornerLocation } from "./types";
import * as paths from "./paths";

// #region settings variables

export const configSettings: ConfigSettings = {
    barLocation: Variable(Location.TOP),
    dockLocation: Variable(Location.BOTTOM),
    barSize: Variable(30),
    notifTimeout: Variable(8000),
    notifLocation: Variable(CornerLocation.TOP_RIGHT),
    dockApps: Variable([]),
    dockIconSize: Variable(45),
    wallpaperDir: Variable("~/Pictures/wallpapers"),
    use24hTime: Variable(false)
};

export const runtimeSettings: RuntimeSettings = {
    notifDnd: Variable(false),
    themes: Variable([]),
    barIsVertical: Variable.derive([configSettings.barLocation], (loc => {
        return loc === Location.LEFT || loc === Location.RIGHT
    })),
    dockIsVertical: Variable.derive([configSettings.dockLocation], (loc => {
        return loc === Location.LEFT || loc === Location.RIGHT
    })),
};

// #endregion

// saves current settings of all values into a given JSON filepath
function saveSettings(path: string) {
    const fileObj: { [key: string]: SettingsValue } = {};

    Object.entries(configSettings).forEach(([key, value]) => {
        const variable = value as Variable<SettingsValue>;
        if (variable) {
            fileObj[key] = variable.get();
        }
    });

    const pathDir = exec(["dirname", path]);
    exec(["mkdir", "-p", pathDir]);

    const objStr = JSON.stringify(fileObj, null, 4);
    writeFile(path, objStr);
    print(`wrote settings file to path! value:\n${objStr}`);
}

// loads settings from a given JSON file path, returns true if loaded correctly, false if not
function loadSettings(path: string): boolean {
    try {
        // get file contents, parse it to a json object
        const fileContents = readFile(path).trim();
        const fileObj = JSON.parse(fileContents);

        if (!fileObj) {
            throw new Error("Cannot load settings from falsy json-parsed object!");
        }

        Object.entries(fileObj).forEach(([key, v]) => {
            const inValue = v as JsonValue;
            let outValue: SettingsValue | null = null;

            if (typeof inValue === "string") {
                let loc: Location | CornerLocation | null = Location.parse(inValue);
                if (loc === null) {
                    loc = CornerLocation.parse(inValue);
                }

                if (loc !== null) {
                    outValue = loc;
                } else {
                    outValue = inValue;
                }

            } else {
                outValue = inValue;
            }

            if (outValue !== null && key in configSettings) {
                configSettings[key].set(outValue);
            }
        });

        print(`settings loaded from file [${path}]!`);

        return true;

    } catch (ex) {
        print(`EXCEPTION CAUGHT: ${ex}`);
        return false;
    }
}

let settingsBeingLoaded = false;
monitorFile(paths.settingsFile, () => {
    if (!settingsBeingLoaded) {
        settingsBeingLoaded = true;
        loadSettings(paths.settingsFile)
        settingsBeingLoaded = false;
    }
});

function refreshThemes() {
    const newThemes = exec(["ls", paths.themesDir]).replace(/\.json$/gm, "").split("\n");
    runtimeSettings.themes.set(newThemes);
}

export function init() {
    if (!loadSettings(paths.settingsFile)) {
        print(`settings unable to be loaded from path [${paths.settingsFile}]... saving defaults...`);
        saveSettings(paths.settingsFile);
    }

    refreshThemes();
}
