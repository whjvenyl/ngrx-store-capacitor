/* tslint:disable:no-shadowed-variable */
import { ActionReducer } from '@ngrx/store';
import { defer, Observable } from 'rxjs';
import { Effect } from '@ngrx/effects';
import { Injectable } from '@angular/core';
import { Plugins } from '@capacitor/core';
import { of } from 'rxjs/internal/observable/of';
import { fromPromise } from 'rxjs/internal-compatibility';
import { catchError, map } from 'rxjs/operators';

const { Storage } = Plugins;
const STORAGE_KEY = 'NSIS_APP_STATE';

// get/setNested inspired by
// https://github.com/mickhansen/dottie.js
function getNested(obj: any, path: string): any {
  if (obj !== null && path) {
    // Recurse into the object.
    const parts = path.split('.').reverse();
    while (obj != null && parts.length) {
      obj = obj[parts.pop()];
    }
  }
  return obj;
}

function setNested(obj: any, path: string, value: any): any {
  if (obj != null && path) {
    const pieces = path.split('.');
    const length = pieces.length;
    let current = obj;
    let piece;
    let i;

    for (i = 0; i < length; i++) {
      piece = pieces[i];
      if (i === length - 1) {
        current[piece] = value;
      } else if (!current[piece]) {
        current[piece] = {};
      }
      current = current[piece];
    }
  }

  return obj;
}

function fetchState(): Promise<void | {}> {
  return Storage.get({ key: STORAGE_KEY })
    .then(s => JSON.parse(s.value) || {})
    .catch(err => {});
}

function saveState(state: any, keys: string[]): Promise<void> {
  // Pull out the portion of the state to save.
  if (keys) {
    state = keys.reduce((acc, k) => {
      const val = getNested(state, k);
      if (val) {
        setNested(acc, k, val);
      }
      return acc;
    }, {});
  }

  return Storage.set({ key: STORAGE_KEY, value: JSON.stringify(state) });
}

export const StorageSyncActions = {
  HYDRATED: 'NSIS_APP_HYDRATED',
};

@Injectable()
export class StorageSyncEffects {
  @Effect() hydrate$: Observable<any> = defer(() =>
    fromPromise(fetchState()).pipe(
      map(state => ({
        type: StorageSyncActions.HYDRATED,
        payload: state,
      })),
      catchError(e => {
        console.warn(`error fetching data from store for hydration: ${e}`);

        return of({
          type: StorageSyncActions.HYDRATED,
          payload: {},
        });
      })
    )
  );
}

export interface StorageSyncOptions {
  keys?: string[];
  ignoreActions?: string[];
  hydratedStateKey?: string;
  onSyncError?: (err: any) => void;
}

const defaultOptions: StorageSyncOptions = {
  keys: [],
  ignoreActions: [],
  hydratedStateKey: null,
  onSyncError: () => {},
};

export function storageSync(options?: StorageSyncOptions) {
  // @ts-ignore
  const { keys, ignoreActions, hydratedStateKey, onSyncError } = { ...defaultOptions, ...(options || {}) };

  ignoreActions.push(StorageSyncActions.HYDRATED);
  ignoreActions.push('@ngrx/store/init');
  ignoreActions.push('@ngrx/effects/init');
  ignoreActions.push('@ngrx/store/update-reducers');

  const hydratedState: any = {};

  return function storageSyncReducer(reducer: ActionReducer<any>) {
    return (state: any, action: any) => {
      const { type, payload } = action;

      if (type === StorageSyncActions.HYDRATED) {
        state = { ...state, ...payload };
        if (hydratedStateKey) {
          hydratedState[hydratedStateKey] = true;
        }
      }

      const nextState = { ...reducer(state, action), ...hydratedState };

      if (ignoreActions.indexOf(type) === -1) {
        saveState(nextState, keys).catch(err => onSyncError(err));
      }

      return nextState;
    };
  };
}
