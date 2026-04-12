import {createBrowserRouter, Link, RouterProvider} from 'react-router';
import Home from "./Home.jsx";
import AddPopup from "./AddPopup.jsx";
import CardPopup from "./CardPopup.jsx";
import EditPopup from "./EditPopup.jsx";
import ImportPopup from "./ImportPopup.jsx";
import UpdatesPopup from "./UpdatesPopup.jsx";
import './App.css';
import {useContext, useEffect} from "react";
import {WebsocketContext} from "./WebsocketContext.jsx";


function App() {
    const socket = useContext(WebsocketContext);
    useEffect(() => {
        socket.on("connect",() => {
            console.log("Connection")
        });

        return () => {
            socket.off("connect");
        }
    }, []);

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
                },
                {
                    path: "updates",
                    Component: UpdatesPopup
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
