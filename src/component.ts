import { El, Els } from "./dom.js";
import { effect, scope } from "./reactivity.js";

export type ComponentFunc = ((ref: ComponentRef, props: any) => (() => void))
    | ((ref: ComponentRef, props: any) => void);

export interface ElementSelecter {
    querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
    querySelectorAll(selectors: string): NodeListOf<Element>;
}

export interface BoundComponent extends HTMLElement {
    ref: ComponentRef;
}

export class ComponentRef {
    private el: HTMLElement;
    private cleanups: (() => void)[] = [];

    constructor(el: HTMLElement) {
        this.el = el;
    }

    root(): El {
        return new El(this, this.el);
    }

    $(selectors: string): El | null {
        const el = this.el.querySelector(selectors);
        if (!(el instanceof HTMLElement)) return null;
        return el ? new El(this, el) : null;
    }

    $$(selectors: string): Els {
        const nodes = this.el.querySelectorAll(selectors);
        return new Els(this, Array.from(nodes).filter(el => el instanceof HTMLElement));
    }

    effect(fn: () => void, initRun: boolean = true) {
        const cleanup = effect(fn, initRun);
        this.addCleanup(cleanup);
    }

    addCleanup(cb: () => void): void {
        this.cleanups.push(cb);
    }

    cleanup(): void {
        this.cleanups.forEach(cb => cb());
    }
}

const components = new Map<string, ComponentFunc>();

let compNameAttr = "comp";
let compPropsAttr = "props";
let compHydratedAttr = "hydrated";

export function setComponentAttrName(name: string) {
    compNameAttr = name;
}

export function setPropsAttrName(name: string) {
    compPropsAttr = name;
}

export function hydrate(root: ElementSelecter = document) {
    root.querySelectorAll(`[data-${compNameAttr}]`).forEach((el) => {
        if (!(el instanceof HTMLElement)) return;

        const name = el.dataset[compNameAttr];
        if (el.dataset[compHydratedAttr] || !name) return;
        
        const cb = components.get(name);
        if (!cb) return;

        const props = el.dataset[compPropsAttr]
            ? JSON.parse(el.dataset[compPropsAttr] as string)
            : {};

        const ref = new ComponentRef(el);
        (el as BoundComponent).ref = ref;
        
        el.dataset[compHydratedAttr] = "true";

        const cleanup = cb(ref, props);
        cleanup && ref.addCleanup(cleanup);
    });
}

export function destroy(root: ElementSelecter = document) {
    root.querySelectorAll(`[data-${compNameAttr}][data-${compHydratedAttr}]`).forEach((el) => {
        if (!(el instanceof HTMLElement)) return;

        const ref = (el as BoundComponent).ref;
        if (!ref) return;

        ref.cleanup();

        // Remove ref from el?

        delete el.dataset[compHydratedAttr];
    });
}

export function component(selector: string, cb: ComponentFunc) {
    components.set(selector, cb);
}
