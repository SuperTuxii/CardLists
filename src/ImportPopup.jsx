import {websocketFinishToast, websocketToastIfError} from "./ToastUtils.js";
import {Link} from "react-router";
import {useContext, useEffect, useState} from "react";
import {WebsocketContext} from "./WebsocketContext.jsx";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function ImportPopup() {
    const socket = useContext(WebsocketContext);
    const [fileInfos, setFileInfos] = useState([]);
    const [fileData, setFileData] = useState([]);

    async function getAPI(url){
        // return (await axiosToastIfError(axios.get("http://localhost:8080/api/get", { params: { url: url }}))).data;
        for (let i = 0; i < 5; i++) {
            try {
                return await websocketToastIfError(socket.emitWithAck("get-url", url), {autoClose: 15000, pauseOnHover: false, pauseOnFocusLoss: false});
            } catch (e) {
                if (!e.startsWith("Too Many Requests"))
                    throw e;
                await delay(15000);
            }
        }
        throw "Getting data failed after retrying 5 times";
    }

    function addAPI(data, url) {
        // axiosFinishToast(axios.put("http://localhost:8080/api/add", { data: data, url: url }), "success");
        websocketFinishToast(socket.emitWithAck("add", { data: data, url: url }), "success");
    }

    useEffect(() => {
        document.getElementById("importButton").disabled = true;
    }, []);

    return (
        <>
            <Link to={"/"}>
                <div id="overlay"></div>
            </Link>
            <div id="popup">
                <h2>Import Anime</h2>
                <div className={"vertical"}>
                    <input type={"file"} multiple onChange={async (e) => {
                        let newFileInfos = [];
                        let newFileData = [];
                        const filePromises = [...e.target.files].map((file) => {
                            return new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve({ file: file, result: reader.result});
                                reader.onerror = reject;
                                reader.readAsText(file);
                            });
                        });

                        document.getElementById("importButton").disabled = true;
                        document.getElementById("statusInfo").innerText = "Reading Files..."
                        for (const info of await Promise.all(filePromises)) {
                            document.getElementById("statusInfo").innerText = `Parsing & Checking Files... (${newFileData.length}/${e.target.files.length})`
                            if (info.file.type === "text/markdown") {
                                const data = {name: info.file.name.slice(0, info.file.name.lastIndexOf("."))};
                                info.result = info.result.slice(info.result.indexOf("---") + 4, info.result.indexOf("---", info.result.indexOf("---") + 3));
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
                                if (!info.result.match(regex)) {
                                    newFileInfos.push(`"${data.name}" can't find properties`);
                                    console.warn(`${data.name} can't find properties`);
                                    continue;
                                }
                                for (let match of info.result.match(regex)) {
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
                                    newFileInfos.push(`"${data.name}" doesn't include all required keys`);
                                    console.warn(`${data.name} doesn't include all required keys`);
                                    continue;
                                }
                                const url = data.anisearchUrl;
                                delete data.anisearchUrl;
                                const dbData = await getAPI(url);
                                if (dbData.fromDB) {
                                    newFileInfos.push(`"${data.name}" is already in DB`);
                                    console.warn(`${data.name} is already in DB`);
                                    continue;
                                }
                                if ("series" in dbData && dbData.series !== data.series) {
                                    newFileInfos.push(`"${data.name}" doesn't match proposed series name (${dbData.series})`)
                                    console.warn(`${data.name} doesn't match proposed series name (${dbData.series})`);
                                    continue;
                                }
                                newFileData.push({url: url, data: data});
                            }
                        }
                        setFileInfos(newFileInfos);
                        setFileData(newFileData);
                        document.getElementById("importButton").disabled = false;
                        document.getElementById("statusInfo").innerText = "Ready to Import"
                    }} />
                    <p id={"statusInfo"}></p>
                    <div>{fileInfos.map((fileInfo, index) => <p key={index}>{fileInfo}</p>)}</div>
                    <button id={"importButton"} onClick={() => {
                        for (let i = 0; i < fileData.length; i++) {
                            document.getElementById("statusInfo").innerText = `Importing... (${i}/${fileData.length})`
                            addAPI(fileData[i].data, fileData[i].url);
                        }
                        document.getElementById("importButton").disabled = true;
                        document.getElementById("statusInfo").innerText = "Import finished"
                    }}>Import Anime</button>
                </div>
            </div>
        </>
    )
}

export default ImportPopup