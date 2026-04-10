import {useContext, useEffect, useState} from "react";
import {Link, useNavigate, useParams} from "react-router";
import './Popup.css';
import {websocketPromiseToast, websocketToastIfError, websocketUpdateCallback} from "./ToastUtils.js";
import {WebsocketContext} from "./WebsocketContext.jsx";


function CardPopup() {
    const { id } = useParams();
    const navigate = useNavigate();
    const socket = useContext(WebsocketContext);
    const [item, setItem] = useState({});

    async function getDbInfo() {
        // return (await axiosToastIfError(axios.post("http://localhost:8080/api/get", { filter: { _id: id } }))).data[0];
        return await websocketToastIfError(socket.emitWithAck("get-db", id));
    }

    function updateInfo() {
        // axiosFinishToast(axios.post("http://localhost:8080/api/update", {filter: {_id: id}}), "info");
        // websocketFinishToast(socket.emitWithAck("update", { _id: id }), "info");
        websocketPromiseToast(
            new Promise((resolve) => {
                socket.emit("update", { _id: id });
                socket.once("updateFinished", resolve);
            }),
            `Updating ${item.name}`,
            "info",
            (toastId) => socket.on("updateProgress", websocketUpdateCallback(toastId)),
            (toastId) => socket.off("updateProgress", websocketUpdateCallback(toastId, true))
        )
    }

    useEffect(() => {
        getDbInfo().then(setItem);
    }, [id]);

    useEffect(() => {
        function refreshInfo(refreshData) {
            for (let data of refreshData) {
                if (data._id === item._id)
                    setItem({...Object.assign(item, data)});
            }
        }
        socket.on("refresh", refreshInfo);
        return () => {
            socket.off("refresh", refreshInfo);
        }
    }, [item]);

    return (
      <>
          <Link to="/">
              <div id="overlay"></div>
          </Link>
          <div id="popup">
              <div className={"top-right-items"}>
                  <Link to={`/edit/${id}`}><button>Edit</button></Link>
                  <button onClick={updateInfo}>Update</button>
              </div>
              <h2 id="name">{item.name}</h2>
              <div className="horizontal">
                  <div className="table">
                      <div className="row">
                          <label>Aliases</label>
                          <ul>
                              {
                                  (item.aliases ?? []).map((item, index) => <li key={index}>{item}</li>)
                              }
                          </ul>
                      </div>
                      <div className="row">
                          <label>Series</label>
                          <label>{item.series}</label>
                      </div>
                      <div className="row">
                          <label>Part</label>
                          <label>{item.seriesPart === item.season ? item.seriesPart : `Part: ${item.seriesPart} Season: ${item.season}`}</label>
                      </div>
                      <div className="row">
                          <label>Time</label>
                          <label>{item.timePerUnit} | {item.totalTime}</label>
                      </div>
                      <div className="row">
                          <label>Progress</label>
                          <label>{item.timestamp} of {item.volume}{item.volumeEstimated ? "?" : ""} {item.units}</label>
                      </div>
                      <div className="row">
                          <label>Status</label>
                          <label>{item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : ""}</label>
                      </div>
                      <div className="row">
                          <label>Publish Status</label>
                          <label>{item.publishStatus ? item.publishStatus.charAt(0).toUpperCase() + item.publishStatus.slice(1) : ""}</label>
                      </div>
                      <div className="row">
                          <label>Owning</label>
                          <label>{item.ownStatus ?
                              item.filmId >= 0 ?
                              <Link to={`http://192.168.2.1/filme/filme.php?operation=view&pk0=${item.filmId}`} target={"_blank"}>{`${item.filmId} (${item.ownStatus.charAt(0).toUpperCase() + item.ownStatus.slice(1)})`}</Link>
                                  : <>{item.ownStatus.charAt(0).toUpperCase() + item.ownStatus.slice(1)}</> :
                              ""
                          }</label>
                      </div>
                      <div className="row">
                          <label>Published</label>
                          <label>{item.started} - {item.finished}</label>
                      </div>
                      <div className="row">
                          <label>Genres</label>
                          <label>{(item.genres ?? []).join(", ")}</label>
                      </div>
                      <div className="row">
                          <label>Studio</label>
                          <ul>
                              {
                                  (item.studio ?? []).map((item, index) => <li key={index}>{item}</li>)
                              }
                          </ul>
                      </div>
                      <div className="row">
                          <label>Staff</label>
                          <ul>
                              {
                                  (item.staff ?? []).map((item, index) => <li key={index}>{item}</li>)
                              }
                          </ul>
                      </div>
                      {item.broadcast !== "-" ?
                          <div className="row">
                              <label>Broadcast</label>
                              <label>{item.broadcast}</label>
                          </div>
                          :<></>
                      }
                      {item.languages && item.languages.length ?
                          <div className="row">
                              <label>Languages</label>
                              <div>
                                  {
                                      item.languages.map((item, index) => <img className={"flag"} key={index} src={item.image} alt={`Language ${item.name} Image`} />)
                                  }
                              </div>
                          </div>
                          :<></>
                      }
                      {item.dubLanguages && item.dubLanguages.length ?
                          <div className="row">
                              <label>Dub Languages</label>
                              <div>
                                  {
                                      item.dubLanguages.map((item, index) => <img className={"flag"} key={index} src={item.image} alt={`Language ${item.name} Image`} />)
                                  }
                              </div>
                          </div>
                          :<></>
                      }
                      {item.subLanguages && item.subLanguages.length ?
                          <div className="row">
                              <label>Sub Languages</label>
                              <div>
                                  {
                                      item.subLanguages.map((item, index) => <img className={"flag"} key={index} src={item.image} alt={`Language ${item.name} Image`} />)
                                  }
                              </div>
                          </div>
                          :<></>
                      }
                  </div>
                  <Link to={"https://www.anisearch.com/anime/" + item._id} target={"_blank"}><img id="cover" src={item.cover} alt="Card Cover Image" /></Link>
              </div>
              {item.relations && item.relations.length ?
                  <>
                      <h3>Relations</h3>
                      <ul className={"cover-list"}>
                          {item.relations.map(relation => (
                              <li key={relation.id} onClick={() => {
                                   if (relation.inDB)
                                       navigate(`/show/${relation.id}`);
                                   else
                                       navigate(`/add/${relation.id}`);
                              }}>
                                  <img src={relation.cover} alt={"Cover of an anime related to one that has been added"}/>
                                  <span>
                                  <span>{relation.type}</span>
                                      {relation.name}
                              </span>
                              </li>
                          ))}
                      </ul>
                  </> : <></>
              }
              {item.allRelations && item.allRelations.length && item.allRelations.some((allRelation) => !item.relations.some((relation) => allRelation.id === relation.id)) ?
                  <>
                      <h3>All Relations</h3>
                      <ul className={"cover-list"}>
                          {item.allRelations.map(relation => (
                              <li key={relation.id} onClick={() => {
                                  if (relation.inDB)
                                      navigate(`/show/${relation.id}`);
                                  else
                                      navigate(`/add/${relation.id}`);
                              }}>
                                  <img src={relation.cover} alt={"Cover of an anime related to one that has been added"}/>
                                  <span>
                              {relation.name}
                          </span>
                              </li>
                          ))}
                      </ul>
                  </> : <></>
              }
          </div>
      </>
    );
}

export default CardPopup