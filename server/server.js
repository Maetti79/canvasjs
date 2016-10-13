var canvasR     = require('./canvasroom');
var helper      = require('./helper');
//var Canvas = require('canvas');
//var jpeg = require('jpeg-js');
var canvasRooms = new Array();
var connectionIDCounter = 0;
var WebwsServer = require('ws').Server , wss = new WebwsServer({ port: 8081 });
wss.binaryType = 'arraybuffer';
wss.on('connection', function connection(ws) {
	log('wss:connection():','connecting');
	ws.id = connectionIDCounter ++;
	
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
			var dataRAW = data;
			var dataObj = JSON.parse(data);
			
			if(dataObj.frametype == "Join") {
				try {
					if (canvasRooms.existsObj(dataObj.room) == false) {
						canvasRooms.push(new canvasR(ws, dataObj.room));
					}
					var canvasRoom = canvasRooms.retrieveObj(dataObj.room);
					if(canvasRoom){
						canvasRoom.Join(ws, dataObj, dataRAW);
						canvasRooms.updateObj(canvasRoom);
						ws.room = dataObj.room;
					}
				} catch(e) {
					log('ws:join(Err)', e );
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
		} catch(e) {
			log('ws:message(Err)', e );
		}
	});
	
});

function getUniqueNickname(){
  var d = new Date().getTime();
  var uuid = 'GS-xx-xx-xxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return (c=='x' ? r : (r&0x7|0x8)).toString(16);
  });
  return uuid;
}

function uniqueId(){
  var d = new Date().getTime();
  var uuid = 'meta_xxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return (c=='x' ? r : (r&0x7|0x8)).toString(16);
  });
  return uuid;
}

function log(func, msg){
  console.log(func + ': ' +msg);
}