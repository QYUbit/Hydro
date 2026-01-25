import { component, ComponentRef, destroy, hydrate } from "./component.js";
import { El, Els } from "./dom.js";
import { computed, effect, ignore, scope, signal } from "./reactivity.js";

export const Hydro = {
    component,
    ComponentRef,
    hydrate,
    destroy,

    El,
    Els,

    signal,
    effect,
    computed,
    ignore,
    scope,
};
