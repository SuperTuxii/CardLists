import {useContext, useEffect, useState} from "react";
import {Link} from "react-router";
import './CardList.css';
import {websocketToastIfError} from "./ToastUtils.js";
import {WebsocketContext} from "./WebsocketContext.jsx";

const propertySpecifierRegex = /(?:^| )(id|name|alias|series|seriesPart|season|status|timestamp|ownStatus|filmId|timePerUnit|totalTime|started|finished|genre|studio|staff|volumeEstimated|volume|units|publishStatus|broadcast|language|dubLanguage|subLanguage)=("[^"]*"|[^" ]*)(?:$|(?: (?!(id|name|alias|series|seriesPart|season|status|timestamp|ownStatus|filmId|timePerUnit|totalTime|started|finished|genre|studio|staff|volumeEstimated|volume|units|publishStatus|broadcast|language|dubLanguage|subLanguage)=("[^"]*"|[^" ]*)))?)/g;
const propertyMap = {
    id: "_id",
    alias: "aliases",
    genre: "genres",
    language: "languages",
    dubLanguage: "dubLanguages",
    subLanguage: "subLanguages"
};

function CardList() {
    const socket = useContext(WebsocketContext);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState({
        search: ["name"],
        status: [],
        publishStatus: [],
        ownStatus: []
    });
    const [fullTableData, setFullTableData] = useState([]);
    const tableData = doFilterAndSearch(fullTableData, search, filters);
    const [cards, setCards] = useState(["aliases", "series", "time", "progress"]);

    function doFilterAndSearch(data, search, filters) {
        try {
            const propertySpecifiers = [];
            (search.match(propertySpecifierRegex) ?? []).map(s => s.trim()).forEach(specifier => {
                const property = specifier.replace(propertySpecifierRegex, "$1");
                propertySpecifiers.push([property in propertyMap ? propertyMap[property] : property, new RegExp(specifier.replace(propertySpecifierRegex, "$2").replace(/^"|"$/g, ""), "i")]);
            });
            search = search.replace(propertySpecifierRegex, "");

            const searchRegex = new RegExp(search, "i");
            data = data
                .filter(data => {
                    if (filters.status.length && !filters.status.includes(data.status))
                        return false;
                    if (filters.publishStatus.length && !filters.publishStatus.includes(data.publishStatus))
                        return false;
                    if (filters.ownStatus.length && !filters.ownStatus.includes(data.ownStatus))
                        return false;
                    for (let i = 0; i < propertySpecifiers.length; i++) {
                        const [property, specifier] = propertySpecifiers.at(i);
                        if (Array.isArray(data[property])) {
                            if (data[property].length === 0)
                                return false;
                            if (typeof data[property][0] === "string" && !data[property].some(s => specifier.test(s)))
                                return false;
                            else if (typeof data[property][0] === "object" && !data[property].some(o => specifier.test(o.name)))
                                return false;
                        } else if (!specifier.test(data[property])) {
                            return false;
                        }
                    }
                    return true;
                })
                .filter(data => filters.search.some(filter => searchRegex.test(data[filter])));
            return data;
        } catch (e) {
            console.error(e);
            return data;
        }
    }

    async function getDbAPI(params){
        // return (await axiosToastIfError(axios.post("http://localhost:8080/api/get", params))).data;
        return await websocketToastIfError(socket.emitWithAck("get", params));
    }

    useEffect(() => {
        function refreshInfo(refreshData) {
            let tableData = [...fullTableData];
            for (let data of refreshData) {
                let index = tableData.findIndex((data2) => data._id === data2._id);
                if (index === -1)
                    tableData.push(data);
                else
                    tableData[index] = {...Object.assign(tableData[index], data)};
            }
            setFullTableData(tableData);
        }
        socket.on("refresh", refreshInfo);
        return () => {
            socket.off("refresh", refreshInfo);
        }
    }, [fullTableData]);

    useEffect(() => {
        getDbAPI({
            filter: {},
            sort: { name: 1 }
        }).then(setFullTableData);

        function handleClickOutside(event) {
            let element = document.querySelector(".dropdown>.dropdown-content[style*='display: grid']");
            if (element && !element.parentElement.contains(event.target)) {
                element.style.display = "none";
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        }
    }, []);

    function handleClickDropdown(event) {
        let element = event.target.parentElement.querySelector(".dropdown-content");
        element.style.display = element.style.display === "grid" ? "none" : "grid";
    }

    return (
        <>
            <div className={"cards"}>
                <div className={"horizontal"}>
                    <div className={"dropdown"} id={"cards-dropdown"}>
                        <button onClick={handleClickDropdown}>Cards</button>
                        <div className={"dropdown-content"} tabIndex={-1} onChange={() => {
                            let cards = [];
                            document.querySelectorAll("#cards-dropdown .dropdown-content input").forEach(input => {
                                if (input.checked)
                                    cards.push(input.name);
                            });
                            setCards(cards);
                        }}>
                            <label><input type={"checkbox"} name={"aliases"} defaultChecked={true} />Aliases</label>
                            <label><input type={"checkbox"} name={"series"} defaultChecked={true} />Series</label>
                            <label><input type={"checkbox"} name={"part"} />Part</label>
                            <label><input type={"checkbox"} name={"genres"} />Genres</label>
                            <label><input type={"checkbox"} name={"status"} />Status</label>
                            <label><input type={"checkbox"} name={"publishStatus"} />Publish Status</label>
                            <label><input type={"checkbox"} name={"owning"} />Owning</label>
                            <label><input type={"checkbox"} name={"published"} />Published</label>
                            <label><input type={"checkbox"} name={"studio"} />Studio</label>
                            <label><input type={"checkbox"} name={"staff"} />Staff</label>
                            <label><input type={"checkbox"} name={"languages"} />Languages</label>
                            <label><input type={"checkbox"} name={"subLanguages"} />Sub Languages</label>
                            <label><input type={"checkbox"} name={"dubLanguages"} />Dub Languages</label>
                            <label><input type={"checkbox"} name={"broadcast"} />Broadcast</label>
                            <label><input type={"checkbox"} name={"time"} defaultChecked={true} />Time</label>
                            <label><input type={"checkbox"} name={"progress"} defaultChecked={true} />Progress</label>
                        </div>
                    </div>
                    <input className="fill" placeholder={"Search"} onChange={e => setSearch(e.target.value)}></input>
                    <div className={"dropdown"} id={"filter-dropdown"}>
                        <button onClick={handleClickDropdown}>Filter</button>
                        <div className={"dropdown-content right"} id={"search-filter-dropdown"} tabIndex={-1}>
                            <div className={"subdropdown"}>
                                <label>Search</label>
                                <div className={"dropdown-content right"} tabIndex={-1} onChange={() => {
                                    let searchFilter = [];
                                    document.querySelectorAll("#search-filter-dropdown .dropdown-content input").forEach(input => {
                                        if (input.checked)
                                            searchFilter.push(input.name);
                                    });
                                    setFilters({...filters, search: searchFilter});
                                }}>
                                    <label><input type={"checkbox"} name={"name"} defaultChecked={true} />Name</label>
                                    <label><input type={"checkbox"} name={"aliases"} />Aliases</label>
                                    <label><input type={"checkbox"} name={"series"} />Series</label>
                                    <label><input type={"checkbox"} name={"genres"} />Genres</label>
                                    <label><input type={"checkbox"} name={"studio"} />Studio</label>
                                    <label><input type={"checkbox"} name={"staff"} />Staff</label>
                                    <label><input type={"checkbox"} name={"_id"} />ID</label>
                                    <label><input type={"checkbox"} name={"filmId"} />Film ID</label>
                                </div>
                            </div>
                            <div className={"subdropdown"} id={"status-filter-dropdown"}>
                                <label>Status</label>
                                <div className={"dropdown-content right"} tabIndex={-1} onChange={() => {
                                    let statusFilter = [];
                                    document.querySelectorAll("#status-filter-dropdown .dropdown-content input").forEach(input => {
                                        if (input.checked)
                                            statusFilter.push(input.name);
                                    });
                                    setFilters({...filters, status: statusFilter});
                                }}>
                                    <label><input type={"checkbox"} name={"ongoing"} />Ongoing</label>
                                    <label><input type={"checkbox"} name={"queue"} />Queue</label>
                                    <label><input type={"checkbox"} name={"done"} />Done</label>
                                    <label><input type={"checkbox"} name={"abandoned"} />Abandoned</label>
                                </div>
                            </div>
                            <div className={"subdropdown"} id={"publish-status-filter-dropdown"}>
                                <label>Publish Status</label>
                                <div className={"dropdown-content right"} tabIndex={-1} onChange={() => {
                                    let publishStatusFilter = [];
                                    document.querySelectorAll("#publish-status-filter-dropdown .dropdown-content input").forEach(input => {
                                        if (input.checked)
                                            publishStatusFilter.push(input.name);
                                    });
                                    setFilters({...filters, publishStatus: publishStatusFilter});
                                }}>
                                    <label><input type={"checkbox"} name={"upcoming"} />Upcoming</label>
                                    <label><input type={"checkbox"} name={"ongoing"} />Ongoing</label>
                                    <label><input type={"checkbox"} name={"done"} />Done</label>
                                    <label><input type={"checkbox"} name={"abandoned"} />Abandoned</label>
                                </div>
                            </div>
                            <div className={"subdropdown"} id={"own-status-filter-dropdown"}>
                                <label>Own Status</label>
                                <div className={"dropdown-content right"} tabIndex={-1} onChange={() => {
                                    let ownStatusFilter = [];
                                    document.querySelectorAll("#own-status-filter-dropdown .dropdown-content input").forEach(input => {
                                        if (input.checked)
                                            ownStatusFilter.push(input.name);
                                    });
                                    setFilters({...filters, ownStatus: ownStatusFilter});
                                }}>
                                    <label><input type={"checkbox"} name={"unknown"} />Unknown</label>
                                    <label><input type={"checkbox"} name={"planned"} />Planned</label>
                                    <label><input type={"checkbox"} name={"ongoing"} />Ongoing</label>
                                    <label><input type={"checkbox"} name={"owned"} />Owned</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <table className={"card-list"}>
                    <thead>
                       <tr>
                           <th>Cover</th>
                           <th>Name</th>
                           <th>Aliases</th>
                           <th>Series</th>
                           <th>Time</th>
                           <th>Progress</th>
                       </tr>
                    </thead>
                    <tbody>
                        {tableData.map(item => (
                            <tr key={item._id}>
                                <td>
                                    <img src={item.cover} width={100} alt="Card Cover Image" />
                                </td>
                                <td>
                                    <Link to={"/show/" + item._id}>{item.name}</Link>
                                </td>
                                {cards.includes("aliases") ?
                                    <td>
                                        <span>
                                            <span className='cards-icon'>Aliases</span>
                                            {item.aliases.join(", ")}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("series") ?
                                    <td>
                                        <span>
                                            <span className='cards-icon'>Series</span>
                                            {item.series}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("part") ?
                                    <td>
                                        <span>
                                            <span className='cards-icon'>Part</span>
                                            {item.seriesPart === item.season ? item.seriesPart : `Part: ${item.seriesPart} Season: ${item.season}`}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("genres") ?
                                    <td>
                                        <span>
                                            <span className='cards-icon'>Genres</span>
                                            {item.genres.join(", ")}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("status") ?
                                    <td>
                                        <span>
                                            <span className='cards-icon'>Status</span>
                                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("publishStatus") ?
                                    <td>
                                        <span>
                                            <span className='cards-icon'>Publish Status</span>
                                            {item.publishStatus.charAt(0).toUpperCase() + item.publishStatus.slice(1)}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("owning") ?
                                    <td>
                                        <span>
                                            <span className='cards-icon'>Owning</span>
                                            {item.filmId >= 0 ?
                                                <Link to={`http://192.168.2.1/filme/filme.php?operation=view&pk0=${item.filmId}`}>{`${item.filmId} (${item.ownStatus.charAt(0).toUpperCase() + item.ownStatus.slice(1)})`}</Link>
                                                : <>{item.ownStatus.charAt(0).toUpperCase() + item.ownStatus.slice(1)}</>
                                            }
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("published") ?
                                    <td>
                                        <span>
                                            <span className='cards-icon'>Published</span>
                                            {item.started + " - " + item.finished}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("studio") ?
                                    <td>
                                        <span>
                                            <span className='cards-icon'>Studio</span>
                                            {item.studio.join(", ")}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("staff") ?
                                    <td>
                                        <span>
                                            <span className='cards-icon'>Staff</span>
                                            {item.staff.join(", ")}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("languages") ?
                                    <td>
                                        <span className={"language-images"}>
                                            <span className='cards-icon'>Languages</span>
                                            {item.languages.map((language, index) => <img className={"flag"} key={index} src={language.image} width={100} alt={`Language ${language.name} Image`} />)}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("subLanguages") ?
                                    <td>
                                        <span className={"language-images"}>
                                            <span className='cards-icon'>Sub Languages</span>
                                            {item.subLanguages.map((language, index) => <img className={"flag"} key={index} src={language.image} width={100} alt={`Language ${language.name} Image`} />)}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("dubLanguages") ?
                                    <td>
                                        <span className={"language-images"}>
                                            <span className='cards-icon'>Dub Languages</span>
                                            {item.dubLanguages.map((language, index) => <img className={"flag"} key={index} src={language.image} width={100} alt={`Language ${language.name} Image`} />)}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("broadcast") ?
                                    <td>
                                        <span>
                                            <span className='cards-icon'>Broadcast</span>
                                            {item.broadcast}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("time") ?
                                    <td>
                                        <span>
                                            <span className='cards-icon'>Time</span>
                                            {item.timePerUnit} | {item.totalTime}
                                        </span>
                                    </td> : <></>
                                }
                                {cards.includes("progress") ?
                                    <td>
                                        <progress max={item.volume} value={item.timestamp}></progress>
                                        {item.timestamp} of {item.volume}{item.volumeEstimated ? "?" : ""} {item.units} ({Math.round(Number(item.timestamp)/Number(item.volume)*100)}%)
                                    </td> : <></>
                                }
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}

export default CardList