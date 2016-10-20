'use strict';
(function() {

	var canvasRoom = (function() {
	
		function uniqueId(){
		  var d = new Date().getTime();
		  var uuid = 'meta_xxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return (c=='x' ? r : (r&0x7|0x8)).toString(16);
		  });
		  return uuid;
		};

		function log(func, msg){
		  console.log(func + ': ' +msg);
		};
				
		function canvasRoom(sock, room, id) {
			log('canvasRoom:init('+room+')',id);
			this.sock = sock;
			this.clients = [];
			this.idref = id
			this.id = room;
			this.room = room;
			this.codec = null;
		};

		canvasRoom.prototype.setCodec = function setCodec(c){
			try {
				var codec = {
					'Video': c.TxVideo,
					'VideoWidth': c.TxVideoWidth,
					'VideoHeight': c.TxVideoHeight,
					'VideoQuality': c.TxVideoQuality,
					'VideoFPS': c.TxVideoFPS,
					'VideoBuffers' : c.TxVideoBuffers,
					'VideoKPS': c.TxVideoKPS,
					'VideoInterlaced' : c.TxVideoInterlaced,
					'VideoMBWidth': c.TxVideoMBWidth,
					'VideoMBHeight': c.TxVideoMBHeight,
					'VideoMBDiff': c.TxVideoMBDiff,
					'Audio': c.TxAudio,
					'AudioSampleRate': c.TxAudioSampleRate,
					'AudioBufferSize': c.TxAudioBufferSize,
					'AudioCPS': c.TxAudioCPS,
					'AudioBuffers': c.TxAudioBuffers,
				}
				//log('canvasRoom('+this.room+'):codec()', JSON.stringify(codec));
				this.codec = codec;
			} catch(e){
				log('canvasRoom('+this.room+'):setCodec(Err)', e);
			}
		},
		canvasRoom.prototype.Nickname = function Nickname(ws, dataObj, dataRAW) {
			try {
				this.clients.forEach(function (client) {
					if(client.id != dataObj.clientid){
						client.send(dataObj);
					}
				});
			} catch(e){
				log('canvasRoom('+this.room+'):Nickname(Err)', e);
			}
		},
		canvasRoom.prototype.Binary = function Binary(ws, dataRAW,ClientID) {
			try {
				this.clients.forEach(function (client) {
					if(client.id != ClientID){
						client.send(dataRAW);
					}
				});
			} catch(e){
				log('canvasRoom('+this.room+'):Binary(Err)', e);
			}
		},
		canvasRoom.prototype.Join = function Join(ws, dataObj, dataRAW) {
			try {
				log('canvasRoom('+this.room+'):Join()', JSON.stringify(dataObj));
				var now = new Date().getTime();
				ws.delay = (now - dataObj.sync);
				if (this.clients.existsObj(ws.id) == false) {
					log('canvasRoom('+this.room+'):Join()Clients TRX', ws.id);
					this.clients.push(ws);
				}
				//Publisher
				if(dataObj.publisher == true) {
					this.setCodec(dataObj.codec);
					ws.publisher = true;
					var publishermetadata = {
						'frametype'	: 'MetaData',
						'clientid' : ws.id,
						'clients' : this.clients.length,
						'metaid' : uniqueId(),
						'text': 'Welcome Publisher',
						'room': dataObj.room,
						'roomid' : this.idref,
						'codec' : this.codec,
						'init' : "tx",
						'sync': now
					}; 
					log('canvasRoom('+this.room+'):Join()Publisher TX', ws.id);
					ws.send(JSON.stringify(publishermetadata));
				} else {
					ws.publisher = false;
				}
				//Subscriber
				if(dataObj.subscriber == true) {
					ws.subscriber = true;
					var subscribermetadata = {
						'frametype'	: 'MetaData',
						'clientid' : ws.id,
						'clients' : this.clients.length,
						'metaid' : uniqueId(),
						'text': 'Welcome Subscriber',
						'room': dataObj.room,
						'roomid' : this.idref,
						'codec' : this.codec,
						'init' : "rx",
						'sync': now
					}; 
					log('canvasRoom('+this.room+'):Join()Subscriber RX', ws.id);
					ws.send(JSON.stringify(subscribermetadata));
				} else {
					ws.subscriber = false;
				}
				var trx = {
						'frametype'	: 'MetaData',
						'clientid' : ws.id,
						'clients' : this.clients.length,
						'metaid' : uniqueId(),
						'text': 'Welcome TRX',
						'room': dataObj.room,
						'roomid' : this.idref,
						'init' : "trx",
						'sync': now
					}; 
				log('canvasRoom('+this.room+'):Join()INIT TRX', ws.id);
				ws.send(JSON.stringify(trx));
				
				if(dataObj.nickname != null) {
					var joinmetadata = {
							'frametype'	: 'MetaData',
							'clientid' : ws.id,
							'clients' : this.clients.length,
							'metaid' : uniqueId(),
							'text': dataObj.nickname + ' joined Chat "'+dataObj.room+'"',
							'init' : 'join',
							'room': dataObj.room,
							'sync': now
					}; 
					this.clients.forEach(function (client) {
						client.send(JSON.stringify(joinmetadata));
					});
				}
			} catch(e){
				log('canvasRoom('+this.room+'):Join(Err)', e);
			}
			log('canvasRoom('+this.room+'): Connections ',this.clients.length);
		};
		canvasRoom.prototype.Leave = function Leave(ws, dataObj, dataRAW) {
			try {
				log('canvasRoom('+this.room+'):Leave()', "TRX");
				var now = new Date().getTime();
				if(ws.nickname != null) {
					var joinmetadata = {
							'frametype'	: 'MetaData',
							'clientid' : ws.id,
							'clients' : this.clients.length-1,
							'metaid' : uniqueId(),
							'text': ws.nickname + ' left Chat',
							'init' : 'join',
							//'room': ws.room,
							'sync': now
					}; 
					this.clients.forEach(function (client) {
						if(client.id != ws.id){
							client.send(JSON.stringify(joinmetadata));
						}
					});
				}
				this.clients.removeObj(ws.id);
				return this.clients.length;
			} catch(e){
				log('canvasRoom('+this.room+'):Leave(Err)', e);
			}
			log('canvasRoom('+this.room+'): Connections ',this.clients.length);
		};
		canvasRoom.prototype.MetaData = function MetaData(ws, dataObj, dataRAW) {
			try {
				//log('canvasRoom('+this.room+'):MetaData()', "TX");
				this.clients.forEach(function (client) {
					client.send(dataRAW);
				});
			} catch(e){
				log('canvasRoom('+this.room+'):MetaData(Err)', e);
			}
        };
		canvasRoom.prototype.SyncFrame = function SyncFrame(ws, dataObj, dataRAW) {
			this.clients.forEach(function (client) {
				client.send(dataRAW);
			});
		};
		canvasRoom.prototype.Packet = function Packet(ws, dataObj, dataRAW) {
			if(this.clients.length == 1) {
					ws.send(dataRAW);
			} else {
				this.clients.forEach(function (client) {
					if(client.id != dataObj.clientid){
						client.send(dataRAW);
					}
				});
			}
		};
		canvasRoom.prototype.KeyFrame = function KeyFrame(ws, dataObj, dataRAW) {
			try {
				/*
				var Image = Canvas.Image;
				var imageObj = new Image();
				var canvas = new Canvas(data.width,data.height); 
				var context = canvas.getContext('2d');
				imageObj.src = data.image;
				context.drawImage(imageObj, 0, 0);
				var Keyframe = canvas.toDataURL('image/jpeg', 0.3, function(err, jpeg){
					dataObj.image = jpeg
						this.clients.forEach(function (client) {
							if(client.id != dataObj.clientid){
								client.send(dataObj);
							}
						});
				});
				*/		
				//log('canvasRoom('+this.room+'):KeyFrame()', "TX");
				if(this.clients.length == 1) {
					ws.send(dataRAW);
				} else {
					this.clients.forEach(function (client) {
						if(client.id != dataObj.clientid){
							client.send(dataRAW);
						}
					});
				}
			} catch(e){
				log('canvasRoom('+this.room+'):KeyFrame(Err)', e);
			}
        };
		canvasRoom.prototype.PFrame = function PFrame(ws, dataObj, dataRAW) {
			try {
				//log('canvasRoom('+this.room+'):PFrame()', "TX");
				if(this.clients.length == 1) {
					ws.send(dataRAW);
				} else {
					this.clients.forEach(function (client) {
						if(client.id != dataObj.clientid){
							client.send(dataRAW);
						}
					});
				}
			} catch(e){
				log('canvasRoom('+this.room+'):PFrame(Err)', e);
			}
        };
		canvasRoom.prototype.IFrame = function IFrame(ws, dataObj, dataRAW) {
			try {
				//log('canvasRoom('+this.room+'):IFrame()', "TX");
				if(this.clients.length == 1) {
					ws.send(dataRAW);
				} else {
					this.clients.forEach(function (client) {
						if(client.id != dataObj.clientid){
							client.send(dataRAW);
						}
					});
				}
			} catch(e){
				log('canvasRoom('+room+'):IFrame(Err)', e);
			}
        };
		canvasRoom.prototype.AudioChunk = function AudioChunk(ws, dataObj, dataRAW) {
			try {
				//log('canvasRoom('+this.room+'):AudioChunk()', "TX");
				if(this.clients.length == 1) {
					ws.send(dataRAW);
				} else {
					this.clients.forEach(function (client) {
						if(client.id != dataObj.clientid){
							client.send(dataRAW);
						}
					});
				}
			} catch(e){
				log('canvasRoom('+this.room+'):AudioChunk(Err)', e);
			}
        };
		canvasRoom.prototype.TextMessage = function TextMessage(ws, dataObj, dataRAW) {
			try {
				log('canvasRoom('+this.room+'):TextMessage()', "TX");
				this.clients.forEach(function (client) {
					client.send(dataRAW);
				});
			} catch(e){
				log('canvasRoom('+this.room+'):TextMessage(Err)', e);
			}
        };
		canvasRoom.prototype.Echo = function Echo(ws, dataObj, dataRAW) {
			try {
				//log('canvasRoom('+this.room+'):MetaData()', "TX");
				if(this.clients.length == 1) {
					ws.send(dataRAW);
				} else {
					this.clients.forEach(function (client) {
						if(client.id != dataObj.clientid){
							client.send(dataRAW);
						}
					});
				}
			} catch(e){
				log('canvasRoom('+this.room+'):MetaData(Err)', e);
			}
        };
		//Export Methods
		return canvasRoom;
	})();
	module.exports = canvasRoom;
}).call(this);