import { JSDOM } from "jsdom";

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

const cacheRenewMinutes = 30;
const requestPerMinuteMax = 25;
let cache = {};
let cacheTime = {};
let requestCounter = {earliestTime: 0, latestTime: 0, amount: 0};

function isRequestable() {
    const currentTime = Date.now();
    if ((currentTime - requestCounter.earliestTime) > 60000) {
        requestCounter.earliestTime = currentTime;
        requestCounter.latestTime = currentTime;
        requestCounter.amount = 0;
    }
    if (requestCounter.amount >= requestPerMinuteMax) {
        throw `Too Many Requests: Limit of ${requestPerMinuteMax} anisearch requests per minute exceeded!`
    } else {
        requestCounter.latestTime = currentTime;
        requestCounter.amount++;
    }
}

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
        isRequestable();
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

export function isUserDataValid(userData) {
    return Object.keys(userData).every(key => userDataKeys.includes(key));
}

export async function getAnimeData(url, userData = {}) {
    const id = getIdFromURL(url);
    if (!isUserDataValid(userData))
        throw "The user data has the wrong format " + userDataKeys;
    if (id in cache && id in cacheTime && (Date.now() - cacheTime[id]) / 60000 < cacheRenewMinutes) {
        let cacheProperties = cache[id];
        if (!Array.isArray(cacheProperties.name))
            delete userData.name;
        for (const [key, value] of Object.entries(userData)) {
            cacheProperties[key] = value;
        }
        return cacheProperties;
    }
    if (id in cache)
        delete cache[id];
    if (id in cacheTime)
        delete cacheTime[id];
    if (!strictUrlRegex.test(url))
        url = await getAnisearchURL(url);

    isRequestable();
    let document;
    try {
        let dom = await JSDOM.fromURL(url);
        document = dom.window.document;
        url = document.querySelector("head link[rel='alternate'][hreflang='en']").getAttribute("href");
    } catch (e) {
        throw `Error while trying to get website: ${e}`;
    }
    let scriptJson = JSON.parse(document.querySelector("head script[type='application/ld+json']").innerHTML);
    let informationList = document.querySelector("ul.xlist.row.simple.infoblock");
    let properties = {};
    // _id
    properties._id = getIdFromURL(scriptJson["@id"]);
    // url
    properties.url = url;
    // name
    properties.name = document.querySelector("meta[property='og:title']").getAttribute("content");
    if (!document.querySelector("div.title[lang='en']")) {
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
    // aliases
    properties.aliases = [];
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
    // relations, allRelations
    Object.assign(properties, await getRelations(url));

    cache[id] = {...properties};
    cacheTime[id] = Date.now();

    // userData (name, series, seriesPart, season, status & timestamp, ownStatus & filmId)
    if (!Array.isArray(properties.name))
        delete userData.name;
    for (const [key, value] of Object.entries(userData)) {
        properties[key] = value;
    }
    return properties;
}

export async function updateAnimeData(oldData) {
    return getAnimeData("url" in oldData ? oldData.url : oldData._id, Object.fromEntries(Object.entries(oldData).filter(([key]) => userDataKeys.includes(key))));
}

export async function getRelations(url) {
    const id = getIdFromURL(url);
    if (!strictUrlRegex.test(url))
        url = await getAnisearchURL(url);
    url += "/relations?show=overall"
    isRequestable();
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
    let allRelations = [];
    if (document.getElementById("flowchart")) {
        const dataGraph = JSON.parse(document.getElementById("flowchart").getAttribute("data-graph"));
        Object.keys(dataGraph.nodes.anime).forEach(relationKey => {
            let relationId = relationKey.slice(1);
            if (relationId === id)
                return;
            let title = dataGraph.nodes.anime[relationKey].title;
            allRelations.push({
                id: relationId,
                name: title.slice(0, title.indexOf("<span>")),
                cover: "https://cdn.anisearch.com/images/anime/cover/" + Math.floor(Number(relationId) / 1000) + "/" + relationId + "_600.webp"
            });
        });
    }
    return { relations: relations, allRelations: allRelations };
}