
export class KakaoSocket {
    nsp: any;
    name: string;
    data: any;
    socket: any;
    users: any = {};

    constructor(private io: any) {
        console.log("KakaoSocket constructor");
        // this.nsp = this.io.of("/");
        // this.nsp.on("connection", (socket: any) => {
        //     console.log("Client connected");
        //     this.socket = socket;
        //     this.listen();
        // });
        this.nsp = this.io.of("/keyboard");
        this.nsp.on("connection", (socket: any) => {
            console.log("Client keyboard connected");
            this.socket = socket;
            this.listen();
        });
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
}
