import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class LocationTypeActionsService {
  readonly #http = inject(HttpClient);

  // createNewLocationType(payload: LocationTypePayload): Observable<LocationTypeResponse> {
  //   return this.#http.post<LocationTypeResponse>(API_CONSTANTS.CREATE_LOCATION_TYPE, payload);
  // }

  // updateLocationType(id: number, payload: LocationTypePayload): Observable<unknown> {
  //   const uri = API_CONSTANTS.UPDATE_LOCATION_TYPE.replace('{id}', id.toString());

  //   return this.#http.patch(uri, payload);
  // }

 
}
