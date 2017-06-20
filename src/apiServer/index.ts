import * as express from 'express'; 
import * as http from 'http';
import * as serveStatic from "serve-static";
import * as path from "path";
import * as socketIo from "socket.io";

import { KakaoSocket } from "./socket";

 var Q          = require("q");
 var mysql      = require('mysql');
 var connection = mysql.createConnection({
  host     : '14.63.213.246',
  user     : 'smarttest',
  password : 'test1234',
  port     : 10003,
  database : 'SMART_MESSAGE_VERTWO'
});

 var pool = mysql.createPool({
    connectionLimit: 10, //important
    host     : '14.63.213.246',
    user     : 'smarttest',
    password : 'test1234',
    port     : 10003,
    database : 'SMART_MESSAGE_VERTWO',
    debug: false
});

 var bodyParser = require('body-parser');


 var customer_Info_Name = { 
                        "message": 
                            {"text": "문의 사항에 대해서 알림톡으로 회신 예정이며 이를 위해 고객님의 성함을 입력해 주세요.\n 취소하시려면 '#'을 입력해 주세요."},
                        "keyboard": 
                            {"type":"text"}
                        };
 var customer_Info_Phone = { 
                        "message": 
                            {"text": "문의 사항에 대해서 알림톡으로 회신 예정이며 이를 위해 고객님의 핸드폰번호를 '-'없이 숫자만 입력해 주세요.\n 취소하시려면 '#'을 입력해 주세요."},
                        "keyboard": 
                            {"type":"text"}
                        };

 var customer_Info_Auth = { 
                        "message": 
                            {"text": "고객님의 핸드폰번호으로 인증번호를 전달해 드렸습니다. 확인 후 입력을 부탁 드립니다. 숫자만 입력해 주세요.\n 취소하시려면 '#'을 입력해 주세요."},
                        "keyboard": 
                            {"type":"text"}
                        };

 var depth_First_Third_Last_Response = {
                        "message": 
                            {"text": "문의가 정상적으로 접수되었습니다. 평일 9시~18시, 빠른 시간 안에 답변 드리겠습니다.\n 취소하시려면 '#'을 입력해 주세요."},
                        "keyboard": 
                            {"type":"text"}
                        };

 var customer_Info_Auth_Response = {
                        "message": 
                            {"text": "요금조회 결과 문제가 없습니다. 다른 문의 사항이 있으시면 '#'을 입력하여주십시요."},
                        "keyboard": 
                            {"type":"text"}
                        };                        

declare var process, __dirname;

export class ApiServer {
    //20170620
    //public kakao_app: any;
    private kakao_app: express.Application;
    private kakao_server: any;
    private kakao_io: any;
    private mongo: any;
    private kakao_root: string;
    private kakao_port: number;

    // Bootstrap the application.
    //20170620
    //public static bootstrap(): ApiServer {
    //    console.log("ApiServer bootstrap");
    //    return new ApiServer();
    //}

    constructor() {
        console.log("Server constructor");
        // Create expressjs application
        this.kakao_app = express();

        // Configure application
        this.kakaoConfig();

        // Setup routes
        this.kakaoRoutes();

        // Create server
        this.kakao_server = http.createServer(this.kakao_app);

        // Create database connections
        //this.databases();

        // Handle websockets
        this.kakaoSockets();

        // Start listening
    	//20170620
        //this.kakaoListen();
    }

    // Configuration
    private kakaoConfig(): void {
        console.log("Server config");
        // By default the port should be 5000
        this.kakao_port = process.env.PORT || 2580;

        // root path is under ../../target
        this.kakao_root = path.join(path.resolve(__dirname, '../../target'));

    }

    // Configure routes
    private kakaoRoutes(): void {
        console.log("Server kakaoRoutes");
        
        this.kakao_app.use((request: express.Request, result: express.Response, next: express.NextFunction) => {
            result.header("Access-Control-Allow-Origin", "*");
            result.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });

        this.kakao_app.use(bodyParser.json());
        this.kakao_app.use(bodyParser.urlencoded({extended:true}));
        
        this.kakao_app.get( '/', function(req, res) {
            res.send("{type: 'text'}");
        });

        this.kakao_app.all('*', function(req, res, next) {
            res.setHeader("Content-Type", "application/json");
            next();
        });

        // 키보드
        this.kakao_app.get('/keyboard', (request: express.Request, result: express.Response, next: express.NextFunction) => {
            var re;
            var content = "keyboard";
            // try {
            //     re = depth_First;
            // } catch (exception) {
            //     console.log('키보드 에러');
            // } finally {
            //     //re.data = result;
            //     result.status(200).send(re);
            // }
            try {
                this.getKeyboardResponse(content, function(err, data) {
                    if(err) {
                        console.log('응답 에러');
                    } else {
                        re = data;
                        result.status(200).send(re);
                    }
                });
            } catch (exception) {
                console.log('응답 에러');
            }

        });

        // 응답
        this.kakao_app.post('/message', (request: express.Request, result: express.Response, next: express.NextFunction) => {
            console.log("kakao message" + JSON.stringify(request.body));
            var user_key = request.body.user_key;
            var type = request.body.type;
            var content = request.body.content;
            var re;
            this.kakao_io.emit('chat message', content);
            try {
                this.getMessageResponse(content, user_key, type, function(err, data) {
                    if(err) {
                        console.log('응답 에러');
                    } else {
                        re = data;
                        console.log("response:" + JSON.stringify(re));
                        result.status(200).send(re);
                    }
                });
            } catch (exception) {
                console.log('응답 에러');
            }
        });

        // 친구 추가
        this.kakao_app.post('/friend', (request: express.Request, result: express.Response, next: express.NextFunction) => {
            console.log('friend add');
            console.log('user key : '+request.body.user_key);
            var user_key = request.body.user_key;
            var re;
            try {
                re = {text:'param : ' + user_key};
            } catch (exception) {
                console.log('키보드 에러');
            } finally {
                result.status(200).send(re);
            }
        });

        // 친구 삭제
        this.kakao_app.delete('/friend/:user_key', (request: express.Request, result: express.Response, next: express.NextFunction) => {
            console.log('friend del');
            console.log('user key : ' + request.params.user_key);
            var user_key = request.body.user_key;
            var re;
            try {
                re = {text:'param : ' + user_key};
            } catch (exception) {
                console.log('키보드 에러');
            } finally {
                result.status(200).send(re);
            }
        });

        // 채팅방 삭제
        this.kakao_app.delete('/chat_room/:user_key', (request: express.Request, result: express.Response, next: express.NextFunction) => {
            console.log('chat_room del');
            console.log('user key : '+request.params.user_key);
            var user_key = request.body.user_key;
            var re;
            try {
                re = {text:'param : ' + user_key};
            } catch (exception) {
                console.log('키보드 에러');
            } finally {
                result.status(200).send(re);
            }
        });
    }

    private getKeyboardResponse(content: string, callback: any): void {
        var re;
        Q.all([this.dbSelectScenario(content)]).then(function(results){
            // console.log("results:" + JSON.stringify(results));
            re = results[0][0][0];
            // console.log("re:" + JSON.stringify(re));
            // console.log("re.RES_MESSAGE:" + JSON.stringify(re.RES_MESSAGE));
            // console.log("re.RES_MESSAGE.keyboard):" + JSON.stringify(JSON.parse(re.RES_MESSAGE).keyboard));
        }).then(function() {
            callback(null, JSON.parse(re.RES_MESSAGE).keyboard);
        })
        .done();
    }

    private getMessageResponse(content: string, user_key: string, type: string, callback: any): void {
        var re;
        var beforeRe;
        var rtnStr;
        var updateType;
        var beforeContent;
        var beforeStep;
        var nowStep;
        var keyboardContent;
        var nOTP;

        if (content == "#") content = "keyboard";

        Q.all([this.dbSelectScenario(content),this.dbCheckHistory(content, user_key),this.dbLoadCustomer(user_key),this.dbBeforeSelectScenario(content, user_key),this.dbSelectScenario("keyboard")]).then(function(results){
            //console.log("results:" + JSON.stringify(results));
            if( results[0][0][0] != null ) {
                re = results[0][0][0].RES_MESSAGE;
                nowStep = results[0][0][0].STEP;
                if( nowStep != '1' ) {
                    var msg = JSON.parse(re);
                    if( msg.keyboard.buttons.length > 0 ) {
                        msg.keyboard.buttons.push("처음으로");
                        console.log(msg.keyboard.buttons);
                        re = JSON.stringify(msg);
                    }
                }
            }
            else re = null;
            
            if( results[1][0][0] != null ) {
                beforeContent = results[1][0][0].MESSAGE;
                beforeStep = results[1][0][0].STEP;
            }
            else beforeContent = null;

            if( results[2][0][0] != null )
                rtnStr = results[2][0][0];
            else rtnStr = null;

            if( results[3][0][0] != null )
                beforeRe = results[3][0][0].RES_MESSAGE;
            else beforeRe = null;

            if( results[4][0][0] != null )
                keyboardContent = JSON.parse(results[4][0][0].RES_MESSAGE).keyboard;
            else keyboardContent = null;
        }).then(function() {
            // this.dbSaveHistory(content, user_key, type);
            if( re != null ) {
                var post = {UNIQUE_ID:user_key, MESSAGE:content};
                console.log("db values:" + JSON.stringify(post));

                pool.query('INSERT INTO TB_AUTOCHAT_HISTORY SET ?', post, function(err, rows, fields) {
                if (err)
                    console.log('Error while performing Query.', err);
                });
            }
        }).then(function() {
console.log("re:" + re);
console.log("nowStemp:" + nowStep);   
            if( re == null && content != "keyboard" && content != "처음으로" && content != "취소하기") {
                if( rtnStr == null) {
                    updateType = "INS_PHONE";
                    re = customer_Info_Name;
                } else if (rtnStr.PHONE == null && rtnStr.NAME == null) {
                    updateType = "UPD_PHONE";
                    re = customer_Info_Name;
                } else if (rtnStr.PHONE != null && rtnStr.NAME == null) {
                    updateType = "NAME";
                    re = customer_Info_Auth;
                } else if (rtnStr.PHONE != null && rtnStr.NAME != null) {
                    updateType = "AUTH";
                    re = customer_Info_Auth_Response; //  beforeContent에 해당하는 기간계 정보를 호출한다. (20170615)
                } 
             
console.log("beforeContent:" + beforeContent);
console.log("beforeStep:" + beforeStep);
console.log("rtnStr:" + JSON.stringify(rtnStr));
console.log("content:" + content);
console.log("updateType:" + updateType);

                // if( updateType == "Init" ) {
                //     var cust_post = {UNIQUE_ID:user_key};
                //     pool.query('INSERT INTO TB_AUTOCHAT_CUSTOMER SET ?', cust_post, function(err, rows, fields) {
                //         if(err) console.log("Query Error:", err);
                //     });
                // } else 
                if( updateType == "INS_PHONE" ) {
                    var cust_post = {UNIQUE_ID:user_key, PHONE:content};
                    pool.query('INSERT INTO TB_AUTOCHAT_CUSTOMER SET ?', cust_post, function(err, rows, fields) {
                        if(err) console.log("Query Error:", err);
                    });
                } else if( updateType == "UPD_PHONE" ) {
                    pool.query('UPDATE TB_AUTOCHAT_CUSTOMER SET PHONE = ?, YN_AUTH = ? WHERE UNIQUE_ID = ?', [content, "N", user_key], function(err, rows, fields) {
                        if(err) console.log("Query Error:", err);
                    });
                } else if( updateType == "NAME" ) {
                        const spawn = require('child_process').spawn;
                        const ls = spawn('/home/proidea/workspaceHTML5/tmsg-v3/shorturl');

                        ls.stdout.on('data', (data) => {
                            console.log(`stdout: ${data}`);
                            nOTP = data;
                            if( nOTP != null ) {
                                // 1. send SMS customer phone
                                // 2. DB Update
                                pool.query('UPDATE TB_AUTOCHAT_CUSTOMER SET NAME = ?, YN_AUTH = ?, ETC1 = ? WHERE UNIQUE_ID = ?', [content, "N", nOTP, user_key], function(err, rows, fields) {
                                    if(err) console.log("Query Error:", err);
                                });
                            }
                        });

                        ls.stderr.on('data', (data) => {
                          console.log(`stderr: ${data}`);
                          // retry ? 
                        });

                        ls.on('close', (code) => {
                          console.log(`child process exited with code ${code}`);
                        });
                } else if( updateType == "AUTH") {
                    pool.query('UPDATE TB_AUTOCHAT_CUSTOMER SET YN_AUTH = ? WHERE UNIQUE_ID = ?', ["Y", user_key], function(err, rows, fields) {
                        if(err) console.log("Query Error:", err);
                    });
                }
            }
        }).then(function() {

            if (re == null) {
// console.log("beforeContent:" + beforeContent);
// console.log("beforeStep:" + beforeStep);
// console.log("rtnStr:" + rtnStr);
/* 답변 처리에 대한 로직이 추가 되어야 한다. */
                // if (beforeContent == "주문 조회") {
                //     re = depth_First_Second_First_Response;
                // } else if (beforeContent == "배송지 변경") {
                //     re = depth_First_Second_Second_Response;
                // } else if (beforeContent == "주문 최소") {
                //     re = depth_First_Second_Third_Response;
                // } else 
                if (beforeContent == "사진 첨부 후 문의하기") {
                    /*
                    등록한 사진을 어디론가 옮기고 이력저장하고 
                    */
                    var post = {UNIQUE_ID:user_key, REQ_MESSAGE:content};
                    console.log("db values:" + JSON.stringify(post));

                    pool.query('INSERT INTO TB_AUTOCHAT_QUESTION SET ?', post, function(err, rows, fields) {
                    if (err)
                    console.log('Error while performing Query.', err);
                    });
                    re = depth_First_Third_Last_Response;
                } else if (beforeContent == "문의사항만 입력") {
                    /*
                    등록한 사진을 어디론가 옮기고 이력저장하고 
                    */
                    var post = {UNIQUE_ID:user_key, REQ_MESSAGE:content};
                    console.log("db values:" + JSON.stringify(post));

                    pool.query('INSERT INTO TB_AUTOCHAT_QUESTION SET ?', post, function(err, rows, fields) {
                    if (err)
                    console.log('Error while performing Query.', err);
                    });
                    re = depth_First_Third_Last_Response;
                } else if (beforeContent == "문의하기") {
                    /*
                    등록한 사진을 어디론가 옮기고 이력저장하고 
                    */
                    var post = {UNIQUE_ID:user_key, REQ_MESSAGE:content};
                    console.log("db values:" + JSON.stringify(post));

                    pool.query('INSERT INTO TB_AUTOCHAT_QUESTION SET ?', post, function(err, rows, fields) {
                    if (err)
                    console.log('Error while performing Query.', err);
                    });
                    re = depth_First_Third_Last_Response;
                } else if ( beforeContent != "keyboard" && beforeStep == '3' ) {
                    re = {
                        "message": 
                            {"text": "1:1 자동응답 기능 테스트 용입니다. 좀더 다양한 기능은 추후 제공 하도록 하겠습니다.\n 처음으로 돌아가시려면 '#'을 입력하세요!"},
                        "keyboard": 
                            {"type":"text"}
                        };;
                } 
                var depth_First;

                if(content == '취소하기' || content == '#' || content == '처음으로') {
                    re = { "message": {"text": "아래 내용 중 선택해 주세요!"},"keyboard": keyboardContent};
                } 
                    
                if(re == null ) {
                    re = beforeRe;
                }
            }
        })
        .then(function() {
            //console.log("out re:" + JSON.stringify(re)); 
            callback(null, re);
        })
        .done();
    }

    // Configure databases
    // private databases(): void {
    //     console.log("Server database");
    //     // MongoDB URL
    //     let mongoDBUrl = process.env.MONGODB_URI || 'mongodb://localhost/chat';

    //     // Get MongoDB handle
    //     this.mongo = mongoose.connect(mongoDBUrl);
    // }
    
    // Configure sockets
    private kakaoSockets(): void {
        console.log("Server kakaoSockets");
        // Get socket.io handle
        this.kakao_io = socketIo(this.kakao_server);

        let kakaoSocket = new KakaoSocket(this.kakao_io);
   }

    // Start HTTP server listening
    //20170620
    public kakaoListen(): void {
        console.log("Server kakaoListen");
        //listen on provided ports
        this.kakao_server.listen(this.kakao_port);

        //add error handler
        this.kakao_server.on("error", error => {
            console.log("ERROR", error);
        });

        //start listening on port
        this.kakao_server.on("listening", () => {
            console.log('==> Listening on port %s. Open up http://localhost:%s/ in your browser.', this.kakao_port, this.kakao_port);            
        });
    }

    private dbSaveHistory(content: string, user_key: string, type: string): void {
        var post = {UNIQUE_ID:user_key, MESSAGE:content};
        console.log("db values:" + JSON.stringify(post));

        pool.query('INSERT INTO TB_AUTOCHAT_HISTORY SET ?', post, function(err, rows, fields) {
            if (err)
                console.log('Error while performing Query.', err);
        });
    }

//     private dbSaveCustomer(updateType: string, content: string, user_key: string): void {
//         var defered = Q.defer();
// console.log("1");
//         var post = {UNIQUE_ID:user_key, NAME:content};
// console.log("2");
//         console.log("db values:" + JSON.stringify(post));
// console.log("3");
//         if( updateType == "Name" ) {
// console.log("4");
//             connection.query('INSERT INTO TB_AUTOCHAT_CUSTOMER SET ?', post, defered.makeNodeResolver());
//         } else if( updateType == "Phone" ) {
//             connection.query('UPDATE TB_AUTOCHAT_CUSTOMER SET PHONE = ? WHERE UNIQUE_ID = ?', [content, user_key], defered.makeNodeResolver());
//         } else if( updateType == "Auth") {
//             connection.query('UPDATE TB_AUTOCHAT_CUSTOMER SET AUTH = ? WHERE UNIQUE_ID = ?', ["Y", user_key], defered.makeNodeResolver());
//         }
// console.log("5");
//         return defered.promise;
//     }

    private dbSaveCustomer(updateType: string, content: string, user_key: string): void {

        var post = {UNIQUE_ID:user_key, NAME:content};
        console.log("db values:" + JSON.stringify(post));
        if( updateType == "Name" ) {
            pool.query('INSERT INTO TB_AUTOCHAT_CUSTOMER SET ?', post, function(err, rows, fields) {
                if(err) console.log("Query Error:", err);
            });
        } else if( updateType == "Phone" ) {
            pool.query('UPDATE TB_AUTOCHAT_CUSTOMER SET PHONE = ? WHERE UNIQUE_ID = ?', [content, user_key], function(err, rows, fields) {
                if(err) console.log("Query Error:", err);
            });
        } else if( updateType == "Auth") {
            pool.query('UPDATE TB_AUTOCHAT_CUSTOMER SET AUTH = ? WHERE UNIQUE_ID = ?', ["Y", user_key], function(err, rows, fields) {
                if(err) console.log("Query Error:", err);
            });
        }
    }

    // private dbSaveCustomerName(content: string, user_key: string): void {
    //     var defered = Q.defer();
    //     var post = {UNIQUE_ID:user_key, NAME:content};
    //     console.log("db values:" + JSON.stringify(post));
    //     connection.query('INSERT INTO TB_AUTOCHAT_CUSTOMER SET ?', post, defered.makeNodeResolver());
    //     return defered.promise;
    // }

    // private dbSaveCustomerPhone(content: string, user_key: string): void {

    //     connection.query('UPDATE TB_AUTOCHAT_CUSTOMER SET PHONE = ? WHERE UNIQUE_ID = ?', [content, user_key], function(err, rows, fields) {
    //         if (err)
    //             console.log('Error while performing Query.', err);
    //     });
    // }

    // private dbSaveCustomerAuth(content: string, user_key: string): void {

    //     connection.query('UPDATE TB_AUTOCHAT_CUSTOMER SET AUTH = ? WHERE UNIQUE_ID = ?', ["Y", user_key], function(err, rows, fields) {
    //         if (err)
    //             console.log('Error while performing Query.', err);
    //     });
    // }

    public dbLoadCustomer(user_key: string): void {
        var defered = Q.defer();

        pool.query('SELECT * FROM TB_AUTOCHAT_CUSTOMER WHERE UNIQUE_ID = ?', user_key, defered.makeNodeResolver());
        return defered.promise;
    }

    private dbSelectScenario(content: string): void {
        var defered = Q.defer();
        // console.log("content:" + content);
        pool.query('SELECT * FROM TB_AUTOCHAT_SCENARIO WHERE REQ_MESSAGE = ?', content, defered.makeNodeResolver());
        return defered.promise;
    }

    private dbBeforeSelectScenario(content: string, user_key: string): void {
        var defered = Q.defer();
        // console.log("content:" + content);
        pool.query('SELECT a.* FROM TB_AUTOCHAT_SCENARIO as a, (select * from TB_AUTOCHAT_HISTORY where UNIQUE_ID = ? order by wrtdate desc LIMIT 1)  as b WHERE a.REQ_MESSAGE = b.MESSAGE', user_key, defered.makeNodeResolver());
        return defered.promise;
    }

    public dbCheckHistory(content: string, user_key: string): void {
        var defered = Q.defer();
        pool.query('select a.*, b.step, b.trun from TB_AUTOCHAT_HISTORY as a, TB_AUTOCHAT_SCENARIO as b where a.UNIQUE_ID = ? and b.REQ_MESSAGE = a.MESSAGE order by a.wrtdate desc LIMIT 1', [user_key], defered.makeNodeResolver());
        return defered.promise;
    }

    public dbConnection(): void {
        connection.connect();
    }

    public dbRelease(): void {
        connection.end();
    }
}

// Bootstrap the server
//20170620
//let api = ApiServer.bootstrap();
//export = api.kakao_app;
