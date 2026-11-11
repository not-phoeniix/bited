import GObject, { register, getter } from "ags/gobject";
import { exec, subprocess } from "ags/process";
import { getEnv } from "../utils";

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
    static #instance: Niri;
    static get_default() {
        if (!exec(`bash -c "command -v niri"`) || !getEnv("NIRI_SOCKET")) {
            return null;
        }

        this.#instance ||= new Niri();
        return this.#instance;
    }

    #tmpNotifyList = new Set<string>();

    #workspaces: NiriWorkspace[] = [];
    #workspaceIdIdxMap: Record<number, number> = {};
    #windows: NiriWindow[] = [];
    #windowIdIdxMap: Record<number, number> = {};
    #focusedWorkspaceId: number = -1;
    #focusedWindowId: number = -1;

    @getter(Array<NiriWorkspace>)
    get workspaces() { return this.#workspaces; }

    @getter(Array<NiriWindow>)
    get windows() { return this.#windows; }

    @getter(Object)
    get focusedWorkspace() {
        const i = this.#workspaceIdIdxMap[this.#focusedWorkspaceId];
        return this.#workspaces[i];
    }

    @getter<NiriWindow | null>(Object)
    get focusedWindow() {
        const i = this.#windowIdIdxMap[this.#focusedWindowId] ?? -1;
        return this.#windows[i] ?? null;
    }

    #updateWindowIdIdxMap = () => {
        this.#windowIdIdxMap = {};
        for (let i = 0; i < this.#windows.length; i++) {
            const win = this.#windows[i];
            this.#windowIdIdxMap[win.id] = i;
        }
    };

    #updateWorkspaceIdIdxMap = () => {
        this.#workspaceIdIdxMap = {};
        for (let i = 0; i < this.#workspaces.length; i++) {
            const ws = this.#workspaces[i];
            this.#workspaceIdIdxMap[ws.id] = i;
        }
    };

    #messageCallback = (value: string) => {
        if (!value) return;

        const event: NiriEvent = JSON.parse(value);

        this.#tmpNotifyList.clear();
        // function alias for better readability <3
        const queueNotify = (p: string) => this.#tmpNotifyList.add(p);

        if (event.WindowsChanged) {
            this.#windows = event.WindowsChanged.windows;
            this.#updateWindowIdIdxMap();
            queueNotify("windows");
        }

        if (event.WorkspacesChanged) {
            this.#workspaces = event.WorkspacesChanged.workspaces;
            this.#focusedWorkspaceId = this.#workspaces.find(w => w.is_focused)!.id;
            this.#updateWorkspaceIdIdxMap();
            queueNotify("workspaces");
            queueNotify("focused_workspace");
        }

        if (event.WorkspaceActiveWindowChanged) {
            const { workspace_id, active_window_id } = event.WorkspaceActiveWindowChanged;
            const i = this.#workspaceIdIdxMap[workspace_id];
            this.#workspaces[i].active_window_id = active_window_id;
            queueNotify("workspaces");
        }

        if (event.WindowOpenedOrChanged) {
            const { window } = event.WindowOpenedOrChanged;

            // if window doesn't exist, add it
            if (!this.#windows.find(w => w.id === window.id)) {
                this.#windows = [...this.#windows, window];
                queueNotify("windows");
            }

            if (window.is_focused) {
                this.#focusedWindowId = window.id;
                queueNotify("focused_window");
            }
        }

        if (event.WindowFocusChanged) {
            const { id } = event.WindowFocusChanged;
            const win = this.#windows.find(w => w.id === id);
            if (win) {
                this.#focusedWindowId = win.id;
            } else {
                this.#focusedWindowId = -1;
            }

            queueNotify("focused_window");
        }

        if (event.WorkspaceActivated && event.WorkspaceActivated.focused) {
            this.#focusedWorkspaceId = event.WorkspaceActivated!.id;
            queueNotify("focused_workspace");
        }

        if (event.WindowClosed) {
            const clonedWindows = this.#windows.slice();
            clonedWindows.filter(w => w.id !== event.WindowClosed!.id);
            this.#windows = clonedWindows;
            queueNotify("windows");
        }

        for (const prop of this.#tmpNotifyList.values()) {
            this.notify(prop);
        }
    };

    action = (a: string) => {
        exec(`niri msg -j action ${a}`);
    }

    constructor() {
        super();

        this.#focusedWorkspaceId = (msg("workspaces") as NiriWorkspace[])
            .filter(ws => ws.is_focused)[0].id;
        this.#focusedWindowId = (msg("windows") as NiriWindow[])
            .filter(w => w.is_focused)[0].id;

        subprocess(
            "niri msg -j event-stream",
            this.#messageCallback,
            (err) => console.error(err)
        );
    }
}
