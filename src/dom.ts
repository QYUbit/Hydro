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

    // =================== Single Element ===================

    getAttr(name: string): string | null {
        return this.element.getAttribute(name);
    }
    
    hasClass(className: string): boolean {
        return this.element.classList.contains(className);
    }
    
    getText(): string {
        return this.element.textContent || '';
    }

    // =================== Events ===================

    on<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions | undefined,
    ): void {
        this.element.addEventListener(type, listener, options);
        this.ref.addCleanup(() => this.element.removeEventListener(type, listener, options));
    }

    off<K extends keyof HTMLElementEventMap>(
        type: K,
        listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
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

    forEach(cb: (value: HTMLElement, index: number, array: HTMLElement[]) => void) {
        this.elements.forEach(cb);
    }
    
    get length(): number {
        return this.elements.length;
    }

    // =================== Events ===================

    
}
