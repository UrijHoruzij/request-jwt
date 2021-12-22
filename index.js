import fetch from 'isomorphic-fetch';
import io from 'socket.io-client';

function Core(url, socketUrl = '') {
	let accessToken = '';
	let refreshToken = '';
	let SSOToken = '';
	let authUser = '';
	let user = '';
	let accessTokenTime = '';
	let second = 0;
	let urlRefresh = url;
	let errorNet = false;
	let socket;
	if (socketUrl !== '') {
		socket = io(socketUrl);
	}
	setInterval(() => {
		timer();
	}, 1000);
	this.SetSSOToken = (newValue) => {
		SSOToken = newValue;
	};
	this.SetAccessToken = (newValue) => {
		accessToken = newValue;
	};
	this.SetRefreshToken = (newValue) => {
		refreshToken = newValue;
	};
	this.SetUser = (newValue) => {
		user = newValue;
	};
	this.CheckSSOToken = () => {
		SSOToken !== '' ? true : false;
	};
	this.CheckAccessToken = () => {
		accessToken !== '' ? true : false;
	};
	this.CheckRefreshToken = () => {
		refreshToken !== '' ? true : false;
	};
	this.GetAuthUser = () => {
		return authUser;
	};
	const getHeaders = (headers = {}) => {
		let obj = {};
		for (let key in headers) {
			obj[key] = headers[key];
		}
		obj['accessToken'] = accessToken;
		obj['user'] = user;
		obj['Content-Type'] = 'application/json';
		return obj;
	};
	this.signIn = async (url, data) => {
		try {
			let response = await fetch(url, {
				method: 'POST',
				mode: 'cors',
				credentials: 'include',
				body: JSON.stringify(data),
				headers: getHeaders(),
			});
			if (response.ok) {
				return GetResult(response);
			} else {
				throw new Error('Error sign in.');
			}
		} catch (error) {
			console.error(error);
		}
	};
	this.refresh = async () => {
		try {
			let response = await fetch(urlRefresh, {
				method: 'POST',
				mode: 'cors',
				credentials: 'include',
				body: JSON.stringify({
					refreshToken: refreshToken,
				}),
				headers: getHeaders(),
			});
			if (response.ok) {
				return GetResult(response);
			} else {
				accessToken = '';
				accessTokenTime = '';
				SSOToken = '';
				user = '';
				errorNet = true;
				throw new Error('Error refresh.');
			}
		} catch (error) {
			console.error(error);
		}
	};
	const timerReconnection = () => {
		let timerId = setInterval(async () => {
			await this.refresh();
			if (errorNet === false) {
				clearInterval(timerId);
			}
		}, 10000);
	};
	const timer = () => {
		if (accessTokenTime !== '') {
			second++;
			if (String(second) + 's' === accessTokenTime) {
				second = 0;
				this.refresh();
			}
		}
	};
	const GetResult = async (response) => {
		let result = await response.json();
		accessToken = result.accessToken;
		accessTokenTime = result.accessTokenTime;
		SSOToken = result.SSOToken;
		refreshToken = result.refreshToken;
		authUser = result._id;
		errorNet = false;
		let obj = {};
		for (let key in result) {
			if (key !== 'accessToken' || key !== 'accessTokenTime' || key !== 'refreshToken') {
				obj[key] = result[key];
			}
		}
		return obj;
	};
	this.socket = async (operation, data = {}) => {
		try {
			let obj = {};
			for (let key in data) {
				obj[key] = headers[key];
			}
			obj['accessToken'] = accessToken;
			socket.emit(operation, obj);
			socket.on(operation, async (response) => {
				if (response.status === 'SUCCESSFUL') {
					return response;
				} else {
					if (response.status === 'FAILURE' && errorNet === false) {
						await this.refresh();
						this.socket(url, operation, data);
					} else {
						timerReconnection();
					}
					throw new Error('Error socket.');
				}
			});
		} catch (error) {
			console.error(error);
		}
	};
	this.http = async (url, method = 'GET', data = {}, headers = {}) => {
		try {
			let options = {
				mode: 'cors',
				credentials: 'include',
				headers: getHeaders(headers),
			};
			if (method !== 'GET') {
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
				return result;
			} else {
				if (response.status === 'FAILURE' && errorNet === false) {
					await this.refresh();
					this.http(url, method, data);
				} else {
					timerReconnection();
				}
				throw new Error('Error http.');
			}
		} catch (error) {
			console.error(error);
		}
	};
}
export default Core;
