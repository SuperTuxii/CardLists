const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const anisearchAPI = require("./anisearch_api");

const app = express();
const corsOptions = {
    origin: ["http://localhost:5173"],
};
const mongoUrl = "mongodb://localhost:27017";
const mongoClient = new MongoClient(mongoUrl);

app.use(cors(corsOptions));

app.get("/api", async (req, res) => {
    // mongoClient.connect(mongoUrl, function(err, db) {
    //     if (err) throw err;
    //     const dbo = db.db("cards_lists");
    //     const collection = dbo.collection("anime");
    //     collection.insertOne(demoAnimeData, function(err, res) {
    //         if (err) throw err;
    //         console.log("Demo data inserted");
    //         db.close();
    //     });
    // });
    try {
        const collection = mongoClient.db("cards_lists").collection("anime");
        await collection.createIndex({name: 1}, {unique: true});
        await anisearchAPI.getAnimeData("www.anisearch.com/anime/20691,a-rank-party-o-ridatsu-shita-ore-wa-moto-oshiego-tachi-to-meikyuu-shinbu-o-mezasu-2");
        await anisearchAPI.getAnimeData("anisearch.de/anime/17452,oshi-no-ko-mein-star");
        // await collection.insertOne(await anisearchAPI.getAnimeData("anisearch.de/anime/17452,oshi-no-ko-mein-star"));
        // await collection.insertOne({name: "Oshi no Ko", test: "Test"})
    } catch (e) {
        console.log(`Error occurred while trying to insert objects: ${e}`);
    }
    console.log("API Request");
    res.json({"test": "Hello World!"});
})

app.listen(8080, () => {
    console.log("Server started on port 8080");
});