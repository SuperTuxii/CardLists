import {useContext, useEffect, useState} from "react";
import {Link, useParams} from "react-router";
import './Popup.css';
import {websocketFinishToast, websocketToastIfError} from "./ToastUtils.js";
import {WebsocketContext} from "./WebsocketContext.jsx";
import {FALLBACK_COVER_SRC} from "./constants.js";

function AddPopup() {
    const { id } = useParams();
    const socket = useContext(WebsocketContext);
    const [addUrl, setAddUrl] = useState("");
    const [relations, setRelations] = useState([]);
    const [recommendations, setRecommendations] = useState({});
    const [data, setData] = useState({});

    async function getAPI(url) {
        // const response = (await axiosToastIfError(axios.get("http://localhost:8080/api/get", { params: { url: url }}))).data;
        const response = await websocketToastIfError(socket.emitWithAck("get-url", url));
        setData(response);
        if ("status" in response)
            document.getElementById("status").value = response.status;
        if ("ownStatus" in response)
            document.getElementById("ownStatus").value = response.ownStatus;
        if (response.relations) {
            let newRelations = [];
            for (let i in response.relations) {
                let relation = response.relations[i];
                if (!relation.inDB && !relations.some(item => item.id === relation.id)) {
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
        // await axiosFinishToast(axios.put("http://localhost:8080/api/add", { data: data, url: addUrl }), "success");
        await websocketFinishToast(socket.emitWithAck("add", { data: data, url: addUrl }), "success");
        setAddUrl("");
    }

    async function generateRecommendations() {
        const data = await websocketToastIfError(socket.emitWithAck("get", {
            filter: {allRelations: {$ne: []}},
            projection: {_id: 1, series: 1, allRelations: 1}
        }));
        console.log(data);
        let newRecommendations = {};
        for (let datum of data) {
            if (datum.allRelations.some((relation) => relation.id in newRecommendations))
                continue;
            newRecommendations[datum._id] = {
                series: datum.series,
                relations: datum.allRelations.filter((relation) => !relation.inDB)
            };
            if (!newRecommendations[datum._id].relations.length)
                delete newRecommendations[datum._id];
        }
        console.log(newRecommendations)
        return newRecommendations;
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
                <div className={"top-right-items"}>
                    <button onClick={() => {
                        if (Object.keys(recommendations).length)
                            setRecommendations({});
                        else
                            generateRecommendations().then(setRecommendations);
                    }}>Recommendations</button>
                </div>
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
                        <Link to={"https://www.anisearch.com/anime/" + data._id} target={"_blank"}><img id="cover" src={"cover" in data ? data.cover : undefined} alt={"Cover of the anime to add"}  onError={(e) => e.currentTarget.src = FALLBACK_COVER_SRC}/></Link>
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
                            <img src={relation.cover} alt={"Cover of an anime related to one that has been added"} onError={(e) => e.currentTarget.src = FALLBACK_COVER_SRC}/>
                            <span>
                                <span>{relation.type}</span>
                                {relation.name}
                            </span>
                        </li>
                    ))}
                </ul>
                {Object.entries(recommendations).map(([, info]) => (
                    <>
                        <h4>{info.series}</h4>
                        <ul className={"cover-list"}>
                            {info.relations.map(relation => (
                                <li key={relation.id} onClick={() => setAddUrl(relation.id)}>
                                    <img src={relation.cover} alt={"Cover of an anime that is recommended"} onError={(e) => e.currentTarget.src = FALLBACK_COVER_SRC}/>
                                    <span>{relation.name}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                ))}
            </div>
        </>
    )
}

export default AddPopup