import GObject, { register, getter } from "ags/gobject";
import { exec, subprocess } from "ags/process";

type NiriPos = [number, number];

export interface NiriWindow {
    id: number;
    title: string;
    app_id: string;
    pid: number;
    workspace_id: number;
    is_focused: boolean;
    is_floating: boolean;
    is_urgent: boolean;
    layout: {
        pos_in_scrolling_layout: NiriPos;
        tile_size: NiriPos;
        window_size: NiriPos;
        tile_pos_in_workspace_view: NiriPos | null;
        window_offset_in_tile: NiriPos;
    };
    focus_timestamp: {
        secs: number;
        nanos: number;
    };
};

export interface NiriWorkspace {
    id: number;
    idx: number;
    name: string | null;
    output: string;
    is_urgent: boolean;
    is_active: boolean;
    is_focused: boolean;
    active_window_id: number | null;
};

interface WorkspaceActiveWindowChangedEvent {
    workspace_id: number;
    active_window_id: number;
};

interface WindowOpenedOrChangedEvent {
    window: NiriWindow;
};

interface WindowFocusChangedEvent {
    id: number | null;
};

interface OverviewOpenedOrClosedEvent {
    is_open: boolean;
};

interface WindowsChangedEvent {
    windows: NiriWindow[];
};

interface WorkspacesChangedEvent {
    workspaces: NiriWorkspace[];
};

interface WorkspaceActivatedEvent {
    id: number;
    focused: boolean;
}

interface WindowClosedEvent {
    id: number;
}

interface NiriEvent {
    WorkspaceActiveWindowChanged?: WorkspaceActiveWindowChangedEvent;
    WindowOpenedOrChanged?: WindowOpenedOrChangedEvent;
    OverviewOpenedOrClosed?: OverviewOpenedOrClosedEvent;
    WindowsChanged?: WindowsChangedEvent;
    WorkspacesChanged?: WorkspacesChangedEvent;
    WindowFocusChanged?: WindowFocusChangedEvent;
    WorkspaceActivated?: WorkspaceActivatedEvent;
    WindowClosed?: WindowClosedEvent;
};

const msg = (cmd: string) => JSON.parse(exec(`niri msg -j ${cmd}`));

@register({ GTypeName: "Niri" })
export default class Niri extends GObject.Object {
    static instance: Niri;
    static get_default() {
        this.instance ||= new Niri();
        return this.instance;
    }

    #workspaces: NiriWorkspace[] = [];
    #windows: NiriWindow[] = [];
    #activeWorkspace: NiriWorkspace;
    #focusedWindow: NiriWindow | null;

    @getter(Array<NiriWorkspace>)
    get workspaces() { return this.#workspaces; }

    @getter(Array<NiriWindow>)
    get windows() { return this.#windows; }

    @getter(Object)
    get activeWorkspace() { return this.#activeWorkspace; }

    @getter<NiriWindow | null>(Object)
    get focusedWindow() { return this.#focusedWindow; }

    #messageCallback = (value: string) => {
        if (!value) return;

        const event: NiriEvent = JSON.parse(value);

        if (event.WindowsChanged) {
            this.#windows = event.WindowsChanged.windows;
            this.notify("windows");
        }

        if (event.WorkspacesChanged) {
            this.#workspaces = event.WorkspacesChanged.workspaces;
            this.#activeWorkspace = this.#workspaces.find(w => w.is_active)!;
            this.notify("workspaces");
            this.notify("active_workspace");
        }

        if (event.WindowOpenedOrChanged) {
            const { window } = event.WindowOpenedOrChanged;

            // if window doesn't exist, add it
            if (!this.#windows.find(w => w.id === window.id)) {
                this.#windows = [...this.#windows, window];
                this.notify("windows");
            }

            if (window.is_focused) {
                this.#focusedWindow = window;
                this.notify("focused_window");
            }
        }

        if (event.WindowFocusChanged) {
            const { id } = event.WindowFocusChanged;
            const win = this.#windows.find(w => w.id === id);
            if (win) {
                this.#focusedWindow = win;
            } else {
                this.#focusedWindow = null;
            }

            this.notify("focused_window");
        }

        if (event.WorkspaceActivated && event.WorkspaceActivated.focused) {
            const ws = this.#workspaces.find(ws => ws.id === event.WorkspaceActivated!.id);
            if (ws) {
                this.#activeWorkspace = ws;
            }

            this.notify("active_workspace");
        }

        if (event.WindowClosed) {
            const clonedWindows = this.#windows.slice();
            clonedWindows.filter(w => w.id !== event.WindowClosed!.id);
            this.#windows = clonedWindows;
            this.notify("windows");
        }
    };

    action = (a: string) => {
        exec(`niri msg -j action ${a}`);
    }

    constructor() {
        super();

        this.#activeWorkspace = (msg("workspaces") as NiriWorkspace[])
            .filter(w => w.is_active)[0];
        this.#focusedWindow = (msg("windows") as NiriWindow[])
            .filter(w => w.is_focused)[0];

        subprocess(
            "niri msg -j event-stream",
            this.#messageCallback,
            (err) => console.error(err)
        );
    }
}