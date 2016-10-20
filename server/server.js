var canvasR     = require('./canvasroom');
var helper      = require('./helper');
//var Canvas = require('canvas');
//var jpeg = require('jpeg-js');
var canvasRooms = new Array();
var roomIDCounter = 0;
var connectionIDCounter = 0;
var WebwsServer = require('ws').Server , wss = new WebwsServer({ port: 8081 });
wss.binaryType = 'arraybuffer';
wss.on('connection', function connection(ws) {
	log('wss:connection():','connecting');
	ws.id = connectionIDCounter;
	connectionIDCounter++;
	
	ws.on('close', function close() {
		log('ws:close():','disconnected');
		try{
			var canvasRoom = canvasRooms.retrieveObj(ws.room);
			if(canvasRoom){
				if(canvasRoom.Leave(ws) == 0) {
					log('ws:close():', 'canvasRoom:removeObj(' + ws.room + ')');
					canvasRooms.removeObj(ws.room);
				} else {
					log('ws:close():', 'canvasRoom:updateObj(' + ws.room + ')');
					canvasRooms.updateObj(canvasRoom);
				}
			}
			canvasRoom = null;
		} catch(e) {
			log('ws:close(Err)', e );
		}
	});
	
	ws.on('message', function message(data, flags) {
		//log('ws:message():', 'data: ' + data);
		//log('ws:message():', 'flags: ' + JSON.stringify(flags));
		try {	
			if(data instanceof Object ){
				var headerLength = 80;
				var buf = new ArrayBuffer(headerLength);
				var view = new Uint8Array(buf);
				for(var i = 0; i < headerLength; i++) { view[i] = data[i]; }
				var offset = 0;
				var HTSbytes = new Float64Array(buf,offset,1);
					offset += 8;
				var HCIDbytes = new Uint32Array(buf,offset,2); 
				var ClientID = HCIDbytes[0];
				var RoomID = HCIDbytes[1];
					offset += 8;
				var canvasRoom = canvasRooms.retrieveObjIdRef(RoomID);
				if(canvasRoom){
					canvasRoom.Binary(ws,data,ClientID);
				} else {
					log('ws:Binary(Err)', 'Room not found' );
				}
			} else {
				var dataRAW = data;
				var dataObj = JSON.parse(data);
					if(dataObj.frametype == "Join") {
						try {
							if(dataObj.room != null) {
								ws.room = dataObj.room;
							}
							if(dataObj.nickname != null) {
								ws.nickname = dataObj.nickname;
							}
							if (canvasRooms.existsObj(dataObj.room) == false) {
								ws.roomid = roomIDCounter;
								canvasRooms.push(new canvasR(ws, dataObj.room, roomIDCounter));
								roomIDCounter++;
							}
							var canvasRoom = canvasRooms.retrieveObj(dataObj.room);
							if(canvasRoom){
								canvasRoom.Join(ws, dataObj, dataRAW);
								canvasRooms.updateObj(canvasRoom);
							}
						} catch(e) {
							log('ws:join(Err)', e );
						}
					} 	
					if(dataObj.frametype == "SyncFrame") {
						try {
							var canvasRoom = canvasRooms.retrieveObj(ws.room);
							if(canvasRoom){
								canvasRoom.SyncFrame(ws,dataObj,dataRAW);
								//canvasRooms.updateObj(canvasRoom);
							} else {
								log('ws:SyncFrame(Err)', 'Room not found' );
							}
						} catch(e) {
							log('ws:SyncFrame(Err)', e );
						}
					}
					if(dataObj.frametype == "Packet") {
						try {
							var canvasRoom = canvasRooms.retrieveObj(ws.room);
							if(canvasRoom){
								canvasRoom.Packet(ws,dataObj,dataRAW);
								//canvasRooms.updateObj(canvasRoom);
							} else {
								log('ws:Packet(Err)', 'Room not found' );
							}
						} catch(e) {
							log('ws:Packet(Err)', e );
						}
					}
					if(dataObj.frametype == "KeyFrame") {
						try {
							var canvasRoom = canvasRooms.retrieveObj(ws.room);
							if(canvasRoom){
								canvasRoom.KeyFrame(ws,dataObj,dataRAW);
								//canvasRooms.updateObj(canvasRoom);
							} else {
								log('ws:KeyFrame(Err)', 'Room not found' );
							}
						} catch(e) {
							log('ws:KeyFrame(Err)', e );
						}
					}
					if(dataObj.frametype == "PFrame") {
						try {
							var canvasRoom = canvasRooms.retrieveObj(ws.room);
							if(canvasRoom){
								canvasRoom.PFrame(ws,dataObj,dataRAW);
								//canvasRooms.updateObj(canvasRoom);
							} else {
								log('ws:PFrame(Err)', 'Room not found' );
							}
						} catch(e) {
							log('ws:PFrame(Err)', e );
						}
					}
					if(dataObj.frametype == "IFrame") {
						try {
							var canvasRoom = canvasRooms.retrieveObj(ws.room);
							if(canvasRoom){
								canvasRoom.IFrame(ws,dataObj,dataRAW);
								//canvasRooms.updateObj(canvasRoom);
							} else {
								log('ws:IFrame(Err)', 'Room not found' );
							}
						} catch(e) {
							log('ws:IFrame(Err)', e );
						}
					}
					if(dataObj.frametype == "AudioChunk") {
						try {
							var canvasRoom = canvasRooms.retrieveObj(ws.room);
							if(canvasRoom){
								canvasRoom.AudioChunk(ws,dataObj,dataRAW);
								//canvasRooms.updateObj(canvasRoom);
							} else {
								log('ws:AudioChunk(Err)', 'Room not found' );
							}
						} catch(e) {
							log('ws:AudioChunk(Err)', e );
						}
					}
					if(dataObj.frametype == "TextMessage") {
						try {
							var canvasRoom = canvasRooms.retrieveObj(ws.room);
							if(canvasRoom){
								canvasRoom.TextMessage(ws,dataObj,dataRAW);
								//canvasRooms.updateObj(canvasRoom);
							} else {
								log('ws:TextMessage(Err)', 'Room not found' );
							}
						} catch(e) {
							log('ws:TextMessage(Err)', e );
						}
					}
					if(dataObj.frametype == "MetaData") {
						try {
							var canvasRoom = canvasRooms.retrieveObj(ws.room);
							if(canvasRoom){
								canvasRoom.MetaData(ws,data);
								//canvasRooms.updateObj(canvasRoom);
							} else {
								log('ws:MetaData(Err)', 'Room not found' );
							}
						} catch(e) {
							log('ws:MetaData(Err)', e );
						}
					}
			}
		} catch(e) {
			log('ws:message(Err)', e );
		}
	});
	
});

function log(func, msg){
  console.log(func + ': ' +msg);
}