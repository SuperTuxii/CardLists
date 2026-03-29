import {RouterProvider, createBrowserRouter, Link} from 'react-router';
import Home from "./Home.jsx";
import AddPopup from "./AddPopup.jsx";
import CardPopup from "./CardPopup.jsx";
import EditPopup from "./EditPopup.jsx";
import ImportPopup from "./ImportPopup.jsx";
import './App.css';

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
                    path: "import",
                    Component: ImportPopup
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
