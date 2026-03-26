import {RouterProvider, createBrowserRouter, Link} from 'react-router';
import Home from "./Home.jsx";
import AddPopup from "./AddPopup.jsx";
import CardPopup from "./CardPopup.jsx";
import './App.css';
import EditPopup from "./EditPopup.jsx";

function App() {
    let router = createBrowserRouter([
        {
            path: "/",
            Component: Home,
            children: [
                {
                    path: "add",
                    Component: AddPopup
                },
                {
                    path: "add/:id",
                    Component: AddPopup
                },
                {
                    path: "show/:id",
                    Component: CardPopup
                },
                {
                    path: "edit/:id",
                    Component: EditPopup
                }
            ]
        },
        {
            path: "*",
            Component: () => (
                <>
                    <nav>
                        <Link to="/">Home</Link>
                        <Link to="/add">Add Anime</Link>
                    </nav>
                    <h1>Not a site</h1>
                </>
            )
        }
    ]);

    return (
        <RouterProvider router={router} />
    );
}

export default App
