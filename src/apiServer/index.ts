import * as express from 'express'; 
import * as http from 'http';
import * as serveStatic from "serve-static";
import * as path from "path";
import * as socketIo from "socket.io";

import { KakaoSocket } from "./socket";

var Q      = require("q");
var mysql  = require('mysql');
var net = require('net');
var fastXmlParser = require('fast-xml-parser');
var validator = require('validator');
var spawn = require('child_process').spawn;

var options = {
    attrPrefix: "@_",
    textNodeName: "#text",
    ignoreNonTextNodeAttr: true,
    ignoreTextNodeAttr: true,
    ignoreNameSpace: true,
    textNodeConversion: true
};

 var pool = mysql.createPool({
    connectionLimit: 2,
    host: '14.63.213.246',
    user: 'smarttest',
    password: 'test1234',
    port: 10003,
    database: 'SMART_MESSAGE_VERTWO',
    debug: false
 });

 var bodyParser = require('body-parser');

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
    private ls: any;
    //public pool: any;
    private mtURL: string;
    private mtIP: string;
    private mtPort: number;
    private hpURL: string;

    private IN0002_URL: string;
    private IN0002_PARAM: string;

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


        this.mtURL = "http://125.132.2.120:30063";
        this.mtIP = "125.132.2.120";
        this.mtPort = 30063;
        this.hpURL = "http://172.16.180.224:30034"; //dev
        // this.hpURL = "http://172.16.28.27:30034"; //live
        this.IN0002_URL = "/interface/tbroad/xml_module/CustInvoiceDtlXml";
        this.IN0002_PARAM = "?KEY_NUM=1234561234567&MONTH_CNT=2&NM_CUST=홍길동&CORP=3200&ID_INSERT=U000000000";
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
        var beforeResMessage;
        var beforeReqMessage;
        var rtnStr;
        var updateType;
        var beforeContent;
        var beforeStep;
        var nowStep;
        var keyboardContent;
        var systemContent;
        var nOTP;
        var contentValidation;

        if (content == "#") content = "keyboard";

        Q.all([this.dbSelectScenario(content),this.dbCheckHistory(content, user_key),this.dbLoadCustomer(user_key),this.dbBeforeSelectScenario(content, user_key),this.dbSelectScenario("keyboard"),this.dbSelectScenarioSystem("system")]).then(function(results){
            //console.log("results:" + JSON.stringify(results));
            if( results[0][0][0] != null ) {
                re = results[0][0][0].RES_MESSAGE;
                nowStep = results[0][0][0].STEP;
                if( nowStep != '1' ) {
                    var msg = JSON.parse(re);
                    if( msg.keyboard.buttons != null && msg.keyboard.buttons.length > 0 ) {
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

            if( results[3][0][0] != null ) {
                beforeResMessage = results[3][0][0].RES_MESSAGE;
                beforeReqMessage = results[3][0][0].REQ_MESSAGE;
            }
            else {
                beforeResMessage = null;
                beforeReqMessage = null;
            }

            if( results[4][0][0] != null )
                keyboardContent = JSON.parse(results[4][0][0].RES_MESSAGE).keyboard;
            else keyboardContent = null;

            if (results[5][0][0] != null) {
                systemContent = results[5][0];
            }
            else
                systemContent = null;
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
  
            if( re == null && content != "keyboard" && content != "처음으로" && content != "취소하기") {

                if (rtnStr != null && rtnStr.PHONE != null && rtnStr.NAME != null && rtnStr.YN_AUTH == "Y" ) {
                    // 메뉴 중에 개인 정보가 필요하건에 대해서는 연동처리 하여 응답한다. 
                    // 그렇다면 시나리오에 연동이 필요한것인지 필요하다면 URL, Parameter 등등 정보를 관리하여 응답할수 있도록
                    // 기능 추가
                    console.log("이어서 합시다!");
                } else {
                    // 근데 위 조건에 충족하지 않는다고 해서 무조건 아래와 같은것을 태우는것은 문제가 있다.
                    // 입력된 "content"가 시나리오에서 못찾을 경우 만 거치도록 추가 수정
                    // 고객의 가장 최근 이력(히스토리) 메뉴가 본인인증이 되어 있어야 사용가능한지를 시나리오 관리 테이블에서 추가로
                    // 관리하자.
                    if( rtnStr == null) {
                        updateType = "INS_PHONE";
                        let kakaoSocket = new KakaoSocket(systemContent);
                        re = kakaoSocket.findXml("NAME");
                        contentValidation = validator.isDecimal(content);
                        if( contentValidation != true ) { // 숫자 비교해서 같은면
                            //re = kakaoSocket.findXml("AUTH_OK");
                            re = kakaoSocket.findXml("NAME_NOK");
                            updateType = "NAME_NOK";
                        }
                    } else if (rtnStr.PHONE == null && rtnStr.NAME == null) {
                        updateType = "UPD_PHONE";
                        let kakaoSocket = new KakaoSocket(systemContent);
                        re = kakaoSocket.findXml("NAME");
                        contentValidation = validator.isDecimal(content);
                        if( contentValidation != true ) { // 숫자 비교해서 같은면
                            //re = kakaoSocket.findXml("AUTH_OK");
                            re = kakaoSocket.findXml("NAME_NOK");
                            updateType = "NAME_NOK";
                        }
                    } else if (rtnStr.PHONE != null && rtnStr.NAME == null) {
                        updateType = "NAME";
                        let kakaoSocket = new KakaoSocket(systemContent);
                        re = kakaoSocket.findXml("AUTH");
                    } else if (rtnStr.PHONE != null && rtnStr.NAME != null && rtnStr.YN_AUTH == "N" && rtnStr.ETC1 == null) {
                        updateType = "NAME";
                        //  beforeContent에 해당하는 기간계 정보를 호출한다. (20170615)
                        let kakaoSocket = new KakaoSocket(systemContent);
                        re = kakaoSocket.findXml("AUTH");
                    } else if (rtnStr.PHONE != null && rtnStr.NAME != null && rtnStr.YN_AUTH == "N" && rtnStr.ETC1 != null) {
                        updateType = "AUTH";
                        //  beforeContent에 해당하는 기간계 정보를 호출한다. (20170615)
                        let kakaoSocket = new KakaoSocket(systemContent);
                        contentValidation = validator.isDecimal(content);
                        if( contentValidation == true && content == rtnStr.ETC1 ) { // 숫자 비교해서 같은면
                            //re = kakaoSocket.findXml("AUTH_OK");
                            re = beforeResMessage;
                            updateType = "AUTH_OK";// 인증을 성공하였으면 마지막 메뉴로 자동 이동시켜 원하는 정보를 선택하게 한다.
                        } else {
                            re = kakaoSocket.findXml("AUTH_NOK");
                            updateType = "AUTH_NOK";
                        }
                    } else {
                        let kakaoSocket = new KakaoSocket(systemContent);
                        re = kakaoSocket.findXml("AUTH_NOK");
                    }

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
                            // local case
                            //this.ls = spawn('/Users/gotaejong/projects/WorkspacesHTML5/tmsg-v3/shorturl');
                            // linux case
                            //this.ls = spawn('/home/proidea/workspaceHTML5/tmsg-v3/shorturl');
                            // tbroad case
                            this.ls = spawn('/home/icr/tmsg-v3/shorturl');
                            this.ls.stdout.on('data', (data) => {
                                console.log(`stdout: ${data}`);
                                nOTP = data;
                                if( nOTP != null ) {
                                    // 1. send SMS customer phone
                                    // 2. DB Update
                                    // const client = socketIoClient.connect(mtURL, options);

                                    // var messageSize = mtMessage.length+"";
                                    var sendMessage = "<?xml version=\"1.0\" encoding=\"EUC-KR\"?><REQUEST><SEND_TYPE>SMS</SEND_TYPE><MSG_TYPE>TEST</MSG_TYPE><MSG_CONTENTS>" + nOTP + "</MSG_CONTENTS><SEND_NUMBER>07081883757</SEND_NUMBER><RECV_NUMBER>" + rtnStr.PHONE + "</RECV_NUMBER><FGSEND>I</FGSEND><IDSO>1000</IDSO></REQUEST>";
                                    var messageSize = sendMessage.length + "";
                                    while (messageSize.length < 5) messageSize = "0" + messageSize;

                                    var sendData = messageSize + sendMessage;
                                    
                                    var client = new net.Socket();
                                    client.connect(this.mtPort, this.mtIP, function () {
                                        console.log('CONNECTED TO: ' + this.mtIP + ':' + this.mtPort);
                                        // Write a message to the socket as soon as the client is connected, the server will receive it as message from the client 
                                        client.write(sendData);
                                    });
                                    // Add a 'data' event handler for the client socket
                                    // data is what the server sent to this socket
                                    client.on('data', function (data) {
                                        console.log("data:" + data);
                                        var str = data;
                                        // Close the client socket completely
                                        var res = new String(str.slice(5));
                                        // res = res.replace(/\\r\\n/g, "");
                                        if (fastXmlParser.validate(res) === true) {
                                            var jsonObj = fastXmlParser.parse(res, options);
                                            var resultObj = JSON.parse(JSON.stringify(jsonObj.REQUEST)).RESULT_MSG;
                                            // console.log('XMLtoJSON:' + JSON.stringify(jsonObj.REQUEST));
                                            // console.log('XMLtoJSON:' + JSON.parse(JSON.stringify(jsonObj.REQUEST)).RESULT_CODE);
                                            // console.log('XMLtoJSON:' + JSON.parse(JSON.stringify(jsonObj.REQUEST)).RESULT_MSG);
                                            if (resultObj == "SUCCESS") {
                                                pool.query('UPDATE TB_AUTOCHAT_CUSTOMER SET NAME = ?, YN_AUTH = ?, ETC1 = ? WHERE UNIQUE_ID = ?', [content, "N", nOTP, user_key], function (err, rows, fields) {
                                                    if (err)
                                                        console.log("Query Error:", err);
                                                });
                                            }
                                        }
                                        client.destroy();
                                    });
                                    // Add a 'close' event handler for the client socket
                                    client.on('close', function () {
                                        console.log('Connection closed');
                                    });
                                }
                            });

                            this.ls.stderr.on('data', (data) => {
                              console.log(`stderr: ${data}`);
                              // retry ? 
                            });

                            this.ls.on('close', (code) => {
                              console.log(`child process exited with code ${code}`);
                            });
                    } else if( updateType == "AUTH_OK") {
                        pool.query('UPDATE TB_AUTOCHAT_CUSTOMER SET YN_AUTH = ? WHERE UNIQUE_ID = ?', ["Y", user_key], function(err, rows, fields) {
                            if(err) console.log("Query Error:", err);
                        });
                    } else if( updateType == "AUTH_NOK") {
                        pool.query('UPDATE TB_AUTOCHAT_CUSTOMER SET YN_AUTH = ? WHERE UNIQUE_ID = ?', ["N", user_key], function(err, rows, fields) {
                            if(err) console.log("Query Error:", err);
                        });
                    }
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
                    // re = depth_First_Third_Last_Response;
                    let kakaoSocket = new KakaoSocket(systemContent);
                    re = kakaoSocket.findXml("QUESTION_OK");
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
                    // re = depth_First_Third_Last_Response;
                    let kakaoSocket = new KakaoSocket(systemContent);
                    re = kakaoSocket.findXml("QUESTION_OK");
                } else if (beforeContent == "티브로드에 문의하기") {
                    /*
                    등록한 사진을 어디론가 옮기고 이력저장하고 
                    */
                    var post = {UNIQUE_ID:user_key, REQ_MESSAGE:content};
                    console.log("db values:" + JSON.stringify(post));

                    pool.query('INSERT INTO TB_AUTOCHAT_QUESTION SET ?', post, function(err, rows, fields) {
                    if (err)
                    console.log('Error while performing Query.', err);
                    });
                    // re = depth_First_Third_Last_Response;
                    let kakaoSocket = new KakaoSocket(systemContent);
                    re = kakaoSocket.findXml("QUESTION_OK");
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
                    re = beforeResMessage;
                }
            }
        })
        .then(function() {
            //console.log("out re:" + JSON.stringify(re)); 
            callback(null, re);
        })
        .done();
    }
    
    // Configure sockets
    private kakaoSockets(): void {
        console.log("Server kakaoSockets");
        // Get socket.io handle
        this.kakao_io = socketIo(this.kakao_server);
        // let kakaoSocket = new KakaoSocket(this.kakao_io);
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

    private dbSelectScenarioSystem(content: string): void {
        var defered = Q.defer();
        // console.log("content:" + content);
        pool.query('SELECT * FROM TB_AUTOCHAT_SCENARIO WHERE ETC3 = ?', content, defered.makeNodeResolver());
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
}
