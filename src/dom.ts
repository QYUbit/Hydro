import { compPropsAttr, type ComponentRef } from "./component.js";

abstract class ElBase {
    protected abstract ref: ComponentRef;
    protected abstract applyToElements(fn: (el: HTMLElement, i: number) => void): this;
    
    // =================== Bindings ===================
    
    bindText(getter: () => any): this {
        this.ref.effect(() => {
            const text = String(getter());
            this.applyToElements(el => el.textContent = text);
        });
        return this;
    }

    bindAttr(name: string, getter: () => any): this {
        this.ref.effect(() => {
            const value = String(getter());
            this.applyToElements(el => el.setAttribute(name, value));
        });
        return this;
    }

    bindValue(getter: () => any): this {
        this.ref.effect(() => {
            const value = getter();
            this.setValue(value);
        });
        return this;
    }

    bindShow(getter: () => boolean): this {
        this.ref.effect(() => {
            const show = getter();
            this.applyToElements((el) => {
                if ((el as any).__hydroShow === show) return;
                (el as any).__hydroShow = show;
                el.style.display = show ? "" : "none";
            });
        });
        return this;
    }

    bindClass(getter: () => boolean, ...classNames: string[]): this {
        this.ref.effect(() => {
            const add = getter();

            this.applyToElements((el) => {
                if (add) {
                    el.classList.add(...classNames);
                } else {
                    el.classList.remove(...classNames);
                }
            });
        });
        return this;
    }

    bindStyle(property: string, getter: () => any): this {
        this.ref.effect(() => {
            const value = Array.isArray(getter()) ? getter() : property.split(" ");

            this.applyToElements((el) => {
                el.style.setProperty(property, String(value));
            });
        });
        return this;
    }
    
    bindChild(
        getter: () => boolean,
        mount: (el: HTMLElement) => ((destroyed: boolean) => void) | void,
    ): this {
        let unmount: ((destroyed: boolean) => void) | null = null;

        this.ref.effect(() => {
            const shouldMount = getter();

            this.applyToElements((el) => {
                if (shouldMount) {
                    const ret = mount(el);
                    if (ret) unmount = ret;
                } else {
                    if (unmount) unmount(false);
                    unmount = null;
                }
            });
        });

        this.ref.addCleanup(() => {
            if (unmount) unmount(true);
            unmount = null; // Should not be necessary
        });
        return this;
    }

    bindChildren<T>(
        getter: () => T[],
        mount: (
            el: HTMLElement,
            value: T,
            i: number,
        ) => ((destroyed: boolean) => void) | void,
    ): this {
        let unmounts: ((destroyed: boolean) => void)[] = [];

        this.ref.effect(() => {
            unmounts.forEach(cb => cb(false));
            unmounts = [];

            const values = getter();

            this.applyToElements((el) => {
                values.forEach((value, i) => {
                    const unmount = mount(el, value, i);
                    if (unmount) unmounts.push(unmount);
                });
            });
        });

        this.ref.addCleanup(() => {
            unmounts.forEach(cb => cb(true));
            unmounts = [];
        });
        return this;
    }

    bindKeyedChildren<T>(
        getter: () => T[],
        keyFn: (value: T, i: number) => string,
        mount: (
            el: HTMLElement,
            value: T,
            i: number,
        ) => ((destroyed: boolean) => void) | void,
    ): this {
        const unmountsByElement = new Map<
            HTMLElement,
            Map<string, ((destroyed: boolean) => void) | null>
        >();

        this.ref.effect(() => {
            const values = getter();
            const keys = values.map((v, i) => keyFn(v, i));
            const keySet = new Set(keys);

            this.applyToElements((el) => {
                let unmounts = unmountsByElement.get(el);
                if (!unmounts) {
                    unmounts = new Map();
                    unmountsByElement.set(el, unmounts);
                }

                const prevKeys = Array.from(unmounts.keys());

                prevKeys.forEach((key) => {
                    if (!keySet.has(key)) {
                        const unmount = unmounts!.get(key);
                        if (unmount) unmount(false);
                        unmounts!.delete(key);
                    }
                });

                const sameOrder =
                    prevKeys.length === keys.length &&
                    prevKeys.every((k, i) => k === keys[i]);

                if (!sameOrder) {
                    unmounts.forEach(cb => cb && cb(false));
                    unmounts.clear();
                }

                keys.forEach((key, i) => {
                    if (unmounts!.has(key)) return;
                    const unmount = mount(el, values[i] as T, i);
                    unmounts!.set(key, unmount ?? null);
                });
            });
        });

        this.ref.addCleanup(() => {
            unmountsByElement.forEach((map) => {
                map.forEach(cb => cb && cb(true));
                map.clear();
            });
            unmountsByElement.clear();
        });

        return this;
    }
    
    // =================== Setters ===================
    
    setText(text: any): this {
        this.applyToElements(el => el.textContent = text);
        return this;
    }
    
    setAttr(name: string, value: any): this {
        this.applyToElements(el => el.setAttribute(name, value));
        return this;
    }
    
    removeAttr(name: string): this {
        this.applyToElements(el => el.removeAttribute(name));
        return this;
    }

    setValue(value: any): this {
        this.applyToElements((el) => {
            if (!(el instanceof HTMLInputElement)) return;

            if (el.type === "checkbox") {
                if (el.checked !== value) {
                    el.checked = !!value
                }
            } else if (el.type === "radio") {
                if (el.checked !== (el.value === String(value))) {
                    el.checked = el.value === String(value)
                }
            } else {
                if (el.value !== String(value || "")) {
                    el.value = String(value || "")
                }
            }
        });
        return this;
    }

    addClass(...classNames: string[]): this {
        this.applyToElements(el => el.classList.add(...classNames));
        return this;
    }

    removeClass(...classNames: string[]): this {
        this.applyToElements(el => el.classList.remove(...classNames));
        return this;
    }

    toggleClass(className: string): this {
        this.applyToElements((el) => {
            if (el.classList.contains(className)) {
                el.classList.remove(className);
            } else {
                el.classList.add(className);
            }
        });
        return this;
    }

    setStyle(property: string, value: any): this {
        this.applyToElements((el) => {
            el.style.setProperty(property, String(value));
        });
        return this;
    }

    setProps(value: any) {
        this.applyToElements((el) =>
            el.dataset[compPropsAttr] = JSON.stringify(value));
    }
}

export class El extends ElBase {
    protected ref: ComponentRef;
    
    constructor(
        ref: ComponentRef,
        public element: HTMLElement,
    ) {
        super();
        this.ref = ref;
    }
    
    protected applyToElements(fn: (el: HTMLElement, i: number) => void): this {
        fn(this.element, 0);
        return this;
    }

    // =================== Getters ===================

    getText(): string {
        return this.element.textContent || '';
    }

    getAttr(name: string): string | null {
        return this.element.getAttribute(name);
    }

    getValue(): string | null {
        if (!(this.element instanceof HTMLInputElement)) return null;
        return this.element.value;
    }

    getNumberValue(): number | null {
        if (!(this.element instanceof HTMLInputElement)) return null;
        return this.element.valueAsNumber;
    }

    getDateValue(): Date | null {
        if (!(this.element instanceof HTMLInputElement)) return null;
        return this.element.valueAsDate;
    }

    isChecked(): boolean {
        if (!(this.element instanceof HTMLInputElement)) return false;
        return this.element.checked;
    }
    
    hasClass(className: string): boolean {
        return this.element.classList.contains(className);
    }

    getStyle(property: string): string {
        return this.element.style.getPropertyValue(property);
    }

    getProps(): any {
        return this.element.dataset[compPropsAttr]
            ? JSON.parse(this.element.dataset[compPropsAttr]!)
            : {};
    }

    // =================== Events ===================

    on<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions | undefined,
    ): void {
        this.element.addEventListener(type, listener, options);
        this.ref.addCleanup(() => this.element.removeEventListener(type, listener, options));
    }

    off<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions | undefined,
    ): void {
        this.element.removeEventListener(type, listener, options);
    }

    dispatch(event: Event): boolean {
        return this.element.dispatchEvent(event);
    }
}

export class Els extends ElBase {
    protected ref: ComponentRef;
    
    constructor(
        ref: ComponentRef,
        public elements: HTMLElement[]
    ) {
        super();
        this.ref = ref;
    }
    
    protected applyToElements(fn: (el: HTMLElement, i: number) => void): this {
        this.elements.forEach(fn);
        return this;
    }

    // =================== Events ===================

    on<K extends keyof HTMLElementEventMap>(
        event: K,
        handler: (e: HTMLElementEventMap[K], el: HTMLElement, index: number) => void,
        options?: AddEventListenerOptions
    ): this {
        this.elements.forEach((el, i) => {
            const wrappedHandler = (e: Event) => handler(e as HTMLElementEventMap[K], el, i);

            el.addEventListener(event, wrappedHandler, options);
            this.ref.addCleanup(() => el.removeEventListener(event, wrappedHandler, options));
        });
        return this;
    }

    // TODO Off & Dispatch

    // =================== Array ===================

    at(index: number): El | null {
        const el = this.elements[index];
        return el ? new El(this.ref, el) : null;
    }
    
    first(): El | null {
        return this.at(0);
    }
    
    last(): El | null {
        return this.at(this.elements.length - 1);
    }
    
    filter(predicate: (el: Element, index: number) => boolean): Els {
        return new Els(this.ref, this.elements.filter(predicate));
    }

    each(cb: (value: HTMLElement, index: number, array: HTMLElement[]) => void) {
        this.elements.forEach(cb);
    }
    
    get length(): number {
        return this.elements.length;
    }
}
