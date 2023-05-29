import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnInit,
} from '@angular/core';
import jsQR from 'jsqr';
import { StateManagmentService } from './services/state-managment.service';
import { ApiService } from './services/api.service';
import { environment } from '../environments/environment.prod';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  @ViewChild('video', { static: false }) video?: ElementRef;
  @ViewChild('canvas', { static: false }) canvas?: ElementRef;
  @ViewChild('cameraDiv',{static:false}) cameraDiv?:ElementRef;
  videoElement?: any;
  canvasElement?: any;
  canvasContext?: any;
  stream: any;

  /** Scanning Status */
  timeoutScanning:any=null;
  /** Error Status */
  error:any ="";
  /** Succesfful Status */
  msg:any ="";
  /** countDown */
  countdown:number = 0;
  /** Timer */
  time: string = new Date().toLocaleTimeString();

  constructor(public stateS: StateManagmentService, private api:ApiService) {
    //it controls time
    setInterval(() => {
      const date = new Date();
      this.time = date.toLocaleTimeString();
      --this.countdown<0?this.countdown=0:'';
    }, 1000);
  }

  ngOnInit(): void {
    //state machine
    this.stateS.state.subscribe((state) => {
      switch (state.status) {
        case 0:
          if(this.timeoutScanning) clearTimeout(this.timeoutScanning);
          this.countdown=0;
          console.log('Idle Status');
          break;
        case 1:
          console.log('Reading QR');
          if(this.timeoutScanning) clearTimeout(this.timeoutScanning);
          this.countdown=30;
          this.timeoutScanning = setTimeout(()=>{
            this.cancelOnErrorTimeout('No se ha podido escanear ningún código QR. Inténtelo de nuevo.');
          },30000)
          break;
        case 2:
          console.log('Error -->'+state.error);
          if(this.timeoutScanning) clearTimeout(this.timeoutScanning);
          this.countdown=15;
          this.timeoutScanning = setTimeout(()=>{
            this.home();
          },15000)
          this.error = state.error;
          break;
        case 3:
          console.log('QR readed --> sending it to server');
          if(this.timeoutScanning) clearTimeout(this.timeoutScanning);
          this.countdown=30;
          this.timeoutScanning = setTimeout(()=>{
            this.cancelOnErrorTimeout('No se ha podido comprobar el estado de su operación. Inténtelo de nuevo y en caso de error, solicite un nuevo QR.');
          },30000)
          break;
        case 4:
          console.log('Successful Operation');
          if(this.timeoutScanning) clearTimeout(this.timeoutScanning);
          this.countdown=15;
          this.timeoutScanning = setTimeout(()=>{
           this.home();
          },15000)
          this.msg = state.msg;
          break;
        case 5:
          console.log('QR consumed');
          if(this.timeoutScanning) clearTimeout(this.timeoutScanning);
          this.countdown=15;
          this.timeoutScanning = setTimeout(()=>{
            this.home();
          },15000)
          this.msg = state.msg;
          break;
        case 6:
          console.log('Wrong location');
          if(this.timeoutScanning) clearTimeout(this.timeoutScanning);
          this.countdown=15;
          this.timeoutScanning = setTimeout(()=>{
            this.home();
          },15000)
          this.msg = state.msg;
          break;
        default:
          if(this.timeoutScanning) clearTimeout(this.timeoutScanning);
          this.countdown=0;
          this.home();
          console.log('Unknown Status');
      }
    });
  }
  /**
   * Shows camera and start scanning QR code
   */
  startScanning():void {
    this.stateS.changeState({ status: 1 });
    this.videoElement = this.video?.nativeElement;
    this.canvasElement = this.canvas?.nativeElement;
    this.canvasContext = this.canvasElement?.getContext('2d', {
      willReadFrequently: true,
    });
    const constraints = {
      video: {
        facingMode: 'environment',
      },
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(async (stream) => {
        this.stream = stream;
        this.videoElement.srcObject = stream;
        this.videoElement.setAttribute('playsinline', true);
        this.videoElement.play();
        (this.cameraDiv?.nativeElement as HTMLDivElement)?.classList.add("scanner");
        await requestAnimationFrame(await this.tick.bind(this));
      })
      .catch((err) => {
        console.log(err);
      });
  }
  /**
   * Executed every frame in scanning mode. Analyzes de camera to read QR code
   */
  async tick():Promise<void> {
    if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
      this.canvasElement.hidden = false;
      this.canvasElement.height = this.videoElement.videoHeight;
      this.canvasElement.width = this.videoElement.videoWidth;
      
      this.canvasContext.drawImage(
        this.videoElement,
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
      const imageData = this.canvasContext.getImageData(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );
      this.scanningGrid(this.canvasContext,this.canvasElement.width,this.canvasElement.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code && code.data != '') {
        const beep = document.getElementById('beep') as HTMLAudioElement;
        beep.play();
        this.sendQR(code);
      } else {
        await requestAnimationFrame(this.tick.bind(this));
      }
    } else {
      await requestAnimationFrame(this.tick.bind(this));
    }
  }
  /**
   * Stops stream from camera
   */
  stopScanning(): void {
    this.stream?.getTracks().forEach((track: any) => {
      (track as any).stop();
    });
    (this.cameraDiv?.nativeElement as HTMLDivElement)?.classList.remove("scanner");
  }
  public cancelScanning(): void {
    this.stopScanning();
    this.stateS.changeState({ status: 0 });
  }
  cancelOnErrorTimeout(str:any){
    this.stopScanning();
    this.stateS.changeState({status:2,error:str});
    this.timeoutScanning=null;
  }
  public home(){
    this.stateS.changeState({status:0})
  }

  /**
   * Sends QR code to server
   * @param code 
   */
  async sendQR(code:any):Promise<void>{
    this.stateS.changeState({status:3})
    this.stopScanning();
    let res:any = await this.api.sendQR(code);
    if(res && res['error']){
      this.stateS.changeState({status:2,error:'La validación de su código no ha sido satisfactoria. Quizá deba renovar su código QR.'})
    }else{
      let msg;
      if(res['status']=='Data error, transaction data does not match.'){
        return this.stateS.changeState({status:6,msg:'El cajero no corresponde con el seleccionado en su App. Revise su ubicación.'})
      }else if(res['amount']>0){
        msg=`Ha realizado un ingreso de ${res['amount']} €`
      }else if(res['amount']<0){
        msg=`Ha realizado una extracción de ${res['amount']*-1} €`
      }else {
        return this.stateS.changeState({status:5,msg:'Ya ha consumido el código QR. Deberá generar una nueva transacción desde la App móvil.'})
      }
      this.stateS.changeState({status:4,msg:msg})
    }
  }
  /**
   * Paints a grid over canvas. Only for ornamental purposes
   * @param context canvas' context
   * @param w canvas width
   * @param h canvas height
   */
  scanningGrid(context: any,w:any,h:any):void {
    context.lineWidth = 1;
    context.strokeStyle = '#FFF';
    for (let x = 1; x < w; x += 100) {
      context.moveTo(x, 0);
      context.lineTo(x, h);
    }
    for (let y = 1; y < h; y += 100) {
      context.moveTo(0, y);
      context.lineTo(w, y);
    }
    context.stroke();
  }
}
