import {toast} from "react-toastify";

export function axiosPromiseToast(promise, loadingContent, responseType) {
    const toastId = toast.loading(loadingContent);
    return promise.then(response => {
        toast.update(toastId, {
            render: typeof response.data === "string" ? response.data : JSON.stringify(response.data),
            type: (response.status >= 200 && response.status < 300) ? responseType : "error",
            isLoading: false,
            autoClose: (response.status >= 200 && response.status < 300) ? 2500 : 5000,
            closeOnClick: true,
            pauseOnHover: !(response.status >= 200 && response.status < 300)
        });
        return response;
    }).catch(reason => toast.update(toastId, {
        render: reason,
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeOnClick: true
    }));
}

export function axiosFinishToast(promise, responseType) {
    return promise.then(response => {
        toast(
            typeof response.data === "string" ? response.data : JSON.stringify(response.data),
            {
                type: (response.status >= 200 && response.status < 300) ? responseType : "error",
                autoClose: (response.status >= 200 && response.status < 300) ? 2500 : 5000,
                closeOnClick: true,
                pauseOnHover: !(response.status >= 200 && response.status < 300)
            }
        );
        return response;
    });
}

export function axiosToastIfError(promise) {
    return promise.then(response => {
        if (!(response.status >= 200 && response.status < 300)) {
            toast(
                typeof response.data === "string" ? response.data : JSON.stringify(response.data),
                {
                    type: "error",
                    autoClose: 5000,
                    closeOnClick: true,
                    pauseOnHover: true
                }
            );
            throw response.data;
        }
        return response;
    });
}

const websocketUpdateCallbacks = {};
export function websocketUpdateCallback(toastId, removeAfter = false) {
    if (!(toastId in websocketUpdateCallbacks))
        websocketUpdateCallbacks[toastId] = (data) => {
            toast.update(toastId, {
                render: typeof data === "string" ? data : JSON.stringify(data)
            });
            if (data === "Update is already in process") {
                toast(
                    data,
                    {
                        type: "error",
                        autoClose: 5000,
                        closeOnClick: true,
                        pauseOnHover: true
                    }
                )
            }
        };
    try {
        return websocketUpdateCallbacks[toastId];
    } finally {
        if (removeAfter)
            delete websocketUpdateCallbacks[toastId];
    }
}

export function websocketPromiseToast(promise, loadingContent, responseType, toastCreateCallback = undefined, toastFinalCallback = undefined) {
    const toastId = toast.loading(loadingContent);
    if (toastCreateCallback)
        toastCreateCallback(toastId);
    return promise.then(response => {
        if (typeof response === "object" && "status" in response && "message" in response)
            toast.update(toastId, {
                render: typeof response.message === "string" ? response.message : JSON.stringify(response.message),
                type: (response.status >= 200 && response.status < 300) ? responseType : "error",
                isLoading: false,
                autoClose: (response.status >= 200 && response.status < 300) ? 2500 : 5000,
                closeOnClick: true,
                pauseOnHover: !(response.status >= 200 && response.status < 300)
            });
        else
            toast.update(toastId, {
                render: typeof response === "string" ? response : JSON.stringify(response),
                type: responseType,
                isLoading: false,
                autoClose: 2500,
                closeOnClick: true,
                pauseOnHover: false
            });
        return response;
    }).catch(reason => toast.update(toastId, {
        render: reason,
        type: "error",
        isLoading: false,
        autoClose: 5000,
        closeOnClick: true
    })).finally(() => {
        if (toastFinalCallback)
            toastFinalCallback(toastId);
    });
}

export function websocketFinishToast(promise, responseType) {
    return promise.then(response => {
        if (typeof response === "object" && "status" in response && "message" in response)
            toast(
                typeof response.message === "string" ? response.message : JSON.stringify(response.message),
                {
                    type: (response.status >= 200 && response.status < 300) ? responseType : "error",
                    autoClose: (response.status >= 200 && response.status < 300) ? 2500 : 5000,
                    closeOnClick: true,
                    pauseOnHover: !(response.status >= 200 && response.status < 300)
                }
            );
        else
            toast(
                typeof response === "string" ? response : JSON.stringify(response),
                {
                    type: responseType,
                    autoClose: 2500,
                    closeOnClick: true,
                    pauseOnHover: false
                }
            );
        return response;
    });
}

export function websocketToastIfError(promise, overrideOptions = {}) {
    return promise.then(response => {
        if (typeof response === "object" && "status" in response && "message" in response && !(response.status >= 200 && response.status < 300)) {
            toast(
                typeof response.message === "string" ? response.message : JSON.stringify(response.message),
                Object.assign({
                    type: "error",
                    autoClose: 5000,
                    closeOnClick: true,
                    pauseOnHover: true
                }, overrideOptions)
            );
            throw response.message;
        }
        return response;
    });
}
