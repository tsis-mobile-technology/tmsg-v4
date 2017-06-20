// Instantiate server app
import { Backend } from './backend';
import { ApiServer } from './apiServer';
const backend = new Backend();
const apiServer = new ApiServer();
backend.listen();
apiServer.kakaoListen();
