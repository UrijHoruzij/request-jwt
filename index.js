import fetch from "isomorphic-fetch";
function Core(url) {
    let accessToken = '';
    let refreshToken = '';
    let SSOToken = '';
    let authUser = '';
    let user = '';
    let accessTokenTime = '';
    let second = 0;
    let urlRefresh = url;
    let errorNet = false;
    setInterval(() => {
        timer();
    }, 1000);
    this.SetSSOToken = (newValue) => {
        SSOToken = newValue;
    }
    this.SetAccessToken = (newValue) => {
        accessToken = newValue;
    }
    this.SetRefreshToken = (newValue) => {
        refreshToken = newValue;
    }
    this.SetUser = (newValue) => {
        user = newValue;
    }
    this.CheckSSOToken = () => {
        (SSOToken !== '') ? true : false; 
    }
    this.CheckAccessToken = () => {
        (accessToken !== '') ? true : false;
    }
    this.CheckRefreshToken = () => {
        (refreshToken !== '') ? true : false;
    }
    this.GetAuthUser = () => {
        return authUser;
    }
    const getHeaders = (headers={}) => {
        let obj = {};
        for (let key in headers) {
            obj[key] = headers[key];
        }
        obj['accessToken'] = accessToken;
        obj['user'] = user;
        obj['Content-Type'] = 'application/json';
        return obj;
    }
    this.signIn = async (url, data) => {
        let response = await fetch(url,{
            method: "POST",
            mode: 'cors',
            credentials: 'include',
            body: JSON.stringify(data),
            headers: getHeaders()
        });
        if (response.ok) {
            let result = await response.json();
            accessToken = result.accessToken;
            accessTokenTime = result.accessTokenTime;
            SSOToken = result.SSOToken;
            refreshToken = result.refreshToken;
            authUser = result.id;
            let obj = {};
            for (let key in result) {
                if(key !== "accessToken" || key !== "accessTokenTime" || key !== "refreshToken"){
                    obj[key] = result[key];
                }
            }
            return obj;
        } else {
            throw new Error('Error sign in.');
        }
    }
    this.refresh = async () => {
        let response = await fetch(urlRefresh,{
            method: "POST",
            mode: 'cors',
            credentials: 'include',
            body: JSON.stringify({
                refreshToken: refreshToken
            }),
            headers: getHeaders()
        });
        if (response.ok) {
            let result = await response.json();
            accessToken = result.accessToken;
            accessTokenTime = result.accessTokenTime;
            SSOToken = result.SSOToken;
            refreshToken = result.refreshToken;
            authUser = result.id;
            let obj = {};
            for (let key in result) {
                if(key !== "accessToken" || key !== "accessTokenTime" || key !== "refreshToken"){
                    obj[key] = result[key];
                }
            }
            return obj;
        } else {
            accessToken = '';
            accessTokenTime = '';
            SSOToken = '';
            user = '';
            errorNet = true;
            throw new Error('Error refresh.');
        }
    }
    const timer = () => {
        if(accessTokenTime !== ''){
            second++;
            if(String(second)+"s" === accessTokenTime){
                second = 0; 
                this.refresh();
            }
        }
    }
    this.http = async (url, method="GET", data={}, headers={}) => {
        let options = {
            mode: 'cors',
            credentials: 'include',
            headers: getHeaders(headers)
        }
        if(method !== "GET"){
            options['method'] = method;
            options['body'] = JSON.stringify(data);
        }
        let response = await fetch(url, options);
        if (response.ok) {
            let result;
            switch (options.headers.responseType) {
                case 'blob':
                    result = await response.blob();
                    break;
                case 'text':
                    result = await response.text();
                    break;
                case 'json':
                    result = await response.json();
                    break;
                case 'formdata':
                    result = await response.formData();
                    break;
                case 'arraybuffer':
                    result = await response.arrayBuffer();
                    break;
                default:
                    result = await response.json();
                    break;
            }
            return result
        } else {
            if(response.status === 401 && errorNet === false){
                await this.refresh();
                this.http(url, method, data);
            }
            throw new Error('Error http.');
        }
    }
}
export default Core;