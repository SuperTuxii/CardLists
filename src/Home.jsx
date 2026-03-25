import {Link, Outlet, useLocation} from "react-router";
import CardList from "./CardList.jsx";
import axios from "axios";
import {toast, ToastContainer} from "react-toastify";

function Home() {
    const location = useLocation();
    return (
        <>
            <nav>
                <Link to="/">Home</Link>
                <Link to="/add">Add Anime</Link>
                <Link to={location.pathname} className={"right"} onClick={() => axios.post("http://localhost:8080/api/update", {}).then(response => toast(response.data))}>Update All</Link>
            </nav>
            <CardList />
            <Outlet />
            <ToastContainer theme={"dark"} />
        </>
    )
}

export default Home