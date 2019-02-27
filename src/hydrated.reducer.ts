/* tslint:disable:no-empty-interface */
import { Action } from '@ngrx/store';

export interface HydratedState {}

export function reducer(state: boolean = false, action: Action): HydratedState {
  return state;
}
