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

export interface WorkspacesHyprlandConfig {
    name: "workspacesHyprland";
    workspaces: WorkspaceDesc[];
};

export interface TagsKWMConfig {
    workspaces: WorkspaceDesc[];
}

export interface WorkspacesNiriConfig {
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
        start?: string[];
        center?: string[];
        end?: string[];
    };
    widgetConfig?: {
        [key: string]: any;
    }
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

export function isTagsKWMConfig(arg: any): arg is TagsKWMConfig {
    return typeof arg === "object" &&
        isTypedArray(arg.workspaces, isWorkspaceDesc);
}

export function isWorkspacesHyprlandConfig(arg: any): arg is WorkspacesHyprlandConfig {
    return typeof arg === "object" &&
        isTypedArray(arg.workspaces, isWorkspaceDesc);
}

export function isWorkspacesNiriConfig(arg: any): arg is WorkspacesNiriConfig {
    return typeof arg === "object" &&
        isTypedArray(arg.namedWorkspaces, (v) => {
            return typeof v.name === "string" &&
                typeof v.icon === "string";
        });
}

export function isBarDesc(arg: any): arg is BarDesc {
    const isStringArray = (arg: any) => isTypedArray<string>(arg, (v) => typeof v === "string");
    const isNumArray = (arg: any) => isTypedArray<number>(arg, (v) => typeof v === "number");
    const isBarDescWidgetsArg = (arg: any) => typeof arg === "undefined" || isStringArray(arg);

    function isBarDescWidgets(arg: any) {
        return isBarDescWidgetsArg(arg.start) &&
            isBarDescWidgetsArg(arg.center) &&
            isBarDescWidgetsArg(arg.end);
    }

    return typeof arg.size === "number" &&
        isLocation(arg.location) &&
        (typeof arg.monitorIdx === "number" || isNumArray(arg.monitorIdx)) &&
        isBarDescWidgets(arg.widgets) &&
        (typeof arg.widgetConfig === "undefined" || typeof arg.widgetConfig === "object");
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
