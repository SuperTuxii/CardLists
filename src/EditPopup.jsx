import {Link, useNavigate, useParams} from "react-router";
import './Popup.css';
import axios from "axios";
import {useEffect, useState} from "react";
import {axiosFinishToast, axiosToastIfError} from "./ToastUtils.js";

function EditPopup() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState({});

    async function getAPI(url){
        const response = await axiosToastIfError(axios.get("http://localhost:8080/api/get", { params: { url: url }}));
        console.log(JSON.stringify(response.data, null, 2));
        return response.data;
    }

    async function editAPI() {
        const data = Object.fromEntries(new FormData(document.getElementById("animeInfo")).entries());
        await axiosFinishToast(axios.post("http://localhost:8080/api/edit", { data: data, id: id }), "success");
    }

    useEffect(() => {
        getAPI(id).then(setData);
    }, [id]);

    useEffect(() => {
        if ("status" in data && "ownStatus" in data) {
            document.getElementById("status").value = data.status;
            document.getElementById("ownStatus").value = data.ownStatus;
            document.getElementById("status").dispatchEvent(new Event("change", {bubbles: true}));
            document.getElementById("ownStatus").dispatchEvent(new Event("change", {bubbles: true}));
        }
    }, [data]);

    return (
        <>
            <Link to={`/show/${id}`}>
                <div id="overlay"></div>
            </Link>
            <div id="popup">
                <form id="animeInfo" className={"no-border"} style={{display: "block"}} onSubmit={(e) => {
                    e.preventDefault();
                    document.getElementById("timestamp").disabled = false;
                    document.getElementById("filmId").disabled = false;
                    editAPI();
                    navigate(`/show/${id}`);
                }}>
                    <h3 id="name" style={Array.isArray(data.name) ? {display: "none"} : {}}>{data.name}</h3>
                    <select className="fill" style={Array.isArray(data.name) ? {display: "block"} : {}} name={"name"} id={"name"}>
                        {Array.isArray(data.name) ? data.name.map((name, index) => <option key={index} value={name}>{name}</option>) : <></>}
                    </select>
                    <div className="horizontal">
                        <div className="table">
                            <div className="row">
                                <label>Series: </label>
                                <input className="fill" type={"text"} defaultValue={data.series} name={"series"} id={"series"} required/>
                            </div>
                            <div className="row">
                                <label>Series Part: </label>
                                <input className="fill" type={"number"} min={1} defaultValue={data.seriesPart} name={"seriesPart"} id={"seriesPart"} required/>
                            </div>
                            <div className="row">
                                <label>Season: </label>
                                <input className="fill" type={"number"} min={0} step={0.25} defaultValue={data.season} name={"season"} id={"season"} required/>
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
                                }} name={"status"} id={"status"} required>
                                    <option value={"ongoing"}>Ongoing</option>
                                    <option value={"queue"}>Queue</option>
                                    <option value={"done"}>Done</option>
                                    <option value={"abandoned"}>Abandoned</option>
                                </select>
                            </div>
                            <div className="row">
                                <label>Timestamp: </label>
                                <input className="fill" type={"number"} min={0} max={data.volume} defaultValue={data.timestamp} name={"timestamp"} id={"timestamp"} required/>
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
                                <input className="fill" type={"number"} min={0} defaultValue={data.filmId} name={"filmId"} id={"filmId"}/>
                            </div>
                        </div>
                        <Link to={"https://www.anisearch.com/anime/" + data._id} target={"_blank"}><img id="cover" src={data.cover} alt={"Cover of the anime to add"} /></Link>
                    </div>
                    <input type="submit" value="Save Changes" id={"submit"} />
                </form>
            </div>
        </>
    )
}

export default EditPopup