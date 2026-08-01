import { Accessor, Setter } from "gnim";

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
    monitorIdx: number;
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
