const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const {getAnisearchURL, getIdFromURL, updateAnimeData, isUserDataValid, getAnimeData} = require("./anisearch_api");
const _ = require('lodash');
const { setTimeout } = require("node:timers/promises");
const { createServer } = require("http");
const {Server} = require("socket.io");

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

const httpServer = createServer(app);
const wsServer = new Server(httpServer, {cors: corsOptions})

async function get(params) {
    if ("url" in params) {
        try {
            params.url = await getAnisearchURL(params.url);
        } catch (e) {
            if (e.startsWith("Too Many Requests"))
                throw { status: 429, message: e };
            throw { status: 400, message: e };
        }
        try {
            const collection = mongoClient.db("cards_lists").collection("anime");
            let data = await collection.findOne({_id: getIdFromURL(params.url)});
            if (data) {
                data.fromDB = true;
            } else {
                data = await getAnimeData(params.url);
                let relations = await collection.find({_id: {$in: data.relations.map(relation => relation.id)}})
                    .sort({_id: 1})
                    .project({_id: true, series: true, seriesPart: true, season: true})
                    .toArray();
                for (let relation of data.relations) {
                    relation.inDB = relations.some(relation2 => relation.id === relation2._id);
                }
                let allRelations = await collection.find({_id: {$in: data.allRelations.map(relation => relation.id)}})
                    .sort({_id: 1})
                    .project({_id: true, series: true, seriesPart: true, season: true})
                    .toArray();
                for (let relation of data.allRelations) {
                    relation.inDB = allRelations.some(relation2 => relation.id === relation2._id);
                }
                if (relations.length) {
                    let relation = relations.find((relation) => data.relations.find((relation2) => relation2.id === relation._id).type === "Prequel");
                    if (!relation) {
                        relation = relations[0];
                    } else {
                        data.seriesPart = Number(relation.seriesPart) + 1;
                        data.season = Number(relation.season) + 1;
                    }
                    data.series = relation.series;
                } else if (allRelations.length) {
                    data.series = allRelations[0].series;
                }
            }
            return data;
        } catch (e) {
            if (e.startsWith("Too Many Requests"))
                throw { status: 429, message: e };
            console.error(`Error occurred while trying to get anime data from url: ${e}`);
            throw { status: 500, message: `Error occurred while trying to get anime data from url: ${e}` };
        }
    } else if ("filter" in params) {
        const options = "options" in params ? params.options : {};
        const sort = "sort" in params ? params.sort : { name: 1 };
        const projection = "projection" in params ? params.projection : {};
        try {
            const collection = mongoClient.db("cards_lists").collection("anime");
            const cursor = await collection.find(params.filter, options)
                .sort(sort)
                .project(projection);
            if ("pageSize" in params && "page" in params) {
                cursor.skip(params.page * params.pageSize).limit(params.pageSize);
            }
            return await cursor.toArray();
        } catch (e) {
            console.error(`Error occurred while trying to get anime data from database: ${e}`);
            throw { status: 500, message: `Error occurred while trying to get anime data from database: ${e}` };
        }
    } else {
        throw {status: 400, message: "Invalid get parameters"};
    }
}

async function has(params) {
    if ("url" in params) {
        try {
            const collection = mongoClient.db("cards_lists").collection("anime");
            return await collection.findOne({_id: getIdFromURL(params.url)}) !== null;
        } catch (e) {
            console.error(`Error occurred while checking if anime data exists for url: ${e}`);
            throw { status: 500, message: `Error occurred while checking if anime data exists for url: ${e}` };
        }
    } else {
        throw { status: 400, message: "Invalid has parameters" };
    }
}

let updating = false;
async function update(params, waitCallback = undefined, updateProgress = undefined) {
    if (updating)
        throw { status: 503, message: "Update is already in process" };
    updating = true;
    try {
        let updates = {acknowledged: 0, not_acknowledged: 0, number: 0, updates: []};
        const collection = mongoClient.db("cards_lists").collection("anime");
        const cursor = await collection.find("filter" in params ? params.filter : {});
        const count = await collection.countDocuments("filter" in params ? params.filter : {});
        for await (const data of cursor) {
            if (updateProgress)
                updateProgress(`${updates.number}/${count}: Updating "${data.name}"`);
            let updateTries = 0;
            let newData;
            while (!newData) {
                if (updateTries > 10)
                    throw "Updating failed after retrying 10 times";
                updateTries++;
                try {
                    newData = await updateAnimeData(data);
                } catch (e) {
                    if (!e.startsWith("Too Many Requests"))
                        throw e;
                    if (waitCallback)
                        waitCallback(e, `${updates.number}/${count}`);
                    await setTimeout(15000);
                }
            }
            let relations = await collection.find({_id: {$in: newData.relations.map(relation => relation.id)}})
                .sort({_id: 1})
                .project({_id: true})
                .toArray();
            for (let relation of newData.relations) {
                relation.inDB = relations.some(relation2 => relation.id === relation2._id);
            }
            let allRelations = await collection.find({_id: {$in: newData.allRelations.map(relation => relation.id)}})
                .sort({_id: 1})
                .project({_id: true})
                .toArray();
            for (let relation of newData.allRelations) {
                relation.inDB = allRelations.some(relation2 => relation.id === relation2._id);
            }
            if (!_.isEqual(newData, data)) {
                const result = await collection.replaceOne({_id: data._id}, newData);
                if (result.acknowledged) {
                    updates.acknowledged++;
                    updates.updates.push(newData);
                } else {
                    updates.not_acknowledged++;
                }
            }
            updates.number++;
        }
        let message = updates.acknowledged > 1 ? `${updates.acknowledged} entries updated` : updates.acknowledged > 0 ? `${updates.updates[0].name} updated` : "Nothing to update";
        if (updates.not_acknowledged > 0) {
            message += ` (${updates.not_acknowledged} entries updatable, but not acknowledged)`;
        }
        wsServer.emit("refresh", updates.updates);
        return message;
    } catch (e) {
        console.error(`Error occurred while trying to update anime data: ${e}`);
        throw { status: 500, message: `Error occurred while trying to update anime data: ${e}` };
    } finally {
        updating = false;
    }
}

async function edit(params) {
    if ("id" in params && "data" in params && isUserDataValid(params.data)) {
        try {
            const collection = mongoClient.db("cards_lists").collection("anime");
            const result = await collection.updateOne({ _id: params.id }, { $set: params.data}, { upsert: false });
            if (result.acknowledged) {
                wsServer.emit("refresh", [Object.assign({_id: params.id}, params.data)]);
                return "Changes were successfully saved";
            } else {
                throw "Update was not acknowledged";
            }
        } catch (e) {
            console.error(`Error occurred while trying to edit anime ${params.id}: ${e}`);
            throw { status: 500, message: `Error occurred while trying to edit anime ${params.id}: ${e}` };
        }
    } else {
        throw { status: 400, message: "Incorrect edit parameters" };
    }
}

async function add(params) {
    if ("url" in params && "data" in params) {
        try {
            const collection = mongoClient.db("cards_lists").collection("anime");
            if (await collection.findOne({_id: getIdFromURL(params.url)})) {
                throw { status: 409, message: "Anime Data already exists" };
            }
            const data = await getAnimeData(params.url, params.data);
            let relations = await collection.find({_id: {$in: data.relations.map(relation => relation.id)}})
                .sort({_id: 1})
                .project({_id: true, series: true, seriesPart: true, season: true})
                .toArray();
            for (let relation of data.relations) {
                relation.inDB = relations.some(relation2 => relation.id === relation2._id);
            }
            let allRelations = await collection.find({_id: {$in: data.allRelations.map(relation => relation.id)}})
                .sort({_id: 1})
                .project({_id: true, series: true, seriesPart: true, season: true})
                .toArray();
            for (let relation of data.allRelations) {
                relation.inDB = allRelations.some(relation2 => relation.id === relation2._id);
            }
            const result = await collection.insertOne(data);
            if (result.acknowledged) {
                wsServer.emit("refresh", [data]);
                return "Anime was successfully added";
            } else {
                throw "Insertion was not acknowledged";
            }
        } catch (e) {
            if ("status" in e && "message" in e)
                throw e;
            if (e.startsWith("Too Many Requests"))
                throw { status: 429, message: e };
            console.error(`Error occurred while trying to add anime ${params.url}: ${e}`);
            throw { status: 500, message: `Error occurred while trying to add anime ${params.url}: ${e}` };
        }
    } else {
        throw { status: 400, message: "Incorrect body format" };
    }
}

wsServer.on("connection", (socket) => {
    console.log("User connected: ", socket.id);
    socket.on("disconnect", (reason) => {
        console.log(`User ${socket.id} disconnected. Reason: ${reason}`);
    });

    socket.on("get", (data, callback) => {
        get(data).then(
            (result) => callback(result),
            (e) => callback(e)
        );
    });
    socket.on("get-url", (data, callback) => {
        get({ url: data }).then(
            (result) => callback(result),
            (e) => callback(e)
        );
    });
    socket.on("get-db", (data, callback) => {
        get({ filter: {_id: getIdFromURL(data)} }).then(
            (result) => callback(result[0]),
            (e) => callback(e)
        );
    });
    socket.on("has", (data, callback) => {
        has({ url: data }).then(
            (result) => callback(result),
            (e) => callback(e)
        );
    });
    socket.on("update", (data) => {
        update(data ? { filter: data } : {},
            (e, updates) => wsServer.emit("updateProgress", `${updates}: ${e}`),
            (updateProgress) => wsServer.emit("updateProgress", updateProgress)
        ).then(
            (result) => wsServer.emit("updateFinished", result),
            (e) => {
                if (e.status === 503 && e.message === "Update is already in process")
                    socket.emit("updateProgress", e.message);
                else
                    wsServer.emit("updateFinished", e);
            }
        );
    });
    socket.on("edit", (data, callback) => {
        edit(data).then(
            (result) => callback(result),
            (e) => callback(e)
        );
    });
    socket.on("add", (data, callback) => {
        add(data).then(
            (result) => callback(result),
            (e) => callback(e)
        );
    });
});

app.get("/api/get", (req, res) => {
    get(req.query).then(
        (result) => res.json(result),
        (e) => res.status(e.status).send(e.message)
    );
});

app.get("/api/has", (req, res) => {
    has(req.query).then(
        (result) => res.json(result),
        (e) => res.status(e.status).send(e.message)
    );
});

app.post("/api/get", (req, res) => {
    get(req.body).then(
        (result) => res.json(result),
        (e) => res.status(e.status).send(e.message)
    );
});

app.post("/api/update", (req, res) => {
    update(req.body, (e) => {
        if (!res.headersSent)
            res.status(202).send(`${e} Scheduled to retry after a delay.`)
    }).then((result) => {
        if (res.headersSent) {
            console.info(result);
        } else {
            res.status(200).send(result);
        }
    }, (e) => {
        if (!res.headersSent)
            res.status(e.status).send(e.message);
    });
});

app.post("/api/edit", (req, res) => {
    edit(req.body).then(
        (result) => res.status(200).send(result),
        (e) => res.status(e.status).send(e.message)
    );
})

app.put("/api/add", (req, res) => {
    add(req.body).then(
        (result) => res.status(201).send(result),
        (e) => res.status(e.status).send(e.message)
    );
});

httpServer.listen(8080, () => {
    console.log("Server started on port 8080");
});