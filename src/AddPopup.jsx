import {useEffect, useState} from "react";
import {Link} from "react-router";
import axios from "axios";
import './Popup.css';

function AddPopup() {
    const [addUrl, setAddUrl] = useState("");
    const [relations, setRelations] = useState([]);

    async function getAPI(url){
        const response = await axios.get("http://localhost:8080/api/get", { params: { url: url }});
        console.log(JSON.stringify(response.data, null, 2));
        document.getElementById("animeInfo").style.display = "block";
        document.getElementById("cover").src = response.data.cover;
        document.querySelector("select#name").replaceChildren();
        if (Array.isArray(response.data.name)) {
            document.querySelector("h3#name").style.display = "none";
            const select = document.querySelector("select#name");
            select.style.display = "block";
            response.data.name.forEach(name => {
                const option = new Option(name, name);
                select.add(option);
            });
        } else {
            document.querySelector("h3#name").style.display = "block";
            document.querySelector("select#name").style.display = "none";
            document.querySelector("h3#name").innerText = response.data.name;
        }
        if (response.data.fromDB) {
            document.getElementById("series").value = response.data.series;
            document.getElementById("seriesPart").value = response.data.seriesPart;
            document.getElementById("season").value = response.data.season;
            document.getElementById("status").value = response.data.status;
            document.getElementById("timestamp").value = response.data.timestamp;
            document.getElementById("ownStatus").value = response.data.ownStatus;
            document.getElementById("filmId").value = response.data.filmId;
            document.getElementById("message").innerText = "Anime already exists";
            document.getElementById("submit").disabled = true;
        } else {
            document.getElementById("series").value = "series" in response.data ? response.data.series : response.data.name;
            if ("seriesPart" in response.data)
                document.getElementById("seriesPart").value = response.data.seriesPart;
            if ("season" in response.data)
                document.getElementById("season").value = response.data.season;
            document.getElementById("timestamp").max = response.data.volume;
            document.getElementById("message").innerText = "";
            document.getElementById("submit").disabled = false;
        }
        if (response.data.relations) {
            let newRelations = [];
            for (let i in response.data.relations) {
                let relation = response.data.relations[i];
                const hasRelation = await axios.get("http://localhost:8080/api/has", { params: { url: relation.id }});
                if (!hasRelation.data && !relations.some(item => item.id === relation.id)) {
                    newRelations.push(relation);
                }
            }
            setRelations(relations.concat(newRelations));
        }
        document.getElementById("status").dispatchEvent(new Event("change", { bubbles: true }))
        document.getElementById("ownStatus").dispatchEvent(new Event("change", { bubbles: true }))
    }

    async function addAPI() {
        const data = Object.fromEntries(new FormData(document.getElementById("animeInfo")).entries());
        const response = await axios.put("http://localhost:8080/api/add", { data: data, url: addUrl});
        console.log(response);
        setAddUrl("");
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            document.querySelector("#popup input").value = addUrl;
            document.getElementById("animeInfo").reset();
            if (addUrl) {
                getAPI(addUrl);
            } else {
                document.getElementById("animeInfo").style.display = "none";
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [addUrl]);

    return (
        <>
            <Link to="/">
                <div id="overlay"></div>
            </Link>
            <div id="popup">
                <h2>Add Anime</h2>
                <p>Anisearch URL:</p>
                <input className="fill" onChange={e => setAddUrl(e.target.value)}></input>
                <form id="animeInfo" onSubmit={(e) => {
                    e.preventDefault();
                    addAPI();
                }}>
                    <h3 id="name"></h3>
                    <select className="fill" name={"name"} id={"name"}/>
                    <div className="horizontal">
                        <div className="table">
                            <div className="row">
                                <label>Series: </label>
                                <input className="fill" type={"text"} name={"series"} id={"series"} required/>
                            </div>
                            <div className="row">
                                <label>Series Part: </label>
                                <input className="fill" type={"number"} min={1} defaultValue={1} name={"seriesPart"} id={"seriesPart"} required/>
                            </div>
                            <div className="row">
                                <label>Season: </label>
                                <input className="fill" type={"number"} min={0} step={0.25} defaultValue={1} name={"season"} id={"season"} required/>
                            </div>
                            <div className="row">
                                <label>Status: </label>
                                <select className="fill" onChange={(e) =>  {
                                    const timestampInput = document.getElementById("timestamp");
                                    if (e.target.value === "done") {
                                        timestampInput.value = timestampInput.max;
                                        timestampInput.readOnly = true;
                                    } else if (e.target.value === "queue") {
                                        timestampInput.value = timestampInput.min;
                                        timestampInput.readOnly = true;
                                    } else {
                                        timestampInput.readOnly = false;
                                    }
                                }} defaultValue={"queue"} name={"status"} id={"status"} required>
                                    <option value={"ongoing"}>Ongoing</option>
                                    <option value={"queue"}>Queue</option>
                                    <option value={"done"}>Done</option>
                                    <option value={"abandoned"}>Abandoned</option>
                                </select>
                            </div>
                            <div className="row">
                                <label>Timestamp: </label>
                                <input className="fill" type={"number"} min={0} defaultValue={0} name={"timestamp"} id={"timestamp"} required/>
                            </div>
                            <div className="row">
                                <label>Own Status: </label>
                                <select className="fill" onChange={(e) =>  {
                                    const filmIdInput = document.getElementById("filmId");
                                    if (["ongoing", "owned"].includes(e.target.value)) {
                                        filmIdInput.readOnly = false;
                                        if (filmIdInput.value === -1)
                                            filmIdInput.value = 0;
                                    } else {
                                        filmIdInput.value = -1;
                                        filmIdInput.readOnly = true;
                                    }
                                }} name={"ownStatus"} id={"ownStatus"} required>
                                    <option value={"unknown"}>Unknown</option>
                                    <option value={"planned"}>Planned</option>
                                    <option value={"ongoing"}>Ongoing</option>
                                    <option value={"owned"}>Owned</option>
                                </select>
                            </div>
                            <div className="row">
                                <label>Film ID: </label>
                                <input className="fill" type={"number"} min={0} name={"filmId"} id={"filmId"}/>
                            </div>
                        </div>
                        <img id="cover" alt={"Cover of the anime to add"} />
                    </div>
                    <label id={"message"} /><br/>
                    <input type="submit" value="Create Anime" id={"submit"} />
                </form>
                <ul className={"cover-list"} onWheel={e => e.currentTarget.scrollLeft += e.deltaY}>
                    {relations.map(relation => (
                        <li key={relation.id} onClick={() => {
                            setAddUrl(relation.id);
                            setRelations(relations.filter(item => item.id !== relation.id));
                        }}>
                            <img src={relation.cover} alt={"Cover of an anime related to one that has been added"}/>
                            <span>
                                <span>{relation.type}</span>
                                {relation.name}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    )
}

export default AddPopup