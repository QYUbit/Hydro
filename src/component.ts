import { El, Els } from "./dom.js";
import { effect, signal } from "./reactivity.js";

export type ComponentParams = {
    ref: ComponentRef,
    props: any,
};

export type ComponentFunc = ((prams: ComponentParams) => (() => void))
    | ((params: ComponentParams) => void);

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

export const Hydro = {
    components: new Map<string, ComponentFunc>(),

    hydrate(root: ElementSelecter = document) {
        root.querySelectorAll("[data-comp]").forEach((el) => {
            if (!(el instanceof HTMLElement)) return;

            const name = el.dataset.comp;
            if (el.dataset.bound || !name) return;
            
            const cb = this.components.get(name);
            if (!cb) return;

            const props = el.dataset.props
                ? JSON.parse(el.dataset.props)
                : {};


            const ref = new ComponentRef(el);
            (el as BoundComponent).ref = ref;
            
            el.dataset.bound = "true";

            const cleanup = cb({ ref, props });
            cleanup && ref.addCleanup(cleanup);
        });
    },

    destroy(root: ElementSelecter = document) {
        root.querySelectorAll("[data-comp]").forEach((el) => {
            if (!(el instanceof HTMLElement)) return;

            const ref = (el as BoundComponent).ref;
            if (!ref) return;

            ref.cleanup();

            // Remove ref from el?

            delete el.dataset.bound;
        });
    },

    component(selector: string, cb: ComponentFunc) {
        this.components.set(selector, cb);
    },
}

Hydro.component("counter", ({ ref, props }) => {
    const [count, setCount] = signal<number>(props.count || 0);

    ref.$(".display")?.bindText(() => `Count: ${count()}`);

    ref.$("button")?.on("click", () => setCount(prev => prev + 1));
});

Hydro.hydrate();
