import {Link, Outlet} from "react-router";
import CardList from "./CardList.jsx";

function Home() {
    return (
        <>
            <nav>
                <Link to="/">Home</Link>
                <Link to="/add">Add Anime</Link>
            </nav>
            <CardList />
            <Outlet />
        </>
    )
}

export default Home