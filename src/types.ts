import { Accessor, Setter } from "gnim";

// ~~~ types ~~~

export type State<T> = {
    value: Accessor<T>;
    set: Setter<T>;
};

export type StateObject<T> = {
    [Prop in keyof T]: State<T[Prop]>;
};

export type Location = "LEFT" | "RIGHT" | "TOP" | "BOTTOM";

export interface Time {
    hour: number;
    minute: number;
    second: number;
    year: number;
    month: number;
    day: number;
};

export interface WorkspaceDesc {
    id: number,
    icon?: string,
    special?: boolean,
    separated?: boolean
};

export interface BarDesc {
    size: number;
    location: Location;
    monitorIdx: number | number[];
    widgets: {
        start?: string[];
        center?: string[];
        end?: string[];
    };
};

export interface VolumePopupDesc {
    height: number;
    width: number;
    timeout: number;
    location: Location
};

export interface AppConfig {
    bars: BarDesc[];
    workspaces: WorkspaceDesc[];
    volumePopup: VolumePopupDesc;
};

export type ArgumentFunc = (value?: string) => string;

export interface Argument {
    name: string;
    value?: string;
    func: ArgumentFunc;
};

// ~~~ type check functions ~~~

export function isLocation(arg: any): arg is Location {
    return arg === "LEFT" || arg === "RIGHT" || arg === "TOP" || arg === "BOTTOM";
}

export function isTypedArray<T>(arg: any, predicate: (v: any) => v is T): arg is T[] {
    if (!Array.isArray(arg)) {
        return false;
    }

    for (let value of arg) {
        if (!predicate(value)) {
            return false;
        }
    }

    return true;
}

export function isBarDesc(arg: any): arg is BarDesc {
    const isStringArray = (arg: any) => isTypedArray<string>(arg, (v) => typeof v === "string");
    const isNumArray = (arg: any) => isTypedArray<number>(arg, (v) => typeof v === "number");

    function isBarDescWidgets(arg: any): boolean {
        return typeof (arg.start === "undefined" || isStringArray(arg.start)) &&
            (typeof arg.center === "undefined" || isStringArray(arg.center)) &&
            (typeof arg.end === "undefined" || isStringArray(arg.end));
    }

    return typeof arg.size === "number" &&
        isLocation(arg.location) &&
        (typeof arg.monitorIdx === "number" || isNumArray(arg.monitorIdx)) &&
        isBarDescWidgets(arg.widgets);
}

export function isWorkspaceDesc(arg: any): arg is WorkspaceDesc {
    return typeof arg.id === "number" &&
        (typeof arg.icon === "undefined" || typeof arg.icon === "string") &&
        (typeof arg.special === "undefined" || typeof arg.special === "boolean") &&
        (typeof arg.separated === "undefined" || typeof arg.separated === "boolean");
}

export function isVolumePopupDesc(arg: any): arg is VolumePopupDesc {
    return typeof arg.height === "number" &&
        typeof arg.width === "number" &&
        typeof arg.timeout === "number" &&
        isLocation(arg.location);
}

export function isAppConfig(arg: any): arg is AppConfig {
    return isTypedArray<BarDesc>(arg.bars, isBarDesc) &&
        isTypedArray<WorkspaceDesc>(arg.workspaces, isWorkspaceDesc) &&
        isVolumePopupDesc(arg.volumePopup);
}
