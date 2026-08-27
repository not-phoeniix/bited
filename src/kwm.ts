import GObject, { register, getter, setter } from "ags/gobject";
import { readFileAsync } from "ags/file";
import { exec, execAsync } from "ags/process";
import { monitorFile } from "./utils";

@register({ GTypeName: "KWM" })
export default class KWM extends GObject.Object {
    static instance: KWM;
    static get_default() {
        this.instance ||= new KWM();
        return this.instance;
    }

    #activeTags = [1];

    @getter(Array<Number>)
    get activeTags() { return this.#activeTags; }

    // TODO: setter for active tags 
    //   (somehow connect back to kwm..? if only they had a cli tool <//3)
    @setter(Array<Number>)
    set activeTags(value) {
        this.#activeTags = value;
        this.notify("active_tags");
    }

    readTags = async (f: string) => {
        const fileStr = await readFileAsync(f);
        const tagsUncounted = fileStr.split("\n").map(tag => Number(tag));

        // count the occurence of all tags
        // (even counts means tag is disabled, odd is enabled)
        const tagMap: number[] = [];
        for (const tag of tagsUncounted) {
            // index of arr is tag ID, and value is the count
            tagMap[tag] ??= 0;
            tagMap[tag]++;
        }

        // sort all tags and set value, then notify
        this.#activeTags = tagMap
            .map((count, index) => count % 2 !== 0 ? index : undefined)
            .filter(v => v !== undefined);
        this.notify("active_tags");
    };

    constructor() {
        super();

        const KWM_TMP_PATH = `/tmp/kwm/`;

        const TAG_PATH = KWM_TMP_PATH + "tags";
        this.readTags(TAG_PATH);
        monitorFile(TAG_PATH, this.readTags);
    }
}