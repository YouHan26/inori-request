/**
 * Created by youhan on 2017/8/31.
 */
import axios from "axios";
import {Observable} from "rxjs";
import UTILS from 'mi-js-utils';

let _config = {};

/**
 *
 * @param payload
 * @param action
 * @returns {{url: *, data: *, params: *, method: (*|string), headers: {action: *, "Content-Type": string}}}
 */
const configOption = (payload, action) => {
  const {staticUrlMapping} = _config;
  const {url, method, urlType, params, data, headers, urlParams} = payload;
  
  let configData = {};
  if (urlType) {
    configData = staticUrlMapping[urlType];
  }
  
  return {
    url: url || configData.getUrl(urlParams),
    data: data || configData.data,
    params: UTILS.url.cleanParams(params || configData.params),
    method: method || configData.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
      ...(configData.headers || {})
    },
    action
  };
};

const customAxios = axios.create({
  responseType: 'json',
  validateStatus: () => {
    return true;
  }
});

customAxios.interceptors.request.use((config) => {
  const {action} = config;
  delete config.action;
  const oldHeader = config.headers;
  
  const {headerConfig} = _config;
  if (headerConfig) {
    return Promise.resolve(headerConfig(oldHeader, action))
      .then((newHeader) => {
        config.headers = newHeader;
        return Promise.resolve(config);
      });
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

const createRequest = (payload, after, action) => {
  const {responseHandle, errorHandle} = _config;
  const newType = action.oldType || action.type;
  
  return Observable.fromPromise(
    customAxios(
      configOption(payload, action)
    ))
    .map((response) => {
      const {status} = response;
      const responseData = response.data;
      
      if (action.after && typeof action.after === 'function') {
        action.after(responseData, action);
      }
  
      if (status >= 200 && status <= 300) {
        return {
          type: newType + 'success',
          response,
          data: responseData,
          action,
          success: true,
          ...((responseHandle && responseHandle(response, action)) || {})
        };
      }
      return {
        type: newType + 'fail',
        reason: 'server error',
        success: false,
        response,
        action,
        ...((responseHandle && responseHandle(response, action)) || {})
      };
    })
    .catch((error) => {
      return Observable.of({
        type: newType + 'fail',
        reason: 'network error',
        success: false,
        error,
        ...((errorHandle && errorHandle(error, action)) || {})
      });
    })
    .startWith({...action, type: newType + 'request'});
};

createRequest.config = (config) => {
  //TODO validate
  _config = config;
};

createRequest.getConfig = () => {
  return _config;
};


export default createRequest;