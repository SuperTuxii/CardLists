import {Link, Outlet, useLocation} from "react-router";
import CardList from "./CardList.jsx";
import axios from "axios";
import {ToastContainer} from "react-toastify";
import {axiosPromiseToast} from "./ToastUtils.js";

axios.defaults.validateStatus = () => true;

function Home() {
    const location = useLocation();
    return (
        <>
            <nav>
                <Link to="/">Home</Link>
                <Link to="/add">Add Anime</Link>
                <Link to={location.pathname} className={"right"} onClick={() => axiosPromiseToast(axios.post("http://localhost:8080/api/update", {}), "Updating All", "info")}>Update All</Link>
            </nav>
            <CardList />
            <Outlet />
            <ToastContainer theme={"dark"} autoClose={2500} closeOnClick />
        </>
    )
}

export default Home