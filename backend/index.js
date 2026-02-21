// eslint-disable-next-line no-undef
const express = require("express")
const app = express();
// eslint-disable-next-line no-undef
const cors = require("cors");
const corsOptions = {
    origin: ["http://localhost:5173"],
};

app.use(cors(corsOptions));

app.get("/api", (req, res) => {
    res.json({"test": "Hello World!"});
    console.log("Request");
})

app.listen(8080, () => {
    console.log("Server started on port 8080");
});