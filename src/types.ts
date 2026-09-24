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

export interface WidgetDesc {
    name: string;

    // any additional config properties
    [key: string]: any;
};

export interface WorkspacesHyprlandDesc {
    name: "workspacesHyprland";
    workspaces: WorkspaceDesc[];
};

export interface TagsKWMDesc {
    name: "tagsKwm";
    workspaces: WorkspaceDesc[];
}

export interface WorkspacesNiriDesc {
    name: "workspacesNiri";
    namedWorkspaces: {
        name: string;
        icon: string;
    }[];
};

export interface BarDesc {
    size: number;
    location: Location;
    monitorIdx: number | number[];
    widgets: {
        start?: (WidgetDesc | string)[];
        center?: (WidgetDesc | string)[];
        end?: (WidgetDesc | string)[];
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

export function isTypedArray<T>(arg: any, predicate: (v: any) => boolean): arg is T[] {
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

export function isWorkspaceDesc(arg: any): arg is WorkspaceDesc {
    return (
        typeof arg.id === "number" &&
        (typeof arg.icon === "undefined" || typeof arg.icon === "string") &&
        (typeof arg.special === "undefined" || typeof arg.special === "boolean") &&
        (typeof arg.separated === "undefined" || typeof arg.separated === "boolean")
    );
}

export function isTagsKWMDesc(arg: any): arg is TagsKWMDesc {
    return arg.name === "tagsKwm" &&
        isTypedArray(arg.workspaces, isWorkspaceDesc);
}

export function isWorkspacesHyprlandDesc(arg: any): arg is WorkspacesHyprlandDesc {
    return arg.name === "workspacesHyprland" &&
        isTypedArray(arg.workspaces, isWorkspaceDesc);
}

export function isWorkspacesNiriDesc(arg: any): arg is WorkspacesNiriDesc {
    return arg.name === "workspacesNiri" &&
        isTypedArray(arg.namedWorkspaces, (v) => {
            return typeof v.name === "string" &&
                typeof v.icon === "string";
        });
}

export function isBarDesc(arg: any): arg is BarDesc {
    const isStringArray = (arg: any) => isTypedArray<string>(arg, (v) => typeof v === "string");
    const isNumArray = (arg: any) => isTypedArray<number>(arg, (v) => typeof v === "number");
    const isWidgetDesc = (arg: any) => typeof arg === "string" || typeof arg.name === "string";
    const isWidgetDescArray = (arg: any) => isTypedArray(arg, isWidgetDesc);

    function isBarDescWidgetsArg(arg: any): boolean {
        return typeof arg === "undefined" ||
            isStringArray(arg) ||
            isWidgetDescArray(arg);
    }

    function isBarDescWidgets(arg: any) {
        return isBarDescWidgetsArg(arg.start) &&
            isBarDescWidgetsArg(arg.center) &&
            isBarDescWidgetsArg(arg.end);
    }

    return typeof arg.size === "number" &&
        isLocation(arg.location) &&
        (typeof arg.monitorIdx === "number" || isNumArray(arg.monitorIdx)) &&
        isBarDescWidgets(arg.widgets);
}

export function isVolumePopupDesc(arg: any): arg is VolumePopupDesc {
    return typeof arg.height === "number" &&
        typeof arg.width === "number" &&
        typeof arg.timeout === "number" &&
        isLocation(arg.location);
}

export function isAppConfig(arg: any): arg is AppConfig {
    return isTypedArray<BarDesc>(arg.bars, isBarDesc) &&
        isVolumePopupDesc(arg.volumePopup);
}
