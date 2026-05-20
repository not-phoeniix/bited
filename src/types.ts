import { Accessor, Setter } from "gnim";

export type State<T> = {
    value: Accessor<T>;
    set: Setter<T>;
};

export type StateObject<T> = {
    [Prop in keyof T]: State<T[Prop]>;
};

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

export interface AppConfig {
    barSize: number;
    barLocation: "LEFT" | "RIGHT" | "TOP" | "BOTTOM";
    workspaces: WorkspaceDesc[];
};

export type ArgumentFunc = (value?: string) => void;

export interface Argument {
    name: string;
    value?: string;
    func: ArgumentFunc;
};
