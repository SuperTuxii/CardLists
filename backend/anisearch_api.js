import { JSDOM } from "jsdom";
// JSDOM.fromURL("https://www.anisearch.com/anime/8878,no-game-no-life").then(dom => {
//     console.log(dom.window.document.getElementById("information").innerHTML);
// });

const generalUrlRegex = /^https:\/\/www\.anisearch\.[^/]+\/anime\/(\d+),?([^/]*)?$/
const strictUrlRegex = /^https:\/\/www\.anisearch\.com\/anime\/(\d+),?([^/]*)?$/
const unitsForTypes = {
    "TV-Series": ["episode", "episodes"],
    "TV-Special": ["special", "specials"],
    "Bonus": ["bonus", "bonuses"],
    "Movie": ["movie", "movies"],
    "OVA": ["OVA", "OVAs"],
    "Web": ["video", "videos"],
    "Unknown": ["?", "?"]
}
const publishStatusValues = {
    "Upcoming": "upcoming",
    "Ongoing": "ongoing",
    "Completed": "done",
    "Canceled": "abandoned"
}
const userDataKeys = [
    "name",
    "series",
    "seriesPart",
    "season",
    "status",
    "timestamp",
    "ownStatus",
    "filmId"
]

export function getIdFromURL(url) {
    if (url.startsWith("anisearch."))
        url = "www." + url;
    if (url.startsWith("www."))
        url = "https://" + url;
    if (/^\d+$/.test(url))
        url = "https://www.anisearch.com/anime/" + url;
    if (!generalUrlRegex.test(url))
        throw "Couldn't get the id from url: The URL is not of the required format";
    return url.replace(generalUrlRegex, "$1");
}

export async function getAnisearchURL(url) {
    if (url.startsWith("anisearch."))
        url = "www." + url;
    if (url.startsWith("www."))
        url = "https://" + url;
    if (/^\d+$/.test(url))
        url = "https://www.anisearch.com/anime/" + url;
    if (!generalUrlRegex.test(url))
        throw "The URL is not of the required format";

    // Switch to the english (.com) website if not already the case
    if (!url.startsWith("https://www.anisearch.com")) {
        try {
            let dom = await JSDOM.fromURL(url);
            url = dom.window.document.querySelector("head link[rel='alternate'][hreflang='en']").getAttribute("href");
        } catch (e) {
            throw `Error while trying to get website: ${e}`;
        }
    }
    if (!strictUrlRegex.test(url))
        throw "The URL is not of the required format";
    return url;
}

export async function getAnimeData(url, userData = {}) {
    if (!strictUrlRegex.test(url))
        url = await getAnisearchURL(url);
    if (!Object.keys(userData).every(key => userDataKeys.includes(key)))
        throw "The user data has the wrong format " + userDataKeys;

    let document;
    try {
        let dom = await JSDOM.fromURL(url);
        document = dom.window.document;
    } catch (e) {
        throw `Error while trying to get website: ${e}`;
    }
    let scriptJson = JSON.parse(document.querySelector("head script[type='application/ld+json']").innerHTML);
    let informationList = document.querySelector("ul.xlist.row.simple.infoblock");
    let properties = {};
    // _id
    properties._id = getIdFromURL(scriptJson["@id"]);
    // name
    properties.name = document.querySelector("meta[property='og:title']").getAttribute("content");
    if (!document.querySelector("div.title[lang='en']")) {
        if ("name" in userData) {
            properties.name = userData.name;
        } else {
            properties.name = [];
            document.querySelectorAll("div.title strong.f16").forEach((titleElement) => properties.name.push(titleElement.innerHTML));
            if (document.querySelector("div.synonyms"))
                document.querySelector("div.synonyms").childNodes.forEach((synonym) => {
                    if (synonym.nodeType !== synonym.TEXT_NODE) {
                        if (synonym.classList.contains("header"))
                            return;
                    }
                    synonym = synonym.textContent.trim();
                    if (!synonym)
                        return;
                    if (synonym.startsWith(","))
                        synonym = synonym.slice(1).trim();
                    if (synonym.endsWith(","))
                        synonym = synonym.slice(0, -1).trim();
                    properties.name.push(synonym);
                });
        }
    }
    if ("name" in userData)
        delete userData.name;
    // aliases
    properties.aliases = [];
    // userData (series, seriesPart, season, status & timestamp, ownStatus & filmId)
    for (const [key, value] of Object.entries(userData)) {
        properties[key] = value;
    }
    // timePerUnit & totalTime
    let typeDiv = informationList.children[0].querySelector("div.type");
    if (typeDiv.querySelector("i")) {
        let timeTag = typeDiv.querySelector("i time");
        properties.timePerUnit = timeTag ? timeTag.innerHTML : "?";
        let totalTime = typeDiv.querySelector("i span#totalRuntime");
        properties.totalTime = totalTime ? totalTime.innerHTML.replace(/^.*Total: /, "").trim() : properties.timePerUnit;
    } else {
        properties.timePerUnit = "?";
        properties.totalTime = "?";
    }
    // started & finished
    let released = informationList.children[0].querySelector("div.released").childNodes[1].textContent.trim();
    if (released.includes(" ‑ ")) {
        let dates = released.split(" ‑ ");
        properties.started = dates[0].trim();
        properties.finished = dates[1].trim();
    } else if (released === "?") {
        properties.started = "?";
        properties.finished = "?";
    } else {
        properties.started = released;
        properties.finished = released;
    }
    // genres
    if ("genre" in scriptJson) {
        properties.genres = scriptJson.genre;
    } else {
        properties.genres = ["?"];
    }
    // studio
    let companyDiv = informationList.children[0].querySelector("div.company");
    if (companyDiv) {
        properties.studio = [];
        for (const company of companyDiv.children) {
            if (company.tagName !== "A")
                continue;
            properties.studio.push(company.innerHTML);
        }
    } else {
        properties.studio = ["?"];
    }
    // staff
    let creatorsDiv = informationList.children[0].querySelector("div.creators");
    if (creatorsDiv) {
        properties.staff = [];
        for (const creators of creatorsDiv.children) {
            if (creators.tagName !== "A")
                continue;
            properties.staff.push(creators.innerHTML);
        }
    } else {
        properties.staff = ["?"];
    }
    // volumeEstimated & volume
    properties.volumeEstimated = typeDiv.querySelector("span.issue-info.showpop") !== null;
    properties.volume = "numberOfEpisodes" in scriptJson ? Number(scriptJson.numberOfEpisodes) : -1;
    // units
    let typeName = typeDiv.childNodes[1].textContent.split(",")[0].trim();
    if (typeName in unitsForTypes) {
        properties.units = unitsForTypes[typeName][properties.volume === 1 ? 0 : 1];
    } else {
        properties.units = "?";
        console.warn(`Unknown Units Type: ${typeName} (${url})`);
    }
    // publishStatus
    let publishStatus = informationList.children[0].querySelector("div.status").childNodes[1].textContent.trim();
    if (publishStatus in publishStatusValues) {
        properties.publishStatus = publishStatusValues[publishStatus];
    } else {
        properties.publishStatus = "?";
        console.warn(`Unknown Publish Status: ${publishStatus} (${url})`);
    }
    // broadcast
    let broadcastDiv = informationList.children[0].querySelector("div.broadcast");
    if (broadcastDiv) {
        properties.broadcast = broadcastDiv.childNodes[1].textContent;
    } else {
        properties.broadcast = "-";
    }
    // aliases & langInfo (languages, dubLanguages, subLanguages)
    properties.languages = [];
    properties.dubLanguages = [];
    properties.subLanguages = [];
    for (const langInfo of informationList.children) {
        let titleDiv = langInfo.querySelector("div.title");
        if (!titleDiv)
            continue;
        let flagImage = langInfo.querySelector("img.flag");
        let language = flagImage.getAttribute("title");
        let statusDiv = langInfo.querySelector("div.status");
        let dubbed = statusDiv.querySelector("a.dubbed");
        let status = statusDiv.childNodes[1].textContent.trim();
        if (status in publishStatusValues) {
            status = publishStatusValues[status];
        } else {
            status = "?";
            console.warn(`Unknown Publish Status: ${status} (${url})`);
        }
        let titleTag = titleDiv.querySelector("strong.f16");
        if (titleTag) {
            properties.aliases.push(titleTag.innerHTML);
        }
        let languageData = {
            name: language,
            image: flagImage.getAttribute("src"),
            status: status
        }
        properties.languages.push(languageData);
        if (dubbed) {
            properties.dubLanguages.push(languageData);
        } else if (langInfo !== informationList.children[0]) {
            properties.subLanguages.push(languageData);
        }
    }
    properties.aliases = [...new Set(properties.aliases)];
    // cover
    properties.cover = "https://cdn.anisearch.com/images/anime/cover/" + Math.floor(properties._id / 1000) + "/" + properties._id + "_600.webp"
    // if ("image" in scriptJson) {
    //     properties.cover = scriptJson.image;
    // } else {
    //     console.warn(`Cover url not found in script json data. Using image src attribute (${url})`);
    //     properties.cover = document.querySelector("img#details-cover").getAttribute("src");
    // }

    return properties;
}

export async function updateAnimeData(oldData) {
    return getAnimeData(oldData._id, Object.fromEntries(Object.entries(oldData).filter(([key]) => userDataKeys.includes(key))));
}

export async function getRelations(url) {
    if (!strictUrlRegex.test(url))
        url = await getAnisearchURL(url);
    url += "/relations"
    let document;
    try {
        let dom = await JSDOM.fromURL(url);
        document = dom.window.document;
    } catch (e) {
        throw `Error while trying to get website: ${e}`;
    }
    let relations = [];
    document.querySelectorAll("#relations_anime tbody tr th").forEach((titleElement) => {
        let element = titleElement.querySelector("a");
        let id = getIdFromURL("https://www.anisearch.com/" + element.getAttribute("href"))
        relations.push({
            id: id,
            name: element.innerHTML,
            cover: "https://cdn.anisearch.com/images/anime/cover/" + Math.floor(id / 1000) + "/" + id + "_600.webp",
            type: titleElement.querySelector("span").innerHTML
        });
    });
    return relations;
}