import {useEffect, useState} from "react";
import {Link} from "react-router";
import axios from "axios";
import './CardList.css';

function CardList() {
    const [search, setSearch] = useState("");
    const searchRegex = new RegExp(search, "i");
    const searchGlobalRegex = new RegExp(search, "ig");
    const [fullTableData, setFullTableData] = useState([]);
    const tableData = fullTableData
        .filter(data => searchRegex.test(data.name))
        .sort((a, b) => b.name.match(searchGlobalRegex).reduce((acc, val) => acc + val.length, 0) - a.name.match(searchGlobalRegex).reduce((acc, val) => acc + val.length, 0));
    const [cards, setCards] = useState(["aliases", "series", "time", "progress"]);

    async function getDbAPI(params){
        const response = await axios.post("http://localhost:8080/api/get", params);
        console.log(response.data);
        return response.data;
    }

    useEffect(() => {
        getDbAPI({
            filter: {},
            sort: { name: 1 },
            // projection: {
            //     _id: true,
            //     name: true,
            //     aliases: true,
            //     series: true,
            //     status: true,
            //     timestamp: true,
            //     volume: true,
            //     volumeEstimated: true,
            //     timePerUnit: true,
            //     totalTime: true,
            //     units: true,
            //     publishStatus: true,
            //     cover: true
            // }
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
                        <div className={"dropdown-content right"} tabIndex={-1}>
                            <div className={"subdropdown"}>
                                <label>Search</label>
                                <div className={"dropdown-content right"} tabIndex={-1}>
                                    <label><input type={"checkbox"} defaultChecked={true} />Name</label>
                                    <label><input type={"checkbox"} />Aliases</label>
                                    <label><input type={"checkbox"} />Series</label>
                                    <label><input type={"checkbox"} />Genres</label>
                                    <label><input type={"checkbox"} />Studio</label>
                                    <label><input type={"checkbox"} />Staff</label>
                                    <label><input type={"checkbox"} />ID</label>
                                    <label><input type={"checkbox"} />Film ID</label>
                                </div>
                            </div>
                            <div className={"subdropdown"}>
                                <label>Status</label>
                                <div className={"dropdown-content right"} tabIndex={-1}>
                                    <label><input type={"checkbox"} />Ongoing</label>
                                    <label><input type={"checkbox"} />Queue</label>
                                    <label><input type={"checkbox"} />Done</label>
                                    <label><input type={"checkbox"} />Abandoned</label>
                                </div>
                            </div>
                            <div className={"subdropdown"}>
                                <label>Publish Status</label>
                                <div className={"dropdown-content right"} tabIndex={-1}>
                                    <label><input type={"checkbox"} />Upcoming</label>
                                    <label><input type={"checkbox"} />Ongoing</label>
                                    <label><input type={"checkbox"} />Completed</label>
                                    <label><input type={"checkbox"} />Canceled</label>
                                </div>
                            </div>
                            <div className={"subdropdown"}>
                                <label>Own Status</label>
                                <div className={"dropdown-content right"} tabIndex={-1}>
                                    <label><input type={"checkbox"} />Unknown</label>
                                    <label><input type={"checkbox"} />Planned</label>
                                    <label><input type={"checkbox"} />Ongoing</label>
                                    <label><input type={"checkbox"} />Owned</label>
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
                                        {item.timestamp} of {item.volume} {item.volumeEstimated ? "?" : ""} {item.units} ({Math.round(Number(item.timestamp)/Number(item.volume)*100)}%)
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