interface Signal<T> {
    value: T;
    subs: Set<Effect>;
}

interface Effect {
    run: () => void;
    isFirstRun: boolean;
    deps: Set<Signal<any>>;
    cleanups: (() => void)[];
}

let currentEffect: Effect | null = null;

export function signal<T>(initialValue: T): [() => T, (value: T | ((prev: T) => T)) => void] {
    const signal: Signal<T> = {
        value: initialValue,
        subs: new Set(),
    };

    const getter = () => {
        if (currentEffect) {
            signal.subs.add(currentEffect);
            currentEffect.deps.add(signal);
        }
        return signal.value;
    };

    const setter = (nextValue: T | ((prev: T) => T), equals = Object.is) => {
        const newValue =
        typeof nextValue === "function"
            ? (nextValue as ((prev: T) => T))(signal.value)
            : nextValue;

        if (!equals(signal.value, newValue)) {
            signal.value = newValue;
            signal.subs.forEach(sub => schedule(sub.run));
        }
    };

    return [getter, setter] as const;
}

export function computed<T>(fn: () => T): () => T {
    let value: T;
    let dirty = true;
    
    const getter = () => {
        if (dirty) {
            if (currentEffect) {
                const prevEffect = currentEffect;
                currentEffect = null;
                value = fn();
                currentEffect = prevEffect;
            } else {
                value = fn();
            }
            dirty = false;
        }
        return value;
    };
    
    effect(() => {
        fn();
        dirty = true;
    });
    
    return getter;
}

export function effect(fn: () => void | (() => void), initRun: boolean = true): () => void {
    const effect: Effect = {
        run: () => {
            effect.cleanups.forEach(cleanup => cleanup());
            effect.cleanups = [];
            
            effect.deps.forEach((signal) => {
                signal.subs.delete(effect);
            });
            effect.deps.clear();
            
            const prevEffect = currentEffect;
            currentEffect = effect;
            
            try {
                if (initRun || !effect.isFirstRun) {
                    const cleanup = fn();
                    if (typeof cleanup === "function") {
                        effect.cleanups.push(cleanup);
                    }
                }
            } finally {
                effect.isFirstRun = false;
                currentEffect = prevEffect;
            }
        },
        isFirstRun: true,
        deps: new Set(),
        cleanups: [],
    };

    effect.run();
    
    return () => {
        effect.cleanups.forEach(cleanup => cleanup());
        effect.deps.forEach(signal => {
            signal.subs.delete(effect);
        });
    };
}

export function ignore<T>(fn: () => T): T {
    const prevEffect = currentEffect;
    currentEffect = null;
    
    try {
        return fn();
    } finally {
        currentEffect = prevEffect;
    }
}

// TODO Use scopes for components

export function scope<T>(fn: (dispose: () => void) => T): T {
    const prevEffect = currentEffect;
    currentEffect = null;
    
    const cleanups: (() => void)[] = [];
    
    const dispose = () => {
        cleanups.forEach(cleanup => cleanup());
        cleanups.length = 0;
    };
    
    try {
        const result = fn(dispose);
        
        if (currentEffect) {
            cleanups.push(() => {
                currentEffect?.cleanups.forEach(cleanup => cleanup());
            });
        }
        
        return result;
    } finally {
        currentEffect = prevEffect;
    }
}

let flushing = false;
const queue: (() => void)[] = [];

function schedule(job: () => void): void {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    
    if (!flushing) {
        flushing = true;
        queueMicrotask(flush);
    }
}

function flush(): void {
    while (queue.length > 0) {
        const jobs = queue.splice(0, queue.length);
        jobs.forEach(job => job());
    }
    flushing = false;
}