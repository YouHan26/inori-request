import inori from 'inori';
import {Observable} from 'rxjs';
import {combineEpics} from "redux-observable";
import createRequest from './createRequest';

const TYPE = '$[plugin-request]';
const NIL = 'NIL';

const NILAction = {
  type: NIL
};

const requestEpic = (action$) => {
  return action$.ofType(TYPE)
    .mergeMap((action) => {
      const _config = createRequest.getConfig();
      const {requestBefore, requestAfter} = _config;
      
      const {payload} = action;
      return Observable.concat(
        Observable.of((requestBefore && requestBefore(action)) || NILAction),
        createRequest(payload, action),
        Observable.of((requestAfter && requestAfter(action)) || NILAction),
      )
        .filter((action) => {
          return action.type !== NIL;
        });
    });
};

const epic = combineEpics(
  requestEpic,
);

inori.addEpic(epic);

const request = {
  createRequest: (config, others) => {
    const {type, url, method, urlType, params, data, headers, urlParams} = config;
    return {
      type: TYPE,
      oldType: type,
      payload: {
        url,
        urlType,
        method,
        params,
        data,
        headers,
        urlParams,
      },
      ...others
    };
  },
  config: createRequest.config,
};

export {TYPE};

export default request;
