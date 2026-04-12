import {Link} from "react-router";
import {useContext, useEffect, useState} from "react";
import {websocketToastIfError} from "./ToastUtils.js";
import {WebsocketContext} from "./WebsocketContext.jsx";


function UpdatesPopup() {
    const socket = useContext(WebsocketContext);
    const [fullUpdateHistory, setFullUpdateHistory] = useState([]);
    const [type, setType] = useState("all");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    const updateHistory = fullUpdateHistory
        .filter((update) => type === "all" || Object.values(update.differences).some((differences) => type in differences))
        .map((update) => {
            if (type !== "all")
                update = {
                    ...update,
                    differences: Object.fromEntries(
                        Object.entries(update.differences).filter(([, differences]) => type in differences)
                    )
                };
            return update;
        })
        .slice((page - 1) * pageSize, page * pageSize);


    async function getUpdateHistory(params) {
        return await websocketToastIfError(socket.emitWithAck("updateHistory", params));
    }

    useEffect(() => {
        getUpdateHistory({}).then(setFullUpdateHistory);
    }, []);

    return (
        <>
            <Link to="/">
                <div id="overlay"></div>
            </Link>
            <div id="popup">
                <h2 id="name">Update History</h2>
                <div className={"horizontal"}>
                    <label>Type: </label>
                    <select onChange={(e) => setType(e.target.value)} id={"type"} required>
                        <option value={"all"}>All</option>
                        <option value={"relations"}>Relations</option>
                        <option value={"allRelations"}>AllRelations</option>
                        <option value={"languages"}>Languages</option>
                        <option value={"subLanguages"}>SubLanguages</option>
                        <option value={"dubLanguages"}>DubLanguages</option>
                    </select>
                </div>
                <div className={"horizontal"}>
                    <label>Page: </label>
                    <input type={"number"} min={1} defaultValue={1} id={"page"} onChange={(e) => setPage(Number(e.target.value))}/>
                    <label>Updates per Page: </label>
                    <input type={"number"} min={1} defaultValue={5} id={"pageSize"} onChange={(e) => setPageSize(Number(e.target.value))}/>
                </div>
                {updateHistory.map((update) => (
                    <>
                        <h2>{new Date(update.time).toLocaleString()}</h2>
                        {Object.entries(update.differences).map(([id, differences]) => (
                            <>
                                <h3>{update.names[id]}</h3>
                                {type === "all" ?
                                    Object.entries(differences).map(([key, difference]) => (
                                        <>
                                            <h4>{key.charAt(0).toUpperCase() + key.slice(1)}</h4>
                                            {
                                                "from" in difference && "to" in difference ?
                                                    (<p>From {JSON.stringify(difference.from)} to {JSON.stringify(difference.to)}</p>) :
                                                    <></>
                                            }
                                            {
                                                "add" in difference ?
                                                    difference.add.map((add) => (<p>Added {JSON.stringify(add)}</p>)) :
                                                    <></>
                                            }
                                            {
                                                "remove" in difference ?
                                                    difference.remove.map((remove) => (<p>Removed {JSON.stringify(remove)}</p>)) :
                                                    <></>
                                            }
                                        </>
                                    )) : <></>
                                }
                                {type === "relations" ?
                                    (<>
                                        {
                                            "add" in differences.relations ?
                                                (<>
                                                    <h4>Added</h4>
                                                    <ul className={"cover-list"}>
                                                        {differences.relations.add.map(relation => (
                                                            <li key={relation.id}>
                                                                <img src={relation.cover} alt={"Cover of an anime that has been added"}/>
                                                                <span>
                                                                    <span>{relation.type}</span>
                                                                    {relation.name}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </>) : <></>
                                        }
                                        {
                                            "remove" in differences.relations ?
                                                (<>
                                                    <h4>Removed</h4>
                                                    <ul className={"cover-list"}>
                                                        {differences.relations.remove.map(relation => (
                                                            <li key={relation.id}>
                                                                <img src={relation.cover} alt={"Cover of an anime that has been removed"}/>
                                                                <span>
                                                                    <span>{relation.type}</span>
                                                                    {relation.name}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </>) : <></>
                                        }
                                    </>) : <></>
                                }
                                {type === "allRelations" ?
                                    (<>
                                        {
                                            "add" in differences.allRelations ?
                                                (<>
                                                    <h4>Added</h4>
                                                    <ul className={"cover-list"}>
                                                        {differences.allRelations.add.map(relation => (
                                                            <li key={relation.id}>
                                                                <img src={relation.cover} alt={"Cover of an anime that has been added"}/>
                                                                <span>
                                                                    {relation.name}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </>) : <></>
                                        }
                                        {
                                            "remove" in differences.allRelations ?
                                                (<>
                                                    <h4>Removed</h4>
                                                    <ul className={"cover-list"}>
                                                        {differences.allRelations.remove.map(relation => (
                                                            <li key={relation.id}>
                                                                <img src={relation.cover} alt={"Cover of an anime that has been removed"}/>
                                                                <span>
                                                                    {relation.name}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </>) : <></>
                                        }
                                    </>) : <></>
                                }
                                {["languages", "subLanguages", "dubLanguages"].includes(type) ?
                                    (<>
                                        {
                                            "add" in differences[type] ?
                                                (<>
                                                    <h4>Added</h4>
                                                    <div>
                                                        {
                                                            differences[type].add.map((item, index) => <img className={"flag"} key={index} src={item.image} alt={`Language ${item.name} Image`} />)
                                                        }
                                                    </div>
                                                </>) : <></>
                                        }
                                        {
                                            "remove" in differences[type] ?
                                                (<>
                                                    <h4>Removed</h4>
                                                    <div>
                                                        {
                                                            differences[type].remove.map((item, index) => <img className={"flag"} key={index} src={item.image} alt={`Language ${item.name} Image`} />)
                                                        }
                                                    </div>
                                                </>) : <></>
                                        }
                                    </>) : <></>
                                }
                            </>
                        ))}
                    </>
                ))}
            </div>
        </>
    );
}

export default UpdatesPopup