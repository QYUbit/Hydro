# Hydro

Hydro is a minimalistic JavaScript library for bringing interactivity to server-side rendered web applications. It implements the Islands Architecture, allowing you to keep your fast, SEO-friendly HTML while hydrating only the specific components that need client-side logic.

Think of it as "Mini-Astro" for **any** backend, whether you use Go, Rust, Node, or PHP. Hydro provides a powerful, signal-based reactivity system (inspired by SolidJS) without forcing you into a heavy framework. It is the perfect companion for htmx and traditional templating engines.

## Features

- Backend agnostic
- Dynamic hydration
- DOM helpers
- Fine grained reactivity
- Compatibility with other frameworks
- 1.6 KB bundle size (minified + gziped)

## Installation

via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/hydro-dom@latest/dist/cdn.min.js"></script>
```

---

via npm:

```bash
npm i hydro-dom
```

then import it with:

```javascript
import Hydro from 'hydro-dom';
```

## Usage

### Components & Hydration

Components are the core of Hydro. They represent interactive regions (islands) in your website.

You can register a component by calling `component(name, initHook)`. The function accepts two arguments. First the name of the component and second a callback defining the behaviour of the component. The callback provides a ComponentRef and props.

```html
<div data-comp="counter"></div>
```

The counter component defines behaviour for all islands with `data-comp="counter"`.

```javascript
Hydro.component("counter", (ref, props) => {
    // Behaviour ...
});
```

In our context, hydrating means that defined behaviour (components) get initialized and attached to DOM elements. 

Hydrate all unhydrated components in the DOM:

```javascript
// Usually you will call hydrate when the DOM has been loaded 
Hydro.hydrate();
```

Or hydrate just a specific part of the DOM tree:

```javascript
const counter = document.getElementById("counter")
Hydro.hydrate(counter);
```

Destroy hydrated components (will clean up effects, event listeners, timeouts, etc.):

```javascript
Hydro.destroy(); // Destroys all hydrated components in the DOM tree

// Or

Hydro.destroy(counter); // Destroys a subtree
```

### Props

Since this library is designed for SSR, data gets already rendered to html on the backend. But if we want to access this data we would have to parse the html which is unpractical. Therefore you can attatch json to html elements on the server and read it on the client:

```html
<div data-comp="counter" data-props='{"count": {{ count }} }'>
    <button>Add 1</button>
    <div class="display">{{ count }}</div>
</div>
```

```javascript
Hydro.component("notes", (ref, props) => {
    console.log(`Count from backend: ${props.count}`);
});
```

### Element quering & Element wrappers

Retreive the component's root element (the one that has data-comp="...") by calling `ComponentRef.root()`. Select a single element with `ComponentRef.$(selector)` or multiple elements with `ComponentRef.$$(selector)`. These elements must be descendents of the root element or the root element itself.

`ComponentRef.root()`, `ComponentRef.$(selector)` and `ComponentRef.$$(selector)` won't return elements directly. They return wrapper. Element wrappers provide helpers such has getters and setters or event listeners.

```javascript
Hydro.component("dropdown", (ref, props) => {
    let isOpen = props.isOpen || false; // Use props to retreive initial state

    const button = ref.$("button");
    
    button.on("click", () => {
        isOpen = !isOpen;
        button.setText(isOpen ? "Close" : "Open");

        if (isOpen) {
            ref.$(".content").removeAttr("hidden");
        } else {
            ref.$(".content").setAttr("hidden", true);
        }
    });
});
```

### Reactivity

It is easy to lose track of a component's state when using getters, setters and listenrs. Signals solve this problem:

Hydro provides a fine grained reactivity system similar to that of SolidJS. You can create reactive getters and setters with `signal()` and bind them to DOM state with methods such as `bindText()` and `bindAttr()`.

```javascript
Hydro.component("dropdown", (ref) => {
    const [open, setOpen] = Hydro.signal(false);
    const buttonText = Hydro.computed(() => open() ? "Close" : "Open");

    ref.$("button")
        .bindText(buttonText())
        .on("click", () => setOpen(prev => !prev));

    ref.$(".content").bindShow(open);
});
```

### Usage with htmx

Combining Hydro with htmx is quite simple, just add these two listeners:

```javascript
document.addEventListener("htmx:load", (e) => {
    Hydro.hydrate(e.target);
})

document.addEventListener("htmx:beforeSwap", (e) => {
    Hydro.destroy(e.target);
});
```

## Contributors

Contibutions are welcome.

## License

[MIT License](https://github.com/QYUbit/Hydro/blob/main/LICENSE)
