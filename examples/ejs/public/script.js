Hydro.component("counter", (ref, props) => {
    const [count, setCount] = Hydro.signal(props.count || 0);

    ref.$("button").on("click", () => setCount(prev => prev + 1));
    ref.$(".display").bindText(() => `Count: ${count()}`);
});

document.addEventListener("DOMContentLoaded", () => {
    Hydro.hydrate();
});
