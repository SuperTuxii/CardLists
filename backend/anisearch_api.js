import { JSDOM } from "jsdom";
// JSDOM.fromURL("https://www.anisearch.com/anime/8878,no-game-no-life").then(dom => {
//     console.log(dom.window.document.getElementById("information").innerHTML);
// });

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

export async function getAnimeData(url) {
    if (url.startsWith("anisearch."))
        url = "www." + url;
    if (url.startsWith("www."))
        url = "https://" + url;
    if (!url.startsWith("https://www.anisearch."))
        throw "The URL is not an anisearch url";

    let document;
    try {
        // Switch to the english (.com) website if not already the case
        if (!url.startsWith("https://www.anisearch.com")) {
            let dom = await JSDOM.fromURL(url);
            url = dom.window.document.querySelector("head link[rel='alternate'][hreflang='en']").getAttribute("href");
        }
        let dom = await JSDOM.fromURL(url);
        document = dom.window.document;
    } catch (e) {
        throw `Error while trying to get website: ${e}`;
    }
    let scriptJson = JSON.parse(document.querySelector("head script[type='application/ld+json']").innerHTML);
    let informationList = document.querySelector("ul.xlist.row.simple.infoblock");
    let properties = {};
    // name
    properties.name = scriptJson.name;
    if (!document.querySelector("div.title[lang='en']")) {
        properties.name = [];
        document.querySelectorAll("div.title strong.f16").forEach((titleElement) => properties.name.push(titleElement.innerHTML));
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
    // series
    // properties.series = properties.name;
    // seriesPart
    // properties.seriesPart = 1;
    // season
    // properties.season = properties.seriesPart;
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
            if (company.tagName !== "a")
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
            if (creators.tagName !== "a")
                continue;
            properties.staff.push(creators.innerHTML);
        }
    } else {
        properties.staff = ["?"];
    }
    // volumeEstimated & volume
    properties.volumeEstimated = typeDiv.querySelector("span.issue-info.showpop") !== null;
    properties.volume = "numberOfEpisodes" in scriptJson ? Number(scriptJson.numberOfEpisodes) : -1;
    // status & timestamp
    // let status = "queue";
    // properties.timestamp = 0;
    // units
    let typeName = typeDiv.childNodes[1].textContent.split(",")[0].trim();
    if (typeName in unitsForTypes) {
        properties.units = unitsForTypes[typeName][properties.volume === 1 ? 0 : 1];
    } else {
        properties.units = "?";
        console.warn(`Unknown Units Type: ${typeName} (${url})`);
    }
    // status (setting)
    // properties.status = status;
    // publishStatus
    let publishStatus = informationList.children[0].querySelector("div.status").childNodes[1].textContent.trim();
    if (publishStatus in publishStatusValues) {
        properties.publishStatus = publishStatusValues[publishStatus];
    } else {
        properties.publishStatus = "?";
        console.warn(`Unknown Publish Status: ${publishStatus} (${url})`);
    }
    // ownStatus & filmId
    // properties.ownStatus = "unknown";
    // properties.filmId = -1;
    // broadcast
    let broadcastDiv = informationList.children[0].querySelector("div.broadcast");
    if (broadcastDiv) {
        properties.broadcast = broadcastDiv.childNodes[1].textContent;
    } else {
        properties.broadcast = "-";
    }
    // aliases & langInfo (languages, languageStatus, languagesAndStatus, dubLanguages, dubLanguageStatus, dubLanguagesAndStatus, subLanguages, subLanguageStatus, subLanguagesAndStatus, languageImages, dubLanguageImages, subLanguageImages)
    properties.languages = [];
    properties.languageStatus = [];
    properties.languagesAndStatus = [];
    properties.dubLanguages = [];
    properties.dubLanguageStatus = [];
    properties.dubLanguagesAndStatus = [];
    properties.subLanguages = [];
    properties.subLanguageStatus = [];
    properties.subLanguagesAndStatus = [];
    properties.languageImages = [];
    properties.dubLanguageImages = [];
    properties.subLanguageImages = [];
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
        properties.languages.push(language);
        properties.languageStatus.push(status);
        properties.languagesAndStatus.push(`${language} (${status})`);
        properties.languageImages.push(flagImage.getAttribute("src"));
        if (dubbed) {
            properties.dubLanguages.push(language);
            properties.dubLanguageStatus.push(status);
            properties.dubLanguagesAndStatus.push(`${language} (${status})`);
            properties.dubLanguageImages.push(flagImage.getAttribute("src"));
        } else if (langInfo !== informationList.children[0]) {
            properties.subLanguages.push(language);
            properties.subLanguageStatus.push(status);
            properties.subLanguagesAndStatus.push(`${language} (${status})`);
            properties.subLanguageImages.push(flagImage.getAttribute("src"));
        }
    }
    properties.aliases = [...new Set(properties.aliases)];
    // cover
    if ("image" in scriptJson) {
        properties.cover = scriptJson.image;
    } else {
        console.warn(`Cover url not found in script json data. Using image src attribute (${url})`);
        properties.cover = document.querySelector("img#details-cover").getAttribute("src");
    }
    // anisearchUrl
    properties.anisearchUrl = document.querySelector("head link[rel='alternate'][hreflang='en']").getAttribute("href");

    console.log("Properties: " + JSON.stringify(properties));
    return properties;
}