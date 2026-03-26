import {useEffect, useState} from "react";
import {Link, useParams} from "react-router";
import axios from "axios";
import './Popup.css';
import {toast} from "react-toastify";

function AddPopup() {
    const { id } = useParams();
    const [addUrl, setAddUrl] = useState("");
    const [relations, setRelations] = useState([]);
    const [data, setData] = useState({});

    async function getAPI(url){
        const response = await axios.get("http://localhost:8080/api/get", { params: { url: url }});
        console.log(JSON.stringify(response.data, null, 2));
        setData(response.data);
        if ("status" in response.data)
            document.getElementById("status").value = response.data.status;
        if ("ownStatus" in response.data)
            document.getElementById("ownStatus").value = response.data.ownStatus;
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
        toast(response.data, { type: (response.status >= 200 && response.status < 300) ? "success" : "error" });
        setAddUrl("");
    }

    useEffect(() => {
        if (id)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAddUrl(id);
    }, [id]);

    useEffect(() => {
        const timer = setTimeout(() => {
            document.querySelector("#popup input").value = addUrl;
            document.getElementById("animeInfo").reset();
            if (addUrl) {
                getAPI(addUrl);
            } else {
                setData({});
            }
        }, addUrl === id && !document.querySelector("#popup input").value ? 0 : 500);
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
                <form id="animeInfo" style={Object.keys(data).length ? {display: "block"} : {display: "none"}} onSubmit={(e) => {
                    e.preventDefault();
                    document.getElementById("timestamp").disabled = false;
                    document.getElementById("filmId").disabled = false;
                    addAPI();
                }}>
                    <h3 id="name" style={Array.isArray(data.name) ? {display: "none"} : {}}>{data.name}</h3>
                    <select className="fill" style={Array.isArray(data.name) ? {display: "block"} : {}} name={"name"} id={"name"}>
                        {Array.isArray(data.name) ? data.name.map((name, index) => <option key={index} value={name}>{name}</option>) : <></>}
                    </select>
                    <div className="horizontal">
                        <div className="table">
                            <div className="row">
                                <label>Series: </label>
                                <input className="fill" type={"text"} defaultValue={"series" in data ? data.series : data.name} name={"series"} id={"series"} required/>
                            </div>
                            <div className="row">
                                <label>Series Part: </label>
                                <input className="fill" type={"number"} min={1} defaultValue={"seriesPart" in data ? data.seriesPart : 1} name={"seriesPart"} id={"seriesPart"} required/>
                            </div>
                            <div className="row">
                                <label>Season: </label>
                                <input className="fill" type={"number"} min={0} step={0.25} defaultValue={"season" in data ? data.season : 1} name={"season"} id={"season"} required/>
                            </div>
                            <div className="row">
                                <label>Status: </label>
                                <select className="fill" onChange={(e) =>  {
                                    const timestampInput = document.getElementById("timestamp");
                                    if (e.target.value === "done") {
                                        timestampInput.value = timestampInput.max;
                                        timestampInput.disabled = true;
                                    } else if (e.target.value === "queue") {
                                        timestampInput.value = timestampInput.min;
                                        timestampInput.disabled = true;
                                    } else {
                                        timestampInput.disabled = false;
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
                                <input className="fill" type={"number"} min={0} max={data.volume} defaultValue={"timestamp" in data ? data.timestamp : 0} name={"timestamp"} id={"timestamp"} required/>
                            </div>
                            <div className="row">
                                <label>Own Status: </label>
                                <select className="fill" onChange={(e) =>  {
                                    const filmIdInput = document.getElementById("filmId");
                                    if (["ongoing", "owned"].includes(e.target.value)) {
                                        filmIdInput.disabled = false;
                                        if (filmIdInput.value === -1)
                                            filmIdInput.value = 0;
                                    } else {
                                        filmIdInput.value = -1;
                                        filmIdInput.disabled = true;
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
                                <input className="fill" type={"number"} min={0} defaultValue={"filmId" in data ? data.filmId : undefined} name={"filmId"} id={"filmId"}/>
                            </div>
                        </div>
                        <img id="cover" src={"cover" in data ? data.cover : undefined} alt={"Cover of the anime to add"} />
                    </div>
                    <label id={"message"}>{data.fromDB ? "Anime already exists" : ""}</label><br/>
                    <input type="submit" value="Create Anime" disabled={data.fromDB} id={"submit"} />
                </form>
                <ul className={"cover-list"}>
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