
export interface TB_AUTOCHAT_SCENARIO {
    SEQ: number;
    STEP: number;
    TRUN: number;
    REQ_MESSAGE: string;
    RES_MESSAGE: string;
    WRTDATA: string;
    ETC1: string;
    ETC2: string;
    ETC3: string;
}

export class KakaoSocket {
    nsp: any;
    name: string;
    data: any;
    socket: any;
    users: any = {};

    public inputDatas: TB_AUTOCHAT_SCENARIO[];
    public errorSuccess = '{"keyboard":{"type":"text"}, "message":{"text":"고객님의 죄송합니다!. 시스템 점검중으로 잠시후 다시 시도하여 주십시요.\n 처음으로 가시려면 "#"을 입력해 주세요."}}';


    constructor(/*private io: any, */private tbScenario: TB_AUTOCHAT_SCENARIO[]) {
        console.log("KakaoSocket constructor");
        // this.nsp = this.io.of("/keyboard");
        // this.nsp.on("connection", (socket: any) => {
        //     console.log("Client keyboard connected");
        //     this.socket = socket;
        //     this.listen();
        // });
        this.inputDatas = tbScenario;
    }

    // Add signal
    private listen(): void {
        console.log("KakaoSocket listen");
        this.socket.on("disconnect", () => this.disconnect());
        this.socket.on("chat message", (content: string) => this.chat(content))
        // this.socket.on("keyboard", () => this.keyboard());
    }

    // Handel keyboard
    private keyboard(): void {
        console.log("KakaoSocket listen");
        let result: any = {type:'text1'};

        this.socket.emit("keyboard", result);
    }

    //chat ....
    private chat(content: string): void {
        console.log("KakaoSocket chat:" + content);
        this.socket.emit("chat message", "text:" + content);
    }

    // Handle disconnect
    private disconnect(): void {
        console.log("RoomSocket disconnect");
        console.log("Client disconnected");
    }

    // Add signal
    public findXml(tagName: string): string {
        console.log("findXml call:" + tagName);
        if( this.inputDatas != null ) {
            var rtnObj: TB_AUTOCHAT_SCENARIO[] = this.inputDatas.filter( inputData => inputData.REQ_MESSAGE === tagName);
            return rtnObj[0].RES_MESSAGE;
        }
        else { return this.errorSuccess;}
    }
}
