import express from "express";
import path from "node:path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set("views", path.join(__dirname, "./views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "./public")));

app.get("/", (req, res) => {
    res.render("index", { counterProps: { count: Math.floor(Math.random() * (10 + 1)) } });
});

app.listen(3000, () => {
    console.log("http://localhost:3000");
});
