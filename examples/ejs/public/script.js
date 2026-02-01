Hydro.component("counter", (ref, props) => {
    const [count, setCount] = Hydro.signal(props.count || 0);

    ref.$("button").on("click", () => setCount(prev => prev + 1));
    ref.$(".display").bindText(() => `Count: ${count()}`);
});

Hydro.component("todo-list", (ref) => {
    const [todos, setTodos] = Hydro.signal([]);
    const [input, setInput] = Hydro.signal("");

    const inputEl = ref.$("#input");

    inputEl.bindValue(input);
    inputEl.on("input", () => setInput(inputEl.getValue()));
    
    ref.$("button").on("click", () => {
        setTodos(prev => [...prev, input]);
        setInput("");
    });

    ref.$("ul").bindChildren(todos, (el, todo) => {
        const li = ref.create("li");
        li.setText(todo);

        li.on("click", () => {
            setTodos(prev => prev.filter(item => item !== todo));
        });

        el.appendChild(li.element);

        return () => {
            el.removeChild(li.element);
        };
    });
});

document.addEventListener("DOMContentLoaded", () => {
    Hydro.hydrate();
});
