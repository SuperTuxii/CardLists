import {websocketFinishToast, websocketToastIfError} from "./ToastUtils.js";
import {Link} from "react-router";
import {useContext, useState} from "react";
import {WebsocketContext} from "./WebsocketContext.jsx";


function ImportPopup() {
    const socket = useContext(WebsocketContext);
    const [fileInfos, setFileInfos] = useState([]);

    async function getAPI(url){
        // return (await axiosToastIfError(axios.get("http://localhost:8080/api/get", { params: { url: url }}))).data;
        return await websocketToastIfError(socket.emitWithAck("get-url", url));
    }

    function addAPI(data, url) {
        // axiosFinishToast(axios.put("http://localhost:8080/api/add", { data: data, url: url }), "success");
        websocketFinishToast(socket.emitWithAck("add", { data: data, url: url }), "success");
    }

    return (
        <>
            <Link to={"/"}>
                <div id="overlay"></div>
            </Link>
            <div id="popup">
                <h2>Import Anime</h2>
                <div className={"vertical"}>
                    <input type={"file"} multiple onChange={(e) => {
                        console.log(e);
                        setFileInfos([]);
                        for (let file of e.target.files) {
                            const reader = new FileReader();
                            reader.onerror = () => setFileInfos([...fileInfos, `${file.name} reading failed`]);
                            reader.onload = async () => {
                                let result = reader.result;
                                if (file.type === "text/markdown") {
                                    const data = { name: file.name.slice(0, file.name.lastIndexOf(".")) };
                                    result = result.slice(result.indexOf("---") + 4, result.indexOf("---", result.indexOf("---") + 3));
                                    const regex = /(\w+): (.*)/g;
                                    const dataKeys = [
                                        "name",
                                        "series",
                                        "seriesPart",
                                        "season",
                                        "status",
                                        "timestamp",
                                        "ownStatus",
                                        "filmId",
                                        "anisearchUrl"
                                    ]
                                    if (!result.match(regex)) {
                                        setFileInfos([...fileInfos, `${data.name} can't find properties`]);
                                        console.warn(`${data.name} can't find properties`);
                                        return;
                                    }
                                    for (let match of result.match(regex)) {
                                        const key = match.replace(regex, "$1");
                                        if (!dataKeys.includes(key))
                                            continue;
                                        let value = match.replace(regex, "$2");
                                        if (value.startsWith('"'))
                                            value = JSON.parse(value.toString());
                                        if (key === "season")
                                            value = Number(value).toString();
                                        data[key] = value;
                                    }
                                    if (dataKeys.some((key) => !(key in data))) {
                                        setFileInfos([...fileInfos, `${data.name} doesn't include all required keys`]);
                                        console.warn(`${data.name} doesn't include all required keys`);
                                        return;
                                    }
                                    const dbData = await getAPI(data.anisearchUrl);
                                    if (dbData.fromDB) {
                                        setFileInfos([...fileInfos, `${data.name} is already in DB`]);
                                        console.warn(`${data.name} is already in DB`);
                                        return;
                                    }
                                    if ("series" in dbData && dbData.series !== data.series) {
                                        setFileInfos([...fileInfos, `${data.name} doesn't match proposed series name (${dbData.series})`]);
                                        console.warn(`${data.name} doesn't match proposed series name (${dbData.series})`);
                                        return;
                                    }
                                    //TODO: do adding of the anime
                                }
                            };
                            reader.readAsText(file);
                        }
                    }} />
                    <div>{fileInfos.map((fileInfo, index) => <p key={index}>{fileInfo}</p>)}</div>
                    <button>Import Anime</button>
                </div>
            </div>
        </>
    )
}

export default ImportPopup