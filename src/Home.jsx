import {Link, Outlet, useLocation} from "react-router";
import CardList from "./CardList.jsx";
import axios from "axios";
import {ToastContainer} from "react-toastify";
import {websocketPromiseToast, websocketUpdateCallback} from "./ToastUtils.js";
import {useContext, useState} from "react";

import {WebsocketContext} from "./WebsocketContext.jsx";

axios.defaults.validateStatus = () => true;

function Home() {
    const location = useLocation();
    const socket = useContext(WebsocketContext);
    const [updateListSignal, emitUpdateListSignal] = useState(0);
    const [presetFilters, setPresetFilters] = useState({});

    return (
        <>
            <nav>
                <div className={"left"}>
                    <Link to="/">Home</Link>
                    <Link to="/add">Add Anime</Link>
                </div>
                <div className={"center"}>
                    <Link to={location.pathname} onClick={() => setPresetFilters({status: ["ongoing"]})}>Ongoing</Link>
                    <Link to={location.pathname} onClick={() => setPresetFilters({status: ["queue"]})}>Queue</Link>
                    <Link to={location.pathname} onClick={() => setPresetFilters({status: ["done"]})}>Done</Link>
                    <Link to={location.pathname} onClick={() => setPresetFilters({status: ["abandoned"]})}>Abandoned</Link>
                    <Link to={location.pathname} onClick={() => setPresetFilters({})}>All</Link>
                </div>
                <div className={"right"}>
                    <Link to="/updates">Updates</Link>
                    <Link to={location.pathname} onClick={() => emitUpdateListSignal(updateListSignal+1)}>Update Listed</Link>
                    <Link to={location.pathname} onClick={() => {
                        // axiosPromiseToast(axios.post("http://localhost:8080/api/update", {}), "Updating All", "info")
                        websocketPromiseToast(
                            new Promise((resolve) => {
                                socket.emit("update", {});
                                socket.once("updateFinished", resolve);
                            }),
                            "Updating All",
                            "info",
                            (toastId) => socket.on("updateProgress", websocketUpdateCallback(toastId)),
                            (toastId) => socket.off("updateProgress", websocketUpdateCallback(toastId, true))
                        )
                    }}>Update All</Link>
                </div>
            </nav>
            <CardList updateListSignal={updateListSignal} presetFilters={presetFilters}/>
            <Outlet />
            <ToastContainer theme={"dark"} autoClose={2500} closeOnClick />
        </>
    )
}

export default Home