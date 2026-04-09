import {Link, Outlet, useLocation} from "react-router";
import CardList from "./CardList.jsx";
import axios from "axios";
import {ToastContainer} from "react-toastify";
import {websocketPromiseToast, websocketUpdateCallback} from "./ToastUtils.js";
import {useContext} from "react";

import {WebsocketContext} from "./WebsocketContext.jsx";

axios.defaults.validateStatus = () => true;

function Home() {
    const location = useLocation();
    const socket = useContext(WebsocketContext);

    return (
        <>
            <nav>
                <Link to="/">Home</Link>
                <Link to="/add">Add Anime</Link>
                <Link to={location.pathname} className={"right"} onClick={() => {
                    // axiosPromiseToast(axios.post("http://localhost:8080/api/update", {}), "Updating All", "info")
                    websocketPromiseToast(
                        socket.emitWithAck("update", {}),
                        "Updating All",
                        "info",
                        (toastId) => socket.on("updateProgress", websocketUpdateCallback(toastId)),
                        (toastId) => socket.off("updateProgress", websocketUpdateCallback(toastId, true))
                    );
                }}>Update All</Link>
            </nav>
            <CardList />
            <Outlet />
            <ToastContainer theme={"dark"} autoClose={2500} closeOnClick />
        </>
    )
}

export default Home