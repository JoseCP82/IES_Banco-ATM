import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StateManagmentService {
  private stateController:BehaviorSubject<any> = new BehaviorSubject({status:0});
  public stateController$ = this.stateController.asObservable();
  private _state:any ={}
  constructor() { }

  /**
   * Updates the app's state. Emits a new value of state in subscriptions
   * @param data object to change in app's state
   */
  public changeState(data:any){
    for(let key in data){
      if (this._state.hasOwnProperty(key)) {
        this._state = { ...this._state, [key]: data[key] };
      }else{
        this._state[key]=data[key];
      }
    }
    this.stateController.next(this._state);
  }
  /**
   * state to create a subscription or directly injected in HTML with async pipe
   */
  public get state(){
    return this.stateController$;
  }

}
