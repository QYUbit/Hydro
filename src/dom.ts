import type { ComponentRef } from "./component.js";

abstract class ElBase {
    protected abstract ref: ComponentRef;
    protected abstract applyToElements(fn: (el: HTMLElement) => void): this;
    
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
    
    bindChild(
        getter: () => boolean,
        mount: (el: HTMLElement) => (() => void) | void,
    ): this {
        this.ref.effect(() => {
            let unmount: (() => void) | null = null;

            this.applyToElements((el) => {
                const shouldMount = getter();

                if (shouldMount) {
                    const ret = mount(el);
                    if (ret) unmount = ret;
                } else {
                    if (unmount) unmount();
                    unmount = null;
                }
            });
        });
        return this;
    }

    bindChildren<T extends any>(
        getter: () => T[],
        mount: (el: HTMLElement, value: T, i: number) => (() => void) | void,
    ): this {
        this.ref.effect(() => {
            let unmounts: (() => void)[] = [];

            this.applyToElements((el) => {
                unmounts.forEach(cb => cb());
                unmounts = [];

                const values = getter();

                values.forEach((value, i) => {
                    const unmount = mount(el, value, i);
                    if (unmount) unmounts.push(unmount);
                });
            });
        });
        return this;
    }

    bindKeyedChildren<T extends any, K extends any>(
        getter: () => T[],
        keyFn: (value: T, i: number) => K,
        mount: (el: HTMLElement, value: T, i: number) => (() => void) | void,
    ): this {
        this.ref.effect(() => {
            const unmounts = new Map<K, (() => void) | null>();

            this.applyToElements((el) => {
                const values = getter();

                const keys = values.map((value, i) => keyFn(value, i));

                const prevKeys = Array.from(unmounts.keys());

                const keysToRemove = prevKeys.filter(key => !keys.includes(key));

                keysToRemove.forEach((key) => {
                    const unmount = unmounts.get(key);
                    if (unmount) unmount();
                    unmounts.delete(key);
                });

                keys.forEach((key, i) => {
                    if (unmounts.has(key)) return;
                    const unmount = mount(el, values[i] as T, i);
                    unmounts.set(key, unmount ?? null);
                });
            });
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
    
    protected applyToElements(fn: (el: HTMLElement) => void): this {
        fn(this.element);
        return this;
    }

    // =================== Getters ===================

    getText(): string {
        return this.element.textContent || '';
    }

    getAttr(name: string): string | null {
        return this.element.getAttribute(name);
    }
    
    hasClass(className: string): boolean {
        return this.element.classList.contains(className);
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
    
    protected applyToElements(fn: (el: HTMLElement) => void): this {
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
