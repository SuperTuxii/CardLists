const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const anisearchAPI = require("./anisearch_api");
const {getAnisearchURL, getIdFromURL, updateAnimeData} = require("./anisearch_api");
const _ = require('lodash');

const app = express();
const corsOptions = {
    origin: ["http://localhost:5173", "http://localhost:4173"],
};
const mongoUrl = "mongodb://localhost:27017";
const mongoClient = new MongoClient(mongoUrl);
try {
    const collection = mongoClient.db("cards_lists").collection("anime");
    collection.createIndex({ name: "text" })
} catch (e) {
    console.error(`Failed to configure anime collection: ${e}`);
}

app.use(cors(corsOptions));
app.use(express.json());

app.get("/api/get", async (req, res) => {
    if ("url" in req.query) {
        try {
            req.query.url = await getAnisearchURL(req.query.url);
        } catch (e) {
            res.status(400).send(e);
            return;
        }
        try {
            const collection = mongoClient.db("cards_lists").collection("anime");
            let data = await collection.findOne({_id: getIdFromURL(req.query.url)});
            if (data) {
                data.fromDB = true;
            } else {
                data = await anisearchAPI.getAnimeData(req.query.url);
                data.relations = await anisearchAPI.getRelations(req.query.url);
                let relations = await collection.find({_id: {$in: data.relations.map(relation => relation.id)}})
                    .sort({_id: 1})
                    .project({_id: true, series: true, seriesPart: true, season: true})
                    .toArray();
                console.log(JSON.stringify(relations));
                if (relations.length) {
                    let relation = relations.find((relation) => data.relations.find((relation2) => relation2.id === relation._id).type === "Prequel");
                    if (!relation) {
                        relation = relations[0];
                    } else {
                        data.seriesPart = Number(relation.seriesPart) + 1;
                        data.season = Number(relation.season) + 1;
                    }
                    data.series = relation.series;
                }
            }
            res.json(data);
        } catch (e) {
            console.error(`Error occurred while trying to get anime data from url: ${e}`);
            res.status(500).send(e);
        }
    } else {
        res.status(400).send("Invalid query parameters");
    }
});

app.get("/api/has", async (req, res) => {
    if ("url" in req.query) {
        try {
            const collection = mongoClient.db("cards_lists").collection("anime");
            res.json(await collection.findOne({_id: getIdFromURL(req.query.url)}) !== null);
        } catch (e) {
            console.error(`Error occurred while checking if anime data exists for url: ${e}`);
            res.status(500).send(e);
        }
    } else {
        res.status(400).send("Invalid query parameters");
    }
});

app.post("/api/get", async (req, res) => {
    if ("filter" in req.body) {
        const options = "options" in req.body ? req.body.options : {};
        const sort = "sort" in req.body ? req.body.sort : { name: 1 };
        const projection = "projection" in req.body ? req.body.projection : {};
        try {
            const collection = mongoClient.db("cards_lists").collection("anime");
            const cursor = await collection.find(req.body.filter, options)
                .sort(sort)
                .project(projection);
            if ("pageSize" in req.body && "page" in req.body) {
                cursor.skip(req.body.page * req.body.pageSize).limit(req.body.pageSize);
            }
            res.json(await cursor.toArray());
        } catch (e) {
            console.error(`Error occurred while trying to get anime data from database: ${e}`);
            res.status(500).send(e);
        }
    } else {
        res.status(400).send("Invalid body");
    }
});

app.post("/api/update", async (req, res) => {
    try {
        let updates = 0;
        let update = {};
        const collection = mongoClient.db("cards_lists").collection("anime");
        const cursor = await collection.find("filter" in req.body ? req.body.filter : {});
        for await (const data of cursor) {
            const newData = await updateAnimeData(data);
            if (!_.isEqual(newData, data)) {
                updates++;
                update = newData;
                await collection.replaceOne({_id: data._id}, newData);
            }
        }
        res.status(200).send(updates > 1 ? `${updates} entries updated` : updates > 0 ? `${update.name} updated` : "Nothing updated");
    } catch (e) {
        console.error(`Error occurred while trying to update anime data: ${e}`);
        res.status(500).send(e);
    }
});

app.put("/api/add", async (req, res) => {
    console.log(JSON.stringify(req.body));
    if ("url" in req.body && "data" in req.body) {
        try {
            const collection = mongoClient.db("cards_lists").collection("anime");
            if (await collection.findOne({_id: getIdFromURL(req.body.url)})) {
                res.status(409).send("Anime Data already exists");
                return;
            }
            const result = await collection.insertOne(await anisearchAPI.getAnimeData(req.body.url, req.body.data));
            if (result.acknowledged) {
                res.status(201).send("Anime was successfully added");
            } else {
                res.status(500).send("Insertion was not acknowledged");
            }
        } catch (e) {
            console.error(`Error occurred while trying to add anime ${req.body.url}: ${e}`);
            res.sendStatus(500);
        }
    } else {
        res.status(400).send("Incorrect body format");
    }
});

app.listen(8080, () => {
    console.log("Server started on port 8080");
});