import express from "express";
import path from "path";

import { showProfile } from "./controllers/profile-controller";

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("auth/login");
});

app.get("/perfil", showProfile);

export default app;