import { Variable } from "astal"
import { Astal } from "astal/gtk3"

export enum Location {
    TOP,
    LEFT,
    RIGHT,
    BOTTOM,
}

export namespace Location {
    export function toAnchor(loc: Location) {
        switch (loc) {
            case Location.TOP: return Astal.WindowAnchor.TOP;
            case Location.LEFT: return Astal.WindowAnchor.LEFT;
            case Location.RIGHT: return Astal.WindowAnchor.RIGHT;
            case Location.BOTTOM: return Astal.WindowAnchor.BOTTOM;
        }
    }

    export function toAnchorExpanded(loc: Location) {
        switch (loc) {
            case Location.TOP: return Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT | Astal.WindowAnchor.LEFT;
            case Location.LEFT: return Astal.WindowAnchor.LEFT | Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM;
            case Location.RIGHT: return Astal.WindowAnchor.RIGHT | Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM;
            case Location.BOTTOM: return Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT | Astal.WindowAnchor.RIGHT;
        }
    }

    export function parse(str: string): Location | null {
        const keys = Object.keys(Location);
        for (let i = 0; i < keys.length; i++) {
            const locStr = Location[i] as string;
            if (str.toUpperCase().trim() === locStr?.toUpperCase()) {
                return i as Location;
            }
        }

        return null;
    }
}

export enum CornerLocation {
    TOP_LEFT,
    TOP_RIGHT,
    BOTTOM_LEFT,
    BOTTOM_RIGHT,
}

export namespace CornerLocation {
    export function toAnchor(loc: CornerLocation) {
        switch (loc) {
            case CornerLocation.TOP_LEFT: return Astal.WindowAnchor.TOP | Astal.WindowAnchor.LEFT;
            case CornerLocation.TOP_RIGHT: return Astal.WindowAnchor.TOP | Astal.WindowAnchor.RIGHT;
            case CornerLocation.BOTTOM_LEFT: return Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT;
            case CornerLocation.BOTTOM_RIGHT: return Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.RIGHT;
        }
    }

    export function parse(str: string): CornerLocation | null {
        const keys = Object.keys(CornerLocation);
        for (let i = 0; i < keys.length; i++) {
            const locStr = CornerLocation[i] as string;
            if (str.toUpperCase().trim() === locStr?.toUpperCase()) {
                return i as CornerLocation;
            }
        }

        return null;
    }
}

export type JsonValue = boolean | number | string | string[];
export type SettingsValue = Location | CornerLocation | boolean | number | string | string[];

export interface SettingsDesc {
    [key: string]: Variable<SettingsValue>
}

export type ConfigSettings = SettingsDesc & {
    barLocation: Variable<Location>,
    dockLocation: Variable<Location>,
    barSize: Variable<number>,
    notifTimeout: Variable<number>,
    notifLocation: Variable<CornerLocation>,
    dockApps: Variable<string[]>,
    dockIconSize: Variable<number>,
    wallpaperDir: Variable<string>,
    use24hTime: Variable<boolean>
}

export type RuntimeSettings = SettingsDesc & {
    dockIsVertical: Variable<boolean>,
    barIsVertical: Variable<boolean>,
    notifDnd: Variable<boolean>,
    themes: Variable<string[]>
}
