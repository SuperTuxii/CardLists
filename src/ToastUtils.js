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
    })
    .catch(reason => toast.update(toastId, {
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