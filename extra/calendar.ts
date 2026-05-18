import { GObject } from "astal";
import { astalify, ConstructProps, Gtk } from "astal/gtk3";

export default class Calendar extends astalify(Gtk.Calendar) {
    static { GObject.registerClass(this); }

    constructor(props: ConstructProps<
        Calendar,
        Gtk.Calendar.ConstructorProps,
        { /* signals in here <3 */ }
    >) {
        super(props as any);
    }
}