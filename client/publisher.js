$( document ).ready(function() {
	$("#CameraVideo1").hide();
	$("#CameraVideo1").prop("volume", 0);
	$("#MicrophoneVideo1").hide();
	$("#MicrophoneVideo1").prop("volume", 0);
});
var LC = (function(parent, $) {
  var publisher = {
	sock: null,
	server: 'wss://purepix.net/cc/',
	room: "lobby",
	roomid: 0,
	nickname: 'user',
	clients: 0,
	busy: false,
	initiated : false,
	connected : false,
	publish: false,
	wait: 0,
	subscribe: false,
	//Audio
	audioContext: null,
	//Recording
	audioSource: null,
	audioDeviceLabel: null,
	audioInputTX: null,
	audioRecorderTX: null,
 	audioAnalyzerTX: null,
	audioTimerTX: null,
	//Playback
	audioPlayer : null,
	audioAnalyzerRX: null,
	audioTimerRX: null,
	//Buffering
	TXvideoQueue : [],
	TXaudioQueue : [],
	TXaudioBuffer : null,
	TXaudioBufferPointer: 0,
	TXaudioFlushSize: 0,
	//Buffering
	RXvideoQueue : [],
	RXaudioQueue : [],
	RXaudioBuffer : null,
	RXaudioBufferPointer: 0,
	RXaudioFlushSize: 0,
	//Video
	videoSource: null,
	videoDeviceLabel: null,
	CameraVideo: null, 		// WebCam + Microphone -> Video IN
	MicrophoneVideo: null, 		// WebCam + Microphone -> Video IN
	CameraTimer: null, 		// Frame Grabber 25FPS
	CameraCanvas: null, 	// Video -> Canvas
	CameraCanvasContext: null,
	CameraCanvasTX : null, 	// TX Canvas Copy
	CameraCanvasTXContext : null,
	TXInterlacedCanvas : null, 	// Canvas -> Interlaced (even/odd)
	TXInterlacedCanvasContext: null,
	TXMakroBlocksCanvas: null,  // Canvas -> MakroBlocks
	TXMakroBlocksCanvasContext: null,
	CameraCanvasRX: null,	// RX Canvas Copy
	CameraCanvasRXContext: null,
	RXInterlacedCanvas : null, 	// Canvas -> Interlaced (even/odd)
	RXInterlacedCanvasContext: null,
	RXMakroBlocksCanvas: null,  // Canvas -> MakroBlocks
	RXMakroBlocksCanvasContext: null,
	RXKeyCanvas: null, 	// Canvas -> MakroBlock (one)
	RXKeyCanvasContext: null,
	FrameTimer: null, 	// 15FPS
	videoTimerTRX: null,
	videoTimerTX: null,
	videoTimerRX: null,
	KeyFrame : null,	// Last Key Fframe
	IFrame: null,		// Last Interlaced Frame
	PFrame: null,      	// Last MakroBlocks Frame
	BFrame: null,		// Last Frame
	//Helper
	frameCounter : 0,
	TXframeSyncTimestamp : null,
	RXframeSyncTimestamp : null,
	TXchunkSyncTimestamp: null,
	RXchunkSyncTimestamp: null,
	TRXsyncTimestamp: null,
	TRXsyncLastTimestamp: null,
	TXsyncTimestamp: null,
	TXsyncLastTimestamp: null,
	TXsyncTimestampS: null,
	TXsyncTimestampA: null,
	TXsyncTimestampV: null,
	RXsyncTimestamp: null,
	RXsyncLastTimestamp: null,
	RXsyncTimestampS: null,
	RXsyncTimestampA: null,
	RXsyncTimestampV: null,
	InterlacedEven : false,
	MakroblocksEven : false,
	ASyncCnt : 0,
	VSyncCnt : 0,
	RXnoframe: 0,
	RXsyncAV : 0,
	MSperSample : 0,
	RXscanline: 0,
	TXscanline: 0,
	byteTX : 0,
	byteRX: 0,
	tx : {
			'id': null, 
			//TX Video
			'TxVideo': true,
			'TxVideoWidth': 200,
			'TxVideoHeight': 154,
			'TxVideoQuality': 0.65,
			'TxVideoFPS': 10,
			'TxVideoBuffers' : 2,
			'TxVideoKPS': 24,
			'TxVideoInterlaced' : true,
			'TxVideoMBWidth': 8,
			'TxVideoMBHeight': 8,
			'TxVideoMBDiff': 10,
			//TX Audio
			'TxAudio': true,
			'TxAudioSampleRate': 8000,
			'TxAudioBufferSize': 1024*2,
			'TxAudioCPS': 10,
			'TxAudioBuffers': 2,
	},
	rx: {
			'id': null, 
			//Video
			'RxVideo': true,
			'RxVideoWidth': 200,
			'RxVideoHeight': 154,
			'RxVideoFPS': 12,
			'RxVideoBuffers' :32,
			//Audio
			'RxAudio': true,
			'RxAudioSampleRate': 8000,
			'RxAudioBufferSize': 1024*2,
			'RxAudioCPS': 8,
			'RxAudioBuffers': 16,
	},	
	initStreams: function() {	
		if(LC.publisher.initiated == false) {
			//Local Media Streams
			LC.publisher.MicrophoneVideo = document.getElementById('MicrophoneVideo1');	//Microphone 	-> VideoTag
			LC.publisher.CameraVideo = document.getElementById('CameraVideo1');			//Webcam 		-> VideoTag
			//Webcam Canvas
			LC.publisher.CameraCanvas = document.createElement('canvas');				//CameraTimer 	-> VideoTag -> CameraCanvas
			LC.publisher.CameraCanvas.width = LC.publisher.tx.TxVideoWidth;
			LC.publisher.CameraCanvas.height = LC.publisher.tx.TxVideoHeight;
			LC.publisher.CameraCanvasContext = LC.publisher.CameraCanvas.getContext('2d'); 
			LC.publisher.CameraTimer = setInterval(LC.publisher.videoRecorder, (1000/LC.publisher.tx.TxVideoFPS));
			LC.publisher.log('Context Webcam Timer', (1000/LC.publisher.tx.TxVideoFPS) + 'ms');
			
			LC.publisher.blankCanvas = document.createElement('canvas');		
			LC.publisher.blankCanvas.width = LC.publisher.tx.TxVideoWidth;
			LC.publisher.blankCanvas.height = LC.publisher.tx.TxVideoHeight;
			LC.publisher.blankContext = LC.publisher.blankCanvas.getContext('2d'); 
			
			LC.publisher.videoTimerTRX = setInterval(LC.publisher.doTRX, 1000);
			LC.publisher.log('Context TRX Timer',1000 + 'ms');
			
			try {
				LC.publisher.log('Context AudioContext', 'init...');	
				window.AudioContext  = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;
				LC.publisher.audioContext = new window.AudioContext();//AudioContext(LC.publisher.tx.TxAudioSampleRate);
				LC.publisher.log('Context SampelRate', LC.publisher.audioContext.sampleRate + 'Hz');
				LC.publisher.resampler = new Resampler(LC.publisher.audioContext.sampleRate, LC.publisher.tx.TxAudioSampleRate, 1,  LC.publisher.tx.TxAudioBufferSize);
				LC.publisher.log('Context Resampler', LC.publisher.tx.TxAudioSampleRate + 'Hz');
				
				if(LC.publisher.rx.RxAudio == true) {
					LC.publisher.log('Context AudioPlayer','init...');
					LC.publisher.audioAnalyzerRX = LC.publisher.audioContext.createAnalyser();
					LC.publisher.audioAnalyzerRX.fftSize = LC.publisher.rx.RxAudioBufferSize;
					LC.publisher.audioPlayer = new SoundBuffer(LC.publisher.audioContext, LC.publisher.rx.RxAudioSampleRate, LC.publisher.rx.RxAudioBuffers, LC.publisher.audioAnalyzerRX, false);
					LC.publisher.audioAnalyzerRX.connect(LC.publisher.audioContext.destination);
				} else {
					LC.publisher.log('Context AudioPlayer','disabled');
				}
				
			} catch(e) {
				LC.publisher.tx.TxAudio = false;
				LC.publisher.rx.RxAudio = false;
				LC.publisher.log('Context Audio', 'disabled');
			}
			//TX
			if(LC.publisher.tx.TxVideo == true)	 {
				LC.publisher.log('Context TX Video', LC.publisher.tx.TxVideoWidth + '*'+LC.publisher.tx.TxVideoHeight+'@I'+LC.publisher.tx.TxVideoFPS+"fps");
				LC.publisher.CameraCanvasTX = document.getElementById('CameraCanvasTX1'); 		
				LC.publisher.CameraCanvasTX.width = LC.publisher.tx.TxVideoWidth;
				LC.publisher.CameraCanvasTX.height = LC.publisher.tx.TxVideoHeight;
				LC.publisher.CameraCanvasTXContext = LC.publisher.CameraCanvasTX.getContext('2d');
				LC.publisher.log('Context TX Video','KFrames supported');
				LC.publisher.log('Context TX Video','IFrames supported');
				LC.publisher.TXInterlacedCanvas = document.createElement('canvas');		
				LC.publisher.TXInterlacedCanvas.width = LC.publisher.tx.TxVideoWidth;
				LC.publisher.TXInterlacedCanvas.height = LC.publisher.tx.TxVideoHeight/2;
				LC.publisher.TXInterlacedCanvasContext = LC.publisher.TXInterlacedCanvas.getContext('2d');
				LC.publisher.log('Context TX Video','PFrames supported');
				LC.publisher.TXMakroBlocksCanvas = document.createElement('canvas');	
				LC.publisher.TXMakroBlocksCanvas.width = LC.publisher.tx.TxVideoWidth;
				LC.publisher.TXMakroBlocksCanvas.height = LC.publisher.tx.TxVideoHeight;
				LC.publisher.TXMakroBlocksCanvasContext = LC.publisher.TXMakroBlocksCanvas.getContext('2d');	
			} else {
				LC.publisher.log('Context TX Video', 'disabled');
			}
			if(LC.publisher.rx.RxAudio == true)	 {
				LC.publisher.log('Context TX Audio', 'SampleRate ' + LC.publisher.tx.TxAudioSampleRate + 'Hz');
				LC.publisher.TXaudioFlushSize = Math.ceil(LC.publisher.tx.TxAudioSampleRate / LC.publisher.tx.TxAudioCPS);
				LC.publisher.log('Context TX Audio', 'FlushSize ' +   LC.publisher.TXaudioFlushSize + 'byte');
				LC.publisher.TXaudioBuffer = new Float32Array(LC.publisher.TXaudioFlushSize);
				LC.publisher.log('Context TX Audio', 'BufferSize ' +  LC.publisher.tx.TxAudioBufferSize + 'byte/s');
				LC.publisher.log('Context TX Audio', 'Chunks ' +(LC.publisher.tx.TxAudioSampleRate / LC.publisher.TXaudioFlushSize) + '/s');
			} else {
				LC.publisher.log('Context TX Audio', 'disabled');
			}
			if(LC.publisher.videoTimerTX == null){
				LC.publisher.videoTimerTX = setInterval(LC.publisher.doTX, (1000/LC.publisher.tx.TxVideoFPS));
				LC.publisher.log('Context TX Timer', (1000/LC.publisher.tx.TxVideoFPS) + 'ms');
				LC.publisher.doNoiseTX('Connecting...');
			} else {
				LC.publisher.log('Context TX Timer', 'disabled');
				LC.publisher.doNoiseTX('Disabled!');
			}
			//RX
			if(LC.publisher.rx.RxVideo == true)	 {
				LC.publisher.log('Context RX Video', LC.publisher.rx.RxVideoWidth + '*'+LC.publisher.rx.RxVideoHeight+'@I'+LC.publisher.rx.RxVideoFPS+"fps");
				LC.publisher.CameraCanvasRX = document.getElementById('CameraCanvasRX1'); 			//CameraCanvas -> Canvas Video In RX
				LC.publisher.CameraCanvasRX.width = LC.publisher.rx.RxVideoWidth;
				LC.publisher.CameraCanvasRX.height = LC.publisher.rx.RxVideoHeight;
				LC.publisher.CameraCanvasRXContext = LC.publisher.CameraCanvasRX.getContext('2d');
				LC.publisher.log('Context RX Video','KFrames supported');
				LC.publisher.RXKeyCanvas = document.createElement('canvas');			
				LC.publisher.RXKeyCanvas.width = LC.publisher.rx.RxVideoWidth;
				LC.publisher.RXKeyCanvas.height = LC.publisher.rx.RxVideoHeight;
				LC.publisher.RXKeyCanvasContext = LC.publisher.RXKeyCanvas.getContext('2d');
				LC.publisher.log('Context RX Video','IFrames supported');
				LC.publisher.RXInterlacedCanvas = document.createElement('canvas');	
				LC.publisher.RXInterlacedCanvas.width = LC.publisher.rx.RxVideoWidth;
				LC.publisher.RXInterlacedCanvas.height = LC.publisher.rx.RxVideoHeight/2;
				LC.publisher.RXInterlacedCanvasContext = LC.publisher.RXInterlacedCanvas.getContext('2d');
				LC.publisher.log('Context RX Video','PFrames supported');
				LC.publisher.RXMakroBlocksCanvas = document.createElement('canvas');	
				LC.publisher.RXMakroBlocksCanvas.width = LC.publisher.rx.RxVideoWidth;
				LC.publisher.RXMakroBlocksCanvas.height = LC.publisher.rx.RxVideoHeight;
				LC.publisher.RXMakroBlocksCanvasContext = LC.publisher.RXMakroBlocksCanvas.getContext('2d');
			} else {
				LC.publisher.log('Context RX Video', 'disabled');
			}
			
			try {
				LC.publisher.log('Context VideoContext', 'init...');	
				navigator.mediaDevices.enumerateDevices().then(function(sourceInfos) {
						for (var i = 0; i != sourceInfos.length; ++i) {
							var sourceInfo = sourceInfos[i];
							//console.log(JSON.stringify(sourceInfo));
							//LC.publisher.log(sourceInfo.kind + '['+i+']', sourceInfo.deviceId + ' ' +  sourceInfo.label || 'Media');	
							if (sourceInfo.kind === 'audioinput') {
								LC.publisher.audioDeviceLabel = sourceInfo.label;		
								LC.publisher.audioSource = sourceInfo.deviceId;
							} else if (sourceInfo.kind === 'videoinput') {	
								LC.publisher.videoDeviceLabel = sourceInfo.label;	
								LC.publisher.videoSource = sourceInfo.deviceId;
							} 
						 }
						 LC.publisher.log('Context Media Stream', 'init...');
						 LC.publisher.log('Context Video Source', LC.publisher.videoDeviceLabel);
						 LC.publisher.log('Context Audio Source', LC.publisher.audioDeviceLabel);
						 LC.publisher.sourceSelected(LC.publisher.audioSource, LC.publisher.videoSource);
					});
			} catch(e) {
				LC.publisher.tx.TxVideo = false;
				LC.publisher.rx.RxVideo = false;
				LC.publisher.log('Context VideoContext', 'disabled');
			}
			
			if(LC.publisher.rx.RxAudio == true)	 {
				LC.publisher.log('Context RX Audio', 'SampleRate' + LC.publisher.rx.RxAudioSampleRate + 'Hz');
				LC.publisher.RXaudioFlushSize = Math.ceil(LC.publisher.rx.RxAudioSampleRate / LC.publisher.rx.RxAudioCPS);
				LC.publisher.log('Context RX Audio', 'FlushSize' +   LC.publisher.RXaudioFlushSize + 'byte');
				LC.publisher.RXaudioBuffer = new Float32Array(LC.publisher.RXaudioFlushSize);
				LC.publisher.log('Context RX Audio', 'BufferSize' +  LC.publisher.rx.RxAudioBufferSize + 'byte/s');
				LC.publisher.RXsyncAV = (1000/(LC.publisher.rx.RxAudioSampleRate / LC.publisher.RXaudioFlushSize))*LC.publisher.rx.RxAudioBuffers;
				LC.publisher.log('Context RX Audio', 'RXsyncAV ' + LC.publisher.RXsyncAV + 'ms');
				LC.publisher.SampleMS = (1000/LC.publisher.rx.RxAudioSampleRate); 
				LC.publisher.log('Context RX Audio','Sample @' + LC.publisher.SampleMS + 'ms');
				LC.publisher.ChunkMS = LC.publisher.SampleMS * LC.publisher.RXaudioFlushSize;
				LC.publisher.log('Context RX Audio','Chunk @' + LC.publisher.ChunkMS + 'ms');
			} else {
				LC.publisher.log('Context RX Audio', 'disabled');
			}
			if(LC.publisher.videoTimerRX == null) {
				LC.publisher.videoTimerRX = setInterval(LC.publisher.doRX, (1000/LC.publisher.rx.RxVideoFPS));
				LC.publisher.log('Context RX Timer', (1000/LC.publisher.rx.RxVideoFPS) + 'ms');
				LC.publisher.doNoiseRX('Connecting...');
			} else {
				LC.publisher.log('Context RX Timer', 'disabled');
				LC.publisher.doNoiseRX('Disabled!');
			}
		}
		LC.publisher.initiated = true;
	},
	initSock: function(server, room, nickname){
		LC.publisher.log('WebSocket','init...');
		try {
			if(server != ""){
				if(LC.publisher.server == "") {
					LC.publisher.server = "wss://purepix.net/cc/";
				} else {
					LC.publisher.server = server;
				}
			}
			LC.publisher.log('WebSocket','Server: ' + LC.publisher.server);
			if(room != ""){
				if(LC.publisher.room != "") {
					LC.publisher.room = room;
				}
			}
			LC.publisher.log('WebSocket','Room: ' + LC.publisher.room);
			if(nickname != "") {
				if(LC.publisher.nickname != "") {
					LC.publisher.nickname = LC.publisher.getUniqueNickname();
				}
			}
			LC.publisher.log('WebSocket','Nickname: ' + LC.publisher.nickname);
			var ws = new WebSocket(LC.publisher.server);
			ws.binaryType = 'arraybuffer';
			ws.onopen = function(data) {
				LC.publisher.log('WebSocket', JSON.stringify(data));
				LC.publisher.onConnect();
			};
			ws.onmessage = function(event) {
				var dataRAW = event.data;
				if(dataRAW instanceof Object ){
					var dataObj = LC.publisher.decodeBinary(dataRAW);
				} else {
					if(dataRAW instanceof ArrayBuffer ){
						var bytearray = new Uint8Array(dataRAW);
						console.log("Received arraybuffer");
						console.log(bytearray);
					} else {
						var dataObj = JSON.parse(event.data);
						if(dataObj.frametype == "Packet") {
							LC.publisher.onPacket(dataObj);
						}
						if(dataObj.frametype == "KeyFrame") {
							LC.publisher.onKeyFrame(dataObj);
						}
						if(dataObj.frametype == "PFrame") {
							LC.publisher.onPFrame(dataObj);
						}
						if(dataObj.frametype == "IFrame") {
							LC.publisher.onIFrame(dataObj);
						}		
						if(dataObj.frametype == "AudioChunk") {
							LC.publisher.onAudioChunk(dataObj);
						}
						if(dataObj.frametype == "TextMessage") {
							LC.publisher.onTextMessage(dataObj);
						}
						if(dataObj.frametype == "MetaData") {
							LC.publisher.onMetaData(dataObj);
						}
					}
				}
			};
			ws.onerror = function(data) {
				LC.publisher.log('WebSocket Error', JSON.stringify(data));
			};
			ws.onclose = function(data) {
				//LC.publisher.log('WebSocket','onclose');
				//LC.publisher.log('WebSocket', JSON.stringify(data));
				LC.publisher.onDisconnect();
			};
			LC.publisher.sock = ws;
		} catch (e) {
			LC.publisher.log('initSock', e);
		}
    },
	sourceSelected: function (audioSource, videoSource) {
		var audioConfig = {
			audio: {
				sampleRate: LC.publisher.tx.TxAudioSampleRate,
				sourceId: audioSource
			},
		};
		var videoConfig = {
			video: {
				width: LC.publisher.tx.TxVideoWidth,
				height: LC.publisher.tx.TxVideoHeight,
				sourceId: videoSource
			}
		 };
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
		window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
		if (navigator.getUserMedia) {
			navigator.getUserMedia({ audio: true } , LC.publisher.handleAudio, LC.publisher.streamError);
		} else {
			LC.publisher.log('Context AudioSource','disabled');
		}
		if (navigator.getUserMedia) {
			navigator.getUserMedia({ video: true } , LC.publisher.handleVideo, LC.publisher.streamError);
		} else {
			LC.publisher.log('Context VideoSource','disabled');
		}
	},
	handleStream: function(stream) {
		LC.publisher.log('handleStream','StreamSource init...');
		LC.publisher.handleAudio(stream);
		LC.publisher.handleVideo(stream);
	},
	handleVideo: function (stream) {
		if(LC.publisher.tx.TxVideo == true) {
			LC.publisher.log('handleVideo','VideoSource init...');
			LC.publisher.CameraVideo.src = window.URL.createObjectURL(stream);
			LC.publisher.CameraVideo.play();
			LC.publisher.CameraVideo.muted = 'true';
		} else {
			LC.publisher.log('handleVideo','VideoSource disabled');
		}
	},
	handleAudio: function (stream) {
		if( LC.publisher.tx.TxAudio == true) {
			LC.publisher.log('handleAudio','AudioSource init...');
			LC.publisher.MicrophoneVideo.src = window.URL.createObjectURL(stream);
			LC.publisher.MicrophoneVideo.play();
			LC.publisher.MicrophoneVideo.muted = 'true';
		
			LC.publisher.audioInputTX = LC.publisher.audioContext.createMediaStreamSource(stream);
			LC.publisher.audioRecorderTX = LC.publisher.audioContext.createScriptProcessor(LC.publisher.tx.TxAudioBufferSize, 1, 1);
			//Setup
			LC.publisher.audioAnalyzerTX = LC.publisher.audioContext.createAnalyser();
			LC.publisher.audioRecorderTX.onaudioprocess = LC.publisher.doAudioResample;
			LC.publisher.audioAnalyzerTX.fftSize = LC.publisher.tx.TxAudioBufferSize;
			//Connect
			LC.publisher.audioInputTX.connect(LC.publisher.audioAnalyzerTX); //Microphone -> analyzer(ftt) -> recorder(resample) -> Speaker
			LC.publisher.audioAnalyzerTX.connect(LC.publisher.audioRecorderTX);
			LC.publisher.audioRecorderTX.connect(LC.publisher.audioContext.destination);
		} else {
			LC.publisher.log('handleAudio','AudioSource disabled');
		}
	},
	streamError: function (e) {
		LC.publisher.log('streamError', e);
	},
	videoError: function (e) {
		LC.publisher.log('videoError', e);
	},
	audioError: function (e) {
		LC.publisher.log('audioError', e);
	},
	videoRecorder: function () {
		LC.publisher.CameraCanvasContext.drawImage(LC.publisher.CameraVideo, 0, 0, LC.publisher.tx.TxVideoWidth, LC.publisher.tx.TxVideoHeight);
		if(LC.publisher.CameraCanvas.toDataURL() == LC.publisher.blankCanvas.toDataURL()) {
			LC.publisher.doNoiseTX('No Camera!');
		} else {
			LC.publisher.videoEncoder();
		}
	},
	videoEncoder: function () {
		LC.publisher.TXframeSyncTimestamp = new Date().getTime();
		if(LC.publisher.tx.TxVideo == true){
			if(LC.publisher.frameCounter == 0) {
				LC.publisher.encodeKeyFrame();
			} else {
				if(LC.publisher.tx.TxVideoInterlaced == true) {
					LC.publisher.encodeIFrame(true);	
				} else {
					LC.publisher.encodePFrame(true);	
				}
			}
			LC.publisher.frameCounter++;
			if(LC.publisher.frameCounter > LC.publisher.tx.TxVideoKPS) {
				LC.publisher.frameCounter = 0;
			}
		} else {
			LC.publisher.doNoiseTX('Disabled!');
		}
	},
	encodeIFrame: function () {
		var lines = 0;
		if(LC.publisher.InterlacedMakroblocksEven == false) {
			for (var y = 0; y < LC.publisher.tx.TxVideoHeight; y += 2 ) {
				var newImg = LC.publisher.CameraCanvasContext.getImageData(0, y, LC.publisher.tx.TxVideoWidth, 1);
				LC.publisher.CameraCanvasTXContext.putImageData(newImg, 0, y);
				LC.publisher.TXInterlacedCanvasContext.putImageData(newImg,0,lines);
				lines++;
			}
			LC.publisher.InterlacedMakroblocksEven = true;
		} else {
			for (var y = 1; y < LC.publisher.tx.TxVideoHeight; y += 2 ) {
				var newImg = LC.publisher.CameraCanvasContext.getImageData(0, y, LC.publisher.tx.TxVideoWidth, 1);
				LC.publisher.CameraCanvasTXContext.putImageData(newImg, 0, y);
				LC.publisher.TXInterlacedCanvasContext.putImageData(newImg,0,lines);
				lines++;
			}
			LC.publisher.InterlacedMakroblocksEven = false;
		}	
		LC.publisher.IFrame = LC.publisher.TXInterlacedCanvas.toDataURL('Image/jpeg', LC.publisher.tx.TxVideoQuality);
		var data = {
			'frametype' : 'IFrame',
			'clientid': LC.publisher.tx.id,
			'Image': LC.publisher.IFrame,
			'Even': LC.publisher.InterlacedMakroblocksEven,
			'sync': LC.publisher.TXframeSyncTimestamp
		};
		if(LC.publisher.TXvideoQueue.length > LC.publisher.tx.TxVideoBuffers) {
			var vdata = LC.publisher.TXvideoQueue.shift();
			LC.publisher.log('encodeIFrame','DROP ' + vdata.frametype + '@TX TX-VIDEO BUFFER FULL');			
		}
		LC.publisher.TXvideoQueue.push(data);
	},
	encodePFrame: function () {
		var blockWidth =  LC.publisher.tx.TxVideoMBWidth;
		var blockHeight = LC.publisher.tx.TxVideoMBHeight;
		var blockcheck = (((blockWidth * blockHeight)*4)/2) + (blockWidth/2)*4;
		var length = (blockWidth * blockHeight)*4;
		var lu = 0;
		var ru = (blockWidth*4)-4;
		var ld = (((blockWidth*blockHeight))*4)-(blockWidth*4)-4;
		var rd = (((blockWidth*blockHeight))*4)-4;
		LC.publisher.TXMakroBlocksCanvasContext.clearRect(0, 0, LC.publisher.tx.TxVideoWidth, LC.publisher.tx.TxVideoHeight);
		for (var y = 0; y < LC.publisher.tx.TxVideoHeight; y += blockHeight ) {
			for (var x = 0; x < LC.publisher.tx.TxVideoWidth; x += blockWidth ) {
				var newImg = LC.publisher.CameraCanvasContext.getImageData(x, y, blockWidth, blockHeight);
				var keyImg = LC.publisher.CameraCanvasTXContext.getImageData(x, y, blockWidth, blockHeight);
				if( LC.publisher.colorDistance( 
										  newImg.data[(blockcheck)+0],
										  newImg.data[(blockcheck)+1],
										  newImg.data[(blockcheck)+2], 
										  keyImg.data[(blockcheck)+0],
										  keyImg.data[(blockcheck)+1],
										  keyImg.data[(blockcheck)+2]
										) < LC.publisher.tx.TxVideoMBDiff
		
						 )
				{
					//LC.publisher.CameraCanvasTXContext.putImageData(newImg,x,y);
				} else {
					/*
						newImg.data[(blockcheck)+0]= 255;
						newImg.data[(blockcheck)+1] = 0;
						newImg.data[(blockcheck)+2] = 0;
					*/
					LC.publisher.CameraCanvasTXContext.putImageData(newImg,x,y);				
					LC.publisher.TXMakroBlocksCanvasContext.putImageData(newImg,x,y);
				}
			}
		}
		LC.publisher.PFrame = LC.publisher.TXMakroBlocksCanvas.toDataURL('Image/jpeg', LC.publisher.tx.TxVideoQuality);
		var data = {
			'frametype' : 'PFrame',
			'clientid': LC.publisher.tx.id,
			'Image': LC.publisher.PFrame,
			'mbwidth': LC.publisher.tx.TxVideoMBWidth,
			'mbheight': LC.publisher.tx.TxVideoMBHeight,
			'sync': LC.publisher.TXframeSyncTimestamp
		};
		if(LC.publisher.TXvideoQueue.length > LC.publisher.tx.TxVideoBuffers) {
			var vdata = LC.publisher.TXvideoQueue.shift();
			LC.publisher.log('encodePFrame','DROP ' + vdata.frametype + '@TX TX-VIDEO BUFFER FULL');			
		}
		LC.publisher.TXvideoQueue.push(data);
	},
	encodeKeyFrame: function () {
		LC.publisher.KeyFrame = LC.publisher.CameraCanvas.toDataURL('Image/jpeg', LC.publisher.tx.TxVideoQuality);
		var ImageObj = new Image();
		ImageObj.src = LC.publisher.KeyFrame;
		ImageObj.onload = function () {
			LC.publisher.CameraCanvasTXContext.drawImage(ImageObj, 0, 0);
		}
		var data = {
			'frametype' : 'KeyFrame',
			'clientid': LC.publisher.tx.id,
			'Image': LC.publisher.KeyFrame,
			'sync': LC.publisher.TXframeSyncTimestamp
		};
		if(LC.publisher.TXvideoQueue.length > LC.publisher.tx.TxVideoBuffers) {
			var vdata = LC.publisher.TXvideoQueue.shift();
			LC.publisher.log('encodeKeyFrame','DROP ' + vdata.frametype + '@TX TX-VIDEO BUFFER FULL');			
		}
		LC.publisher.TXvideoQueue.push(data);
	},
	doAudioAnalyzerTX: function(){
			var barHeight = 30;
			var barWidth = 2;
			var flushBuf = new Uint8Array(LC.publisher.tx.TxAudioBufferSize);
			LC.publisher.audioAnalyzerTX.getByteFrequencyData(flushBuf);
			// calculate an overall volume value
			var total = 0;
			for (var i = 0; i < 80; i++) { // get the volume from the first 80 bins, else it gets too loud with treble
				total += flushBuf[i];
			}
			var vol = barHeight * (total / LC.publisher.tx.TxAudioBufferSize);
			var grd = LC.publisher.CameraCanvasRXContext.createLinearGradient(0,LC.publisher.tx.TxVideoHeight,1, LC.publisher.tx.TxVideoHeight - barHeight);
			grd.addColorStop(0,"green");
			grd.addColorStop(1,"red");
			LC.publisher.CameraCanvasTXContext.fillStyle = grd;
			LC.publisher.CameraCanvasTXContext.fillRect(LC.publisher.tx.TxVideoWidth-barWidth,LC.publisher.tx.TxVideoHeight - vol,LC.publisher.tx.TxVideoWidth,LC.publisher.tx.TxVideoHeight);
	},
	doAudioAnalyzerRX: function(){

			var barHeight = 30;
			var barWidth = 2;
			var flushBuf = new Uint8Array(LC.publisher.rx.RxAudioBufferSize);
			LC.publisher.audioAnalyzerRX.getByteFrequencyData(flushBuf);
			// calculate an overall volume value
			var total = 0;
			for (var i = 0; i < 80; i++) { // get the volume from the first 80 bins, else it gets too loud with treble
				total += flushBuf[i];
			}
			var vol = barHeight * (total / LC.publisher.rx.RxAudioBufferSize);
			var grd = LC.publisher.CameraCanvasRXContext.createLinearGradient(0,LC.publisher.rx.RxVideoHeight,1, LC.publisher.rx.RxVideoHeight - barHeight);
			grd.addColorStop(0,"green");
			grd.addColorStop(1,"red");
			LC.publisher.CameraCanvasRXContext.fillStyle = grd;
			LC.publisher.CameraCanvasRXContext.fillRect(LC.publisher.rx.RxVideoWidth-barWidth,LC.publisher.rx.RxVideoHeight - vol,LC.publisher.rx.RxVideoWidth,LC.publisher.rx.RxVideoHeight);
	},
	doAudioResample: function(e) {
		if(LC.publisher.TXchunkSyncTimestamp == null){
			LC.publisher.TXchunkSyncTimestamp = new Date().getTime();
		}
		var audioIn = e.inputBuffer;
		var rawSamples = e.inputBuffer.getChannelData(0);
		//Resample
		var resampledRaw = LC.publisher.resampler.resampler(rawSamples);
		if(LC.publisher.tx.TxVideo == true && LC.publisher.tx.TxAudio == true){
			for (var pos = 0; pos < resampledRaw.length; pos++) {
				LC.publisher.TXaudioBuffer[LC.publisher.TXaudioBufferPointer] = resampledRaw[pos];
				if(LC.publisher.TXaudioBufferPointer == LC.publisher.TXaudioFlushSize-1) {
					var data = {
						'frametype' : 'AudioChunk',
						'clientid': LC.publisher.tx.id,
						'chunk': LC.publisher.TXaudioBuffer,
						'sync': LC.publisher.TXchunkSyncTimestamp
					};
					if(LC.publisher.TXaudioQueue.length > LC.publisher.tx.TxAudioBuffers) {
						var vdata = LC.publisher.TXaudioQueue.shift();
						LC.publisher.log('doAudioResample','DROP ' + vdata.frametype + '@TX TX-AUDIO BUFFER FULL');			
					}
					LC.publisher.TXaudioQueue.push(data);
					LC.publisher.TXchunkSyncTimestamp = new Date().getTime();
					
					LC.publisher.TXaudioBuffer = new Float32Array(LC.publisher.TXaudioFlushSize);
					LC.publisher.TXaudioBufferPointer = 0;
				} else {
					LC.publisher.TXaudioBufferPointer++;
				}
			}
		}
	},
	encodeBinary : function (video,audio){
		if (audio == null) { 
			audio = {
				'frametype' : 'AudioChunk',
				'clientid': LC.publisher.tx.id,
				'chunk': new Float32Array(0),
				'sync': LC.publisher.TXchunkSyncTimestamp
			};
			
		}
		if (video == null) { 			
			video = {
				'frametype' : 'KeyFrame',
				'clientid': LC.publisher.tx.id,
				'Image': new Uint8Array(0),
				'sync': LC.publisher.TXframeSyncTimestamp
			};	
		}
		var PacketHeaderByteLength = 16;
		var VideoHeaderLength = 32;
		var VideoDataLength   = video.Image.length;
		var AudioHeaderLength = 32;
		var AudioDataLength   = (audio.chunk.length * 4);
		var HeaderByteLength  = 80;
		var PacketByteLength  = HeaderByteLength + VideoDataLength + AudioDataLength;
		var offset = 0;
		var buffer = new ArrayBuffer(PacketByteLength);
		//---PackerHeader
		var HTSbytes = new Float64Array(buffer,offset,1); 
		    HTSbytes[0] 	= new Date().getTime(); //8
			offset += 8;
		var HCIDbytes = new Uint32Array(buffer,offset,2); 
		    HCIDbytes[0] 	= LC.publisher.tx.id;   //4
			HCIDbytes[1] 	= LC.publisher.roomid;  //4
			offset += 8;
		//---Video Header
		var VTSbytes = new Float64Array(buffer,offset,1); 
		    VTSbytes[0] 	= video.sync;           //8
			offset += 8;
		var VOSbytes = new Uint32Array(buffer,offset,2);
		    VOSbytes[0] 	= HeaderByteLength + AudioDataLength; //4
			VOSbytes[1] 	= VideoDataLength;                    //4
			offset += 8;
		var Vbytes = new Uint8Array(buffer,offset,8); 
			Vbytes[0] = 0;										//1
			if(video.frametype == "KeyFrame") {
				Vbytes[0] = 0;      				
			} else if(video.frametype == "IFrame") {
				Vbytes[0] = 1;      
			} else if(video.frametype == "PFrame") {
				Vbytes[0] = 2;      
			}
			Vbytes[1] 		= LC.publisher.tx.TxVideoFPS; 		//1
			Vbytes[2] 		= video.Even; 						//1
			Vbytes[3] 		= LC.publisher.tx.TxVideoMBWidth;	//1
			Vbytes[4] 		= LC.publisher.tx.TxVideoMBHeight; 	//1
			Vbytes[5] 		= (LC.publisher.tx.TxVideoQuality*100);	//1 
			Vbytes[6] 		= LC.publisher.tx.TxVideoKPS;		//1
			Vbytes[7] 		= LC.publisher.tx.TxVideoMBDiff;	//1
			offset += 8;
		var VWHbytes = new Uint16Array(buffer,offset,4); 
			VWHbytes[0] 	= LC.publisher.tx.TxVideoWidth; 	//2
			VWHbytes[1] 	= LC.publisher.tx.TxVideoHeight; 	//2
			VWHbytes[2] 	= 0; 					//2
			VWHbytes[3] 	= 0; 					//2
			offset += 8;
		//---Audio Header
		var ATSbytes = new Float64Array(buffer,offset,1);
		    ATSbytes[0] 	= audio.sync;			//8
			offset += 8;
		var AOSbytes = new Uint32Array(buffer,offset,2);
		    AOSbytes[0] 	= HeaderByteLength;		//4
			AOSbytes[1] 	= AudioDataLength;		//4
			offset += 8;
		var Abytes = new Uint8Array(buffer,offset,8);  
			Abytes[0] 		= LC.publisher.tx.TxAudioBuffers;  //1
			Abytes[1] 		= LC.publisher.tx.TxAudioCPS; 	   //1
			Abytes[2] 		= 0; 					//1
			Abytes[3] 		= 0; 					//1
			Abytes[4] 		= 0; 					//1
			Abytes[5] 		= 0; 					//1
			Abytes[6] 		= 0; 					//1
			Abytes[7] 		= 0; 					//1
			offset += 8;
		var ASRbytes = new Uint32Array(buffer,offset,2);
		    ASRbytes[0] 	= LC.publisher.tx.TxAudioSampleRate; //4
			ASRbytes[1] 	= LC.publisher.tx.TxAudioBufferSize; //4
			offset += 8; 
		var ADbytes = new Float32Array(buffer, HeaderByteLength, AudioDataLength / 4);
		for (var i= 0; i< (AudioDataLength / 4); i++) {
			ADbytes[i] = audio.chunk[i];
		}
		var VDbytes = new Uint8Array(buffer, HeaderByteLength+AudioDataLength, VideoDataLength);
		for (var i= 0; i< VideoDataLength; i++) {
			VDbytes[i] = video.Image.charCodeAt(i);
		}
		//console.log('P -> :' + PacketByteLength + '[' + HeaderByteLength+'|'+AudioDataLength+'|'+VideoDataLength+'] =' + (HeaderByteLength+AudioDataLength+VideoDataLength) );
		LC.publisher.byteTX += PacketByteLength;
		return buffer;
	},
	decodeBinary: function(buffer){
		var PacketHeaderByteLength = 16;
		var VideoHeaderLength = 32;
		var VideoDataLength   = 0;
		var AudioHeaderLength = 32;
		var AudioDataLength   = 0;
		var HeaderByteLength  = 80;
		var PacketByteLength  = 0;
		var offset = 0;
		//Header 
		var HTSbytes = new Float64Array(buffer,offset,1);
			var HeaderTS = HTSbytes[0];
			offset += 8;
		var HCIDbytes = new Uint32Array(buffer,offset,2);
			var ClientID = HCIDbytes[0];
			var RoomID 	 = HCIDbytes[1];
			offset += 8;
		//---Video Header
		var VTSbytes = new Float64Array(buffer,offset,1);
			var VideoTS = VTSbytes[0];
			offset += 8;
		var VOSbytes = new Uint32Array(buffer,offset,2);
			VideoDataLength = VOSbytes[1];
			offset += 8;
		var Vbytes = new Uint8Array(buffer,offset,8);
			var VideoFrametype = "KeyFrame"; 
			if(Vbytes[0] == 0) {
				VideoFrametype = "KeyFrame"; 
			} else if(Vbytes[0] == 1) {
				VideoFrametype = "IFrame";   
			} else if(Vbytes[0] == 2) {
				VideoFrametype = "PFrame";  
			} 
			var VideoFPS        = Vbytes[1];
			var VideoEven 		= Vbytes[2];
			var	VideoMBWidth 	= Vbytes[3]; 	
			var	VideoMBHeight	= Vbytes[4]; 	
			//var VideoQuality    = (Vbytes[5]/100);
			//var VideoVideoKPS   = Vbytes[6];
			//var VideoMBDiff     = Vbytes[7];
			offset += 8;
		var VWHbytes = new Uint16Array(buffer,offset,4); 
			var VideoWidth 		= VWHbytes[0];
			var Videoheight 	= VWHbytes[1];
			offset += 8;
		//---Audio Header
		var ATSbytes = new Float64Array(buffer,offset,1);
			var AudioTS = VTSbytes[0];
			offset += 8;
		var AOSbytes = new Uint32Array(buffer,offset,2);
			AudioDataLength = AOSbytes[1];
			offset += 8;
		var Abytes = new Uint8Array(buffer,offset,8);
			offset += 8;
		var ASRbytes = new Uint32Array(buffer,offset,2);
			offset += 8; 
		//------
		PacketByteLength = HeaderByteLength+AudioDataLength+VideoDataLength;
		//------
		if(LC.publisher.rx.RxAudio == true) {
			if(AudioDataLength > 0) {
				var ADbytes = new Float32Array(buffer,HeaderByteLength,AudioDataLength / 4);
				var adata = {
					'frametype' : 'AudioChunk',
					'clientid'	: LC.publisher.rx.id,
					'chunk'		: ADbytes,
					'sync'		: AudioTS
				};
				LC.publisher.onAudioChunk(adata);
			}
		}
		//------
		if(LC.publisher.rx.RxVideo == true) {
			if(VideoDataLength > 0) {
				var VDbytes       = new Uint8Array(buffer,HeaderByteLength+AudioDataLength, VideoDataLength);
				var Videobinary       = '';
				for (var i = 0; i < VideoDataLength; i++) {
					Videobinary += String.fromCharCode( VDbytes[ i ] );
				}
				var vdata = {
					'frametype' : VideoFrametype,
					'clientid'	: LC.publisher.rx.id,
					'Image'		: Videobinary,
					'Even'		: VideoEven,
					'mbwidth'	: VideoMBWidth,
					'mbheight'	: VideoMBHeight,
					'sync'		: VideoTS
				};
				if(vdata.frametype == "KeyFrame") {
					//var k0 = performance.now();
					LC.publisher.onKeyFrame(vdata);
					//var k1 = performance.now();
					//LC.publisher.log('KeyFrame',k1-k0 + 'ms');
				} else if(vdata.frametype == "IFrame") {
					//var i0 = performance.now();
					LC.publisher.onIFrame(vdata);
					//var i1 = performance.now();
					//LC.publisher.log('IFrame',i1-i0 + 'ms');
				} else if(vdata.frametype == "PFrame") {
					//var p0 = performance.now();
					LC.publisher.onPFrame(vdata);
					//var p1 = performance.now();
					//LC.publisher.log('PFrame',p1-p0 + 'ms');
				}
			}
		}
		LC.publisher.byteRX += PacketByteLength;
		//console.log('P <-- :' + PacketByteLength + '[' + HeaderByteLength+'|'+AudioDataLength+'|'+VideoDataLength+'] =' + (HeaderByteLength+AudioDataLength+VideoDataLength) );
	},
	doTRX:function (){
		//LC.publisher.videoTimerRX = window.requestAnimationFrame(LC.publisher.doTRX);
		LC.publisher.TRXsyncTimestamp = new Date().getTime();
		var TRXsyncMS = LC.publisher.TRXsyncTimestamp - LC.publisher.TRXsyncLastTimestamp;
		//LC.publisher.log('TX', (LC.publisher.byteTX*8)/1000 + "kBit/s");
		$('#TX').html('TX</br>' + Math.ceil((LC.publisher.byteTX*8)/1000) + "kBit/s");
		LC.publisher.byteTX = 0;
		//LC.publisher.log('RX', (LC.publisher.byteRX*8)/1000 + "kBit/s");
		$('#RX').html('RX</br>' + Math.ceil((LC.publisher.byteRX*8)/1000) + "kBit/s");
		LC.publisher.byteRX = 0;
		LC.publisher.TRXsyncLastTimestamp = LC.publisher.TRXsyncTimestamp;
	},
	doTX: function () {
		//Timer
		LC.publisher.TXsyncTimestamp = new Date().getTime();
		var TXsyncMS = LC.publisher.TXsyncTimestamp - LC.publisher.TXsyncLastTimestamp;
		if(LC.publisher.TXsyncTimestampS == null){
			if(LC.publisher.TXaudioQueue.length > 0 && LC.publisher.TXsyncTimestampS == null) {
				LC.publisher.TXsyncTimestampS = LC.publisher.TXaudioQueue[0].sync;
				LC.publisher.log('TX', 'Sync');
			} 
			if(LC.publisher.TXvideoQueue.length > 0 && LC.publisher.TXsyncTimestampS == null) {
				LC.publisher.TXsyncTimestampS = LC.publisher.TXvideoQueue[0].sync;
				LC.publisher.log('TX', 'Sync');
			} 
		} else {
			LC.publisher.TXsyncTimestampS += TXsyncMS;
		}
		if(LC.publisher.connected == false || LC.publisher.clients <=1) {
			while(LC.publisher.TXaudioQueue.length >= LC.publisher.tx.TxAudioBuffers ) {
				var adata = LC.publisher.TXaudioQueue.shift();
				LC.publisher.TXsyncTimestampA = adata.sync;
			}
			while(LC.publisher.TXvideoQueue.length >= LC.publisher.tx.TxVideoBuffers ) {
				var vdata = LC.publisher.TXvideoQueue.shift();
				LC.publisher.TXsyncTimestampV = vdata.sync;
			}
		} else {
			//Audio
			var Adata = new Array();
			if(LC.publisher.TXaudioQueue.length >= LC.publisher.tx.TxAudioBuffers) {
				while(LC.publisher.TXaudioQueue.length >= LC.publisher.tx.TxAudioBuffers ) {
					var adata = LC.publisher.TXaudioQueue.shift();
					Adata.push(adata);
					LC.publisher.TXsyncTimestampA = adata.sync;
				}
			} else {
				LC.publisher.TXsyncTimestampA = LC.publisher.TXsyncTimestampS;
			}
			//Video
			var Vdata = new Array();
			if(LC.publisher.TXvideoQueue.length >= LC.publisher.tx.TxVideoBuffers) {
				while(LC.publisher.TXvideoQueue.length >= LC.publisher.tx.TxVideoBuffers ) {
					var vdata = LC.publisher.TXvideoQueue.shift();
					Vdata.push(vdata);
					LC.publisher.TXsyncTimestampV = vdata.sync;
				}
			} else {
				LC.publisher.TXsyncTimestampV = LC.publisher.TXsyncTimestampS;
			}
			//Binary Encode Queue
			while(Vdata.length > 0 || Adata.length > 0 ){
				if(Vdata.length > 0) {
					var Vbuf = Vdata.shift();
				} else {
					var Vbuf = null;
				}
				if(Adata.length > 0) {
					var Abuf = Adata.shift();
				} else {
					var Abuf = null;
				}
				var buffer = LC.publisher.encodeBinary(Vbuf,Abuf);
				LC.publisher.doX(buffer);
			}
			LC.publisher.TXsyncLastTimestamp = LC.publisher.TXsyncTimestamp;
	
		}
		//LC.publisher.doAudioAnalyzerTX();
		//LC.publisher.doBuffersTX();
	},
	doRX: function () {
		//LC.publisher.videoTimerRX = window.requestAnimationFrame(LC.publisher.doRX);
		LC.publisher.RXsyncTimestamp = new Date().getTime();
		var RXsyncMS = LC.publisher.RXsyncTimestamp - LC.publisher.RXsyncLastTimestamp;
		if(LC.publisher.RXsyncTimestampS == null){
			if(LC.publisher.RXaudioQueue.length > 0 && LC.publisher.RXsyncTimestampS == null) {
				LC.publisher.RXsyncTimestampS = LC.publisher.RXaudioQueue[0].sync - 500;
				LC.publisher.log('RX', 'Sync');
			} 
			if(LC.publisher.RXvideoQueue.length > 0 && LC.publisher.RXsyncTimestampS == null) {
				LC.publisher.RXsyncTimestampS = LC.publisher.RXvideoQueue[0].sync - 500;
				LC.publisher.log('RX', 'Sync');
			} 
		} else {
			LC.publisher.RXsyncTimestampS += RXsyncMS;
		}
		if(LC.publisher.connected == false) {
			LC.publisher.doNoiseRX('Connecting...');
	
		} else if(LC.publisher.rx.RxVideo == false) {
			LC.publisher.doNoiseRX('Disabled!');
		} else {
			if(LC.publisher.RXvideoQueue.length == 0 && LC.publisher.RXaudioQueue.length == 0){
				LC.publisher.RXnoframe++;
				if(LC.publisher.RXnoframe > LC.publisher.rx.RxVideoFPS) {
					LC.publisher.doNoiseRX('Buffering...');
				}
			}
			
			if(LC.publisher.RXaudioQueue.length > 0) {
				var Async = LC.publisher.RXaudioQueue[0].sync;
				if( Async > (LC.publisher.RXsyncTimestampS - (1000/LC.publisher.rx.RxAudioCPS)) ){
					if( Async < LC.publisher.RXsyncTimestampS){			
						var adata = LC.publisher.RXaudioQueue.shift();
						LC.publisher.audioPlayer.addChunk(adata.chunk);
						LC.publisher.RXsyncTimestampA += LC.publisher.ChunkMS;
						//LC.publisher.log('doRX', 'play ' + (adata.sync - LC.publisher.RXsyncTimestampS));
					} else {
						//LC.publisher.RXsyncTimestampA += RXsyncMS;
						LC.publisher.ASyncCnt++;
						//LC.publisher.log('doRX', 'wait ' + (LC.publisher.RXaudioQueue[0].sync - LC.publisher.RXsyncTimestampS));
					}
					LC.publisher.ASyncCnt = 0;
				} else {
					while(LC.publisher.RXaudioQueue.length > 0 ) {
						var Async = LC.publisher.RXaudioQueue[0].sync;
						if	(Async < LC.publisher.RXsyncTimestampS) {
							var adata = LC.publisher.RXaudioQueue.shift();
							LC.publisher.log('RX', 'DROP CHUNK ' + (adata.sync - LC.publisher.RXsyncTimestampS));
							LC.publisher.ASyncCnt++;
						} else {
							break;
						}
					};
					LC.publisher.RXsyncTimestampA += RXsyncMS;
				}
				RXnoframe = 0;
			} else {
				LC.publisher.RXsyncTimestampA = LC.publisher.RXsyncTimestampS;
			}
			if(LC.publisher.RXvideoQueue.length > 0 ){
				var Vsync = LC.publisher.RXvideoQueue[0].sync + LC.publisher.RXsyncAV;
				if( Vsync > (LC.publisher.RXsyncTimestampS - (1000/LC.publisher.rx.RxVideoFPS))){
					if( Vsync < (LC.publisher.RXsyncTimestampS + LC.publisher.RXsyncAV)){			
						var vdata = LC.publisher.RXvideoQueue.shift();
						LC.publisher.CameraCanvasRXContext.putImageData(vdata.image,0,0);
						LC.publisher.RXsyncTimestampV = Vsync;
						//LC.publisher.log('doRX', 'play ' + (vdata.sync - LC.publisher.RXsyncTimestampS));
					} else {
						//LC.publisher.RXsyncTimestampV += RXsyncMS;
						LC.publisher.VSyncCnt++;
						//LC.publisher.log('doRX', 'wait ' + (Vsync - LC.publisher.RXsyncTimestampS));
					}
					LC.publisher.VSyncCnt = 0;
				} else {
					while(LC.publisher.RXvideoQueue.length > 0  ) {
						var Vsync = LC.publisher.RXvideoQueue[0].sync + LC.publisher.RXsyncAV;
						if( Vsync < LC.publisher.RXsyncTimestampS) {
							var vdata = LC.publisher.RXvideoQueue.shift();
							LC.publisher.log('doRX', 'DROP FRAME' + (Vsync - LC.publisher.RXsyncTimestampS));
							LC.publisher.VSyncCnt++;
						} else {
							break;
						}
					};
					LC.publisher.RXsyncTimestampV += RXsyncMS;
				}
				RXnoframe = 0;
			} else {
				LC.publisher.RXsyncTimestampV = LC.publisher.RXsyncTimestampS;
			}
			if(LC.publisher.VSyncCnt > LC.publisher.rx.RxVideoFPS || LC.publisher.ASyncCnt > LC.publisher.rx.RxAudioCPS){
				LC.publisher.VSyncCnt = 0;
				LC.publisher.ASyncCnt = 0;
				LC.publisher.RXsyncTimestampS = null;
				while(LC.publisher.RXaudioQueue.length > 0 ) {
					var vdata = LC.publisher.RXaudioQueue.shift();
				}
				LC.publisher.RXsyncTimestampA = null;
				while(LC.publisher.RXvideoQueue.length > 0 ) {
					var vdata = LC.publisher.RXvideoQueue.shift();
				}
				LC.publisher.RXsyncTimestampV = null;
				LC.publisher.log('RX', 'Sync ' + RXsyncMS);
			}
			LC.publisher.RXsyncLastTimestamp = LC.publisher.RXsyncTimestamp;
		}
		//LC.publisher.doAudioAnalyzerRX();
		//LC.publisher.doBuffersRX();
	},
	doBuffersTX: function(){
		LC.publisher.CameraCanvasTXContext.beginPath();
		LC.publisher.CameraCanvasTXContext.moveTo(10,10);
		LC.publisher.CameraCanvasTXContext.lineTo(10,LC.publisher.tx.TxVideoHeight-10);
		
		LC.publisher.CameraCanvasTXContext.moveTo(5,10);
		LC.publisher.CameraCanvasTXContext.lineTo(15,10);
		
		LC.publisher.CameraCanvasTXContext.moveTo(5,LC.publisher.tx.TxVideoHeight/2);
		LC.publisher.CameraCanvasTXContext.lineTo(10,LC.publisher.tx.TxVideoHeight/2);
		
		LC.publisher.CameraCanvasTXContext.moveTo(5,LC.publisher.tx.TxVideoHeight-10);
		LC.publisher.CameraCanvasTXContext.lineTo(15,LC.publisher.tx.TxVideoHeight-10);
		
		LC.publisher.CameraCanvasTXContext.strokeStyle = "#ff0000";
		LC.publisher.CameraCanvasTXContext.stroke();
		
		LC.publisher.CameraCanvasTXContext.beginPath();
		var m = LC.publisher.tx.TxVideoHeight/2;
		var vp = m - (LC.publisher.TXvideoQueue.length/LC.publisher.rx.RxVideoBuffers) * (m/LC.publisher.rx.RxVideoBuffers)*4;
		LC.publisher.CameraCanvasTXContext.moveTo(5,vp);
		LC.publisher.CameraCanvasTXContext.lineTo(15,vp);
		LC.publisher.CameraCanvasTXContext.strokeStyle = "#00ff00";
		LC.publisher.CameraCanvasTXContext.stroke();
		
		LC.publisher.CameraCanvasTXContext.beginPath();
		var m = LC.publisher.tx.TxVideoHeight/2;
		var ap = m - (LC.publisher.TXaudioQueue.length/LC.publisher.rx.RxAudioBuffers) * (m/LC.publisher.rx.RxAudioBuffers)*4;
		LC.publisher.CameraCanvasTXContext.moveTo(5,ap);
		LC.publisher.CameraCanvasTXContext.lineTo(15,ap);
		LC.publisher.CameraCanvasTXContext.strokeStyle = "#00ffff";
		LC.publisher.CameraCanvasTXContext.stroke();
		
		//LC.publisher.CameraCanvasTXContext.font="20px Georgia";
		//LC.publisher.CameraCanvasTXContext.fillText(LC.publisher.TXsyncTimestampS-LC.publisher.TXsyncTimestampV,20,ap-10);
		//LC.publisher.CameraCanvasTXContext.fillText(LC.publisher.TXsyncTimestampS-LC.publisher.TXsyncTimestampA,20,ap+10);
	
		/*
			var barHeight = 30;
			var barWidth = 10;
			var videoBufferBar = LC.publisher.TXvideoQueue.length * (LC.publisher.tx.TxVideoFPS / LC.publisher.tx.TxVideoHeight) * barHeight;
			var videoGrd = LC.publisher.CameraCanvasTXContext.createLinearGradient(0,LC.publisher.tx.TxVideoHeight,1, LC.publisher.tx.TxVideoHeight - barHeight);
			videoGrd.addColorStop(0,"green");
			videoGrd.addColorStop(1,"orange");
			LC.publisher.CameraCanvasTXContext.fillStyle = videoGrd;
			LC.publisher.CameraCanvasTXContext.fillRect(0,  LC.publisher.tx.TxVideoHeight - videoBufferBar, barWidth, LC.publisher.tx.TxVideoHeight);
			var audioBufferBar = LC.publisher.TXaudioQueue.length * (LC.publisher.tx.TxAudioBuffers / LC.publisher.tx.TxVideoHeight) * barHeight;
			var audioGrd = LC.publisher.CameraCanvasTXContext.createLinearGradient(0,LC.publisher.tx.TxVideoHeight,1, LC.publisher.tx.TxVideoHeight - barHeight);
			audioGrd.addColorStop(0,"blue");
			audioGrd.addColorStop(1,"red");
			LC.publisher.CameraCanvasTXContext.fillStyle = audioGrd;
			LC.publisher.CameraCanvasTXContext.fillRect(10, LC.publisher.tx.TxVideoHeight - audioBufferBar, barWidth, LC.publisher.tx.TxVideoHeight);
		*/
	},
	doBuffersRX: function(){
		
		LC.publisher.CameraCanvasRXContext.beginPath();
		LC.publisher.CameraCanvasRXContext.moveTo(10,10);
		LC.publisher.CameraCanvasRXContext.lineTo(10,LC.publisher.rx.RxVideoHeight-10);
		
		LC.publisher.CameraCanvasRXContext.moveTo(5,10);
		LC.publisher.CameraCanvasRXContext.lineTo(15,10);
		
		LC.publisher.CameraCanvasRXContext.moveTo(5,LC.publisher.rx.RxVideoHeight/2);
		LC.publisher.CameraCanvasRXContext.lineTo(10,LC.publisher.rx.RxVideoHeight/2);
		
		LC.publisher.CameraCanvasRXContext.moveTo(5,LC.publisher.rx.RxVideoHeight-10);
		LC.publisher.CameraCanvasRXContext.lineTo(15,LC.publisher.rx.RxVideoHeight-10);
		
		LC.publisher.CameraCanvasRXContext.strokeStyle = "#ff0000";
		LC.publisher.CameraCanvasRXContext.stroke();
		
		LC.publisher.CameraCanvasRXContext.beginPath();
		var m = LC.publisher.rx.RxVideoHeight/2;
		var vp = m - (LC.publisher.RXvideoQueue.length/LC.publisher.rx.RxVideoBuffers) * (m/LC.publisher.rx.RxVideoBuffers)*4;
		LC.publisher.CameraCanvasRXContext.moveTo(5,vp);
		LC.publisher.CameraCanvasRXContext.lineTo(15,vp);
		LC.publisher.CameraCanvasRXContext.strokeStyle = "#00ff00";
		LC.publisher.CameraCanvasRXContext.stroke();
		
		LC.publisher.CameraCanvasRXContext.beginPath();
		var m = LC.publisher.rx.RxVideoHeight/2;
		var ap = m - (LC.publisher.RXaudioQueue.length/LC.publisher.rx.RxAudioBuffers) * (m/LC.publisher.rx.RxAudioBuffers)*4;
		LC.publisher.CameraCanvasRXContext.moveTo(5,ap);
		LC.publisher.CameraCanvasRXContext.lineTo(15,ap);
		LC.publisher.CameraCanvasRXContext.strokeStyle = "#00ffff";
		LC.publisher.CameraCanvasRXContext.stroke();
		
		//LC.publisher.CameraCanvasRXContext.font="20px Georgia";
		//LC.publisher.CameraCanvasRXContext.fillText(LC.publisher.RXsyncTimestampS-LC.publisher.RXsyncTimestampV,20,ap-10);
		//LC.publisher.CameraCanvasRXContext.fillText(LC.publisher.RXsyncTimestampS-LC.publisher.RXsyncTimestampA,20,ap+10);
		
		/*
			var barHeight = 30;
			var barWidth = 10;
			var videoBufferBar = LC.publisher.RXvideoQueue.length * (LC.publisher.rx.RxVideoFPS / LC.publisher.rx.RxVideoHeight) * barHeight;
			var videoGrd = LC.publisher.CameraCanvasRXContext.createLinearGradient(0,LC.publisher.rx.RxVideoHeight,1, LC.publisher.rx.RxVideoHeight - barHeight);
			videoGrd.addColorStop(0,"green");
			videoGrd.addColorStop(1,"orange");
			LC.publisher.CameraCanvasRXContext.fillStyle = videoGrd;
			LC.publisher.CameraCanvasRXContext.fillRect(0,  LC.publisher.rx.RxVideoHeight - videoBufferBar, barWidth, LC.publisher.rx.RxVideoHeight);
			var audioBufferBar = LC.publisher.RXaudioQueue.length * (LC.publisher.rx.RxAudioBuffers / LC.publisher.rx.RxVideoHeight) * barHeight;
			var audioGrd = LC.publisher.CameraCanvasRXContext.createLinearGradient(0,LC.publisher.rx.RxVideoHeight,1, LC.publisher.rx.RxVideoHeight - barHeight);
			audioGrd.addColorStop(0,"blue");
			audioGrd.addColorStop(1,"red");
			LC.publisher.CameraCanvasRXContext.fillStyle = audioGrd;
			LC.publisher.CameraCanvasRXContext.fillRect(10, LC.publisher.rx.RxVideoHeight - audioBufferBar, barWidth, LC.publisher.rx.RxVideoHeight);
		*/
	},
	doNoiseRX: function(text){
				var	idata = LC.publisher.CameraCanvasRXContext.getImageData(0,0,LC.publisher.rx.RxVideoWidth, LC.publisher.rx.RxVideoHeight);
				var	buffer32 = new Uint8Array(idata.data.buffer);
				if(LC.publisher.InterlacedMakroblocksEven == false) {
					for (var y = 1; y < LC.publisher.rx.RxVideoHeight; y += 2 ) {
						for (var x = 0; x < LC.publisher.rx.RxVideoWidth; x += 1 ) {
							var gray = Math.random()*70|0;
							var pp = (y * LC.publisher.rx.RxVideoWidth + x) * 4;
							buffer32[pp]   = gray;
							buffer32[pp+1] = gray;
							buffer32[pp+2] = gray;
							buffer32[pp+3] = 255;
						}
					}
				}
				if(LC.publisher.InterlacedMakroblocksEven == true) {
					for (var y = 0; y < LC.publisher.rx.RxVideoHeight; y += 2 ) {
						for (var x = 0; x < LC.publisher.rx.RxVideoWidth; x += 1 ) {
							var gray = Math.random()*40|0;
							var pp = (y * LC.publisher.rx.RxVideoWidth + x) * 4;
							buffer32[pp]   = gray;
							buffer32[pp+1] = gray;
							buffer32[pp+2] = gray;
							buffer32[pp+3] = 255;
						}
					}
				}
				var start = LC.publisher.RXscanline;
				var stop = LC.publisher.RXscanline + 20;
				if(stop > LC.publisher.rx.RxVideoHeight ){
					stop = LC.publisher.rx.RxVideoHeight;
				}
				for (var y = 0 + start; y < stop; y += 1 ) {
					for (var x = 0; x < LC.publisher.rx.RxVideoWidth; x += 1 ) {
						var gray = Math.random()*100|0;
						var pp = (y * LC.publisher.rx.RxVideoWidth + x) * 4;
						buffer32[pp]   = gray;
						buffer32[pp+1] = gray;
						buffer32[pp+2] = gray;
						buffer32[pp+3] = 255;
					}
				}
				LC.publisher.RXscanline += 5;
				if(LC.publisher.RXscanline > LC.publisher.rx.RxVideoHeight) {
					LC.publisher.RXscanline = 0;
				}
			
				LC.publisher.CameraCanvasRXContext.putImageData(idata, 0, 0);
				LC.publisher.CameraCanvasRXContext.fillStyle = "#ff0000";
				LC.publisher.CameraCanvasRXContext.font="20px Georgia";
				var txtw = LC.publisher.CameraCanvasRXContext.measureText(text).width;
				LC.publisher.CameraCanvasRXContext.fillText(text,(LC.publisher.rx.RxVideoWidth/2)-(txtw/2),(LC.publisher.rx.RxVideoHeight/2)+10);
	},
	doNoiseTX: function(text){
				var	idata = LC.publisher.CameraCanvasTXContext.getImageData(0,0,LC.publisher.tx.TxVideoWidth, LC.publisher.tx.TxVideoHeight);
				var	buffer32 = new Uint8Array(idata.data.buffer);
				if(LC.publisher.InterlacedMakroblocksEven == false) {
					for (var y = 1; y < LC.publisher.tx.TxVideoHeight; y += 2 ) {
						for (var x = 0; x < LC.publisher.tx.TxVideoWidth; x += 1 ) {
							var gray = Math.random()*70|0;
							var pp = (y * LC.publisher.tx.TxVideoWidth + x) * 4;
							buffer32[pp]   = gray;
							buffer32[pp+1] = gray;
							buffer32[pp+2] = gray;
							buffer32[pp+3] = 255;
						}
					}
				}
				if(LC.publisher.InterlacedMakroblocksEven == true) {
					for (var y = 0; y < LC.publisher.tx.TxVideoHeight; y += 2 ) {
						for (var x = 0; x < LC.publisher.tx.TxVideoWidth; x += 1 ) {
							var gray = Math.random()*40|0;
							var pp = (y * LC.publisher.tx.TxVideoWidth + x) * 4;
							buffer32[pp]   = gray;
							buffer32[pp+1] = gray;
							buffer32[pp+2] = gray;
							buffer32[pp+3] = 255;
						}
					}
				}
				var start = LC.publisher.TXscanline;
				var stop = LC.publisher.TXscanline + 20;
				if(stop > LC.publisher.tx.TxVideoHeight ){
					stop = LC.publisher.tx.TxVideoHeight;
				}
				for (var y = 0 + start; y < stop; y += 1 ) {
					for (var x = 0; x < LC.publisher.tx.TxVideoWidth; x += 1 ) {
						var gray = Math.random()*100|0;
						var pp = (y * LC.publisher.tx.TxVideoWidth + x) * 4;
						buffer32[pp]   = gray;
						buffer32[pp+1] = gray;
						buffer32[pp+2] = gray;
						buffer32[pp+3] = 255;
					}
				}
				LC.publisher.TXscanline += 5;
				if(LC.publisher.TXscanline > LC.publisher.tx.TxVideoHeight) {
					LC.publisher.TXscanline = 0;
				}
				LC.publisher.CameraCanvasTXContext.putImageData(idata, 0, 0);
				LC.publisher.CameraCanvasTXContext.fillStyle = "#ff0000";
				LC.publisher.CameraCanvasTXContext.font="20px Georgia";
				var txtw = LC.publisher.CameraCanvasTXContext.measureText(text).width;
				LC.publisher.CameraCanvasTXContext.fillText(text,(LC.publisher.tx.TxVideoWidth/2)-(txtw/2),(LC.publisher.tx.TxVideoHeight/2)+10);
	},
	doJoin: function(data){
		LC.publisher.sock.send(JSON.stringify(data),{mask: true});
	},
	doPacket: function(data){
		LC.publisher.sock.send(JSON.stringify(data),{mask: true});
	},
	doX: function(data){
		LC.publisher.sock.send(data, {mask: true});
	},
	doSyncFrame: function(data){
		LC.publisher.sock.send(data,{mask: true});
	},
	doKeyFrame: function(data){
		LC.publisher.sock.send(JSON.stringify(data),{mask: true});
	},
	doIFrame: function(data){
		LC.publisher.sock.send(JSON.stringify(data),{mask: true});
	},
	doPFrame: function(data){
		LC.publisher.sock.send(JSON.stringify(data),{mask: true});
	},
	doAudioChunk: function(data){
		LC.publisher.sock.send(JSON.stringify(data),{mask: true});
	},
	doTextMessage: function(data){
		LC.publisher.sock.send(JSON.stringify(data),{mask: true});
	},
	doMetaData: function(data){
		LC.publisher.sock.send(JSON.stringify(data),{mask: true});
	},
	onConnect:function(){
		try {
			LC.publisher.connected = true;
			LC.publisher.log('WebSocket','connected');	
			
			var logid = LC.publisher.uniqueId();
			jQuery('#chattext').val('');
			var line = jQuery('<div/>', { 'class': 'line system confirmed', 'id': logid });
				   jQuery('<div/>', { 'class': 'text',     'text': ' Connected...'  }).appendTo(line);
				   jQuery('<div/>', { 'class': 'chatleft', 'text': ' System' }).appendTo(line);
			line.appendTo('#chatstream');
			jQuery('#' + logid).fadeOut(2500,'easeInExpo', function(){ jQuery(this).remove(); });			
			var now = new Date().getTime();
			
			var data = {
				'frametype' : 'Join',
				'room': LC.publisher.room,
				'publisher': LC.publisher.publish,
				'subscriber': LC.publisher.subscribe,
				'codec' : LC.publisher.tx,
				'nickname': LC.publisher.nickname,
				'sync' : now,
			};
			LC.publisher.doJoin(data);
		} catch (e) {
			LC.publisher.log('WebSocket', e);
		}
    },
	onDisconnect:function(){
		try {
			LC.publisher.connected = false;
			
			var logid = LC.publisher.uniqueId();
			jQuery('#chattext').val('');
			var line = jQuery('<div/>', { 'class': 'line system confirmed', 'id': logid });
				   jQuery('<div/>', { 'class': 'text',     'text': ' Disconnected...'  }).appendTo(line);
				   jQuery('<div/>', { 'class': 'chatleft', 'text': ' System' }).appendTo(line);
			line.appendTo('#chatstream');
			jQuery('#' + logid).fadeOut(2500,'easeInExpo', function(){ jQuery(this).remove(); });			
			var now = new Date().getTime();
			
			setTimeout( function(){ LC.publisher.initSock(LC.publisher.server,LC.publisher.room,LC.publisher.nickname); }, 2500);
			LC.publisher.log('WebSocket','disconnected');
		} catch (e) {
			LC.publisher.log('WebSocket', e);
		}
    },
    onMetaData: function(data){
		try {
			//LC.publisher.log('onMetaData', JSON.stringify(data));
			if(data.init == "tx") {
				LC.publisher.publish = true;
				LC.publisher.tx.id = data.clientid;
				LC.publisher.tx.TxVideoWidth = data.codec.Video;
				LC.publisher.tx.TxVideoWidth = data.codec.VideoWidth;
				LC.publisher.tx.TxVideoHeight = data.codec.VideoHeight;
				LC.publisher.tx.TxVideoQuality = data.codec.VideoQuality;
				LC.publisher.tx.TxVideoFPS = data.codec.VideoFPS;
				LC.publisher.tx.TxVideoBuffers = data.codec.VideoBuffers;
				LC.publisher.tx.TxVideoKPS = data.codec.VideoKPS;
				LC.publisher.tx.TxVideoInterlaced = data.codec.VideoInterlaced;
				LC.publisher.tx.TxVideoMBWidth = data.codec.VideoMBWidth;
				LC.publisher.tx.TxVideoMBHeight = data.codec.VideoMBHeight;
				LC.publisher.tx.TxVideoMBDiff = data.codec.VideoMBDiff;
				LC.publisher.tx.TxAudio = data.codec.Audio;
				LC.publisher.tx.TxAudioSampleRate = data.codec.AudioSampleRate;
				LC.publisher.tx.TxAudioBufferSize = data.codec.AudioBufferSize;
				LC.publisher.tx.TxAudioCPS = data.codec.AudioCPS;
				LC.publisher.tx.TxAudioBuffers = data.codec.AudioBuffers;
				//LC.publisher.log('TX', JSON.stringify(LC.publisher.tx));
			}
			if(data.init == "rx") {
				LC.publisher.subscribe = true;
				LC.publisher.rx.id = data.clientid;
				LC.publisher.rx.RxVideoWidth = data.codec.Video;
				LC.publisher.rx.RxVideoWidth = data.codec.VideoWidth;
				LC.publisher.rx.RxVideoHeight = data.codec.VideoHeight;
				LC.publisher.rx.RxVideoQuality = data.codec.VideoQuality;
				LC.publisher.rx.RxVideoFPS = data.codec.VideoFPS;
				//LC.publisher.rx.RxVideoBuffers = data.codec.VideoBuffers;
				LC.publisher.rx.RxVideoKPS = data.codec.VideoKPS;
				LC.publisher.rx.RxVideoInterlaced = data.codec.VideoInterlaced;
				LC.publisher.rx.RxVideoMBWidth = data.codec.VideoMBWidth;
				LC.publisher.rx.RxVideoMBHeight = data.codec.VideoMBHeight;
				LC.publisher.rx.RxVideoMBDiff = data.codec.VideoMBDiff;
				LC.publisher.rx.RxAudio = data.codec.Audio;
				LC.publisher.rx.RxAudioSampleRate = data.codec.AudioSampleRate;
				LC.publisher.rx.RxAudioBufferSize = data.codec.AudioBufferSize;
				LC.publisher.rx.RxAudioCPS = data.codec.AudioCPS;
				//LC.publisher.rx.RxAudioBuffers = data.codec.AudioBuffers;
				//LC.publisher.log('RX', JSON.stringify(LC.publisher.rx));
			}
			LC.publisher.clients = data.clients;
			if(data.init == "trx" ) {
				LC.publisher.log('trx', JSON.stringify(data));
				LC.publisher.tx.id = data.clientid;
				LC.publisher.rx.id = data.clientid;
				LC.publisher.roomid = data.roomid;
				LC.publisher.clients = data.clients;
			} else if(data.init == "join" ) {	
				var line = jQuery('<div/>', { 'class': 'line system confirmed',  'id': data.metaid });
					jQuery('<div/>', { 'class': 'text',  'text': ' ' + data.text }).appendTo(line);
					jQuery('<div/>', { 'class': 'chatleft',  'text': 'System Message' }).appendTo(line);
				line.appendTo('#chatstream');
				jQuery('#' + data.metaid).fadeOut(2500,'easeInExpo', function(){ jQuery(this).remove(); });		
			}
		} catch (e) { 
			LC.publisher.log('onMetaData', e);
		}
    },
	onPacket: function(data){
		if(data.packet.length > 0) {
			for(var i = 0; i < data.packet.length; i++) {
				var pdata = data.packet.shift();
				if(pdata.frametype == "SyncFrame") {
					LC.publisher.onSyncFrame(pdata);
				}
				if(pdata.frametype == "KeyFrame") {
					LC.publisher.onKeyFrame(pdata);
				}
				if(pdata.frametype == "PFrame") {
					LC.publisher.onPFrame(pdata);
				}
				if(pdata.frametype == "IFrame") {
					LC.publisher.onIFrame(pdata);
				}
				if(pdata.frametype == "AudioChunk") {
					LC.publisher.onAudioChunk(pdata);
				}
				if(pdata.frametype == "TextMessage") {
					LC.publisher.onTextMessage(pdata);
				}
				if(pdata.frametype == "MetaData") {
					LC.publisher.onMetaData(pdata);
				}
				
			}
		}
	},
	onSyncFrame: function(data){
		LC.publisher.RXframeSyncTimestamp = data.sync;
		//console.log(data);	
    },
	onKeyFrame: function(data){
		LC.publisher.RXframeSyncTimestamp = data.sync;
		if(LC.publisher.rx.RxVideo == true) {
			if(LC.publisher.RXvideoQueue.length < LC.publisher.rx.RxVideoBuffers) {
				var ImageObj = new Image();
				ImageObj.src = data.Image;
				ImageObj.onload = function () {
					LC.publisher.RXKeyCanvasContext.drawImage(ImageObj, 0, 0);
					var KeyFrame = LC.publisher.RXKeyCanvasContext.getImageData(0,0,LC.publisher.rx.RxVideoWidth,LC.publisher.rx.RxVideoHeight);
					var data = {
						'image' : KeyFrame,
						'sync': LC.publisher.RXframeSyncTimestamp
					};
					LC.publisher.RXvideoQueue.push(data);
				};
			} else {
				LC.publisher.SyncCnt++;
				LC.publisher.log('onKeyFrame', 'DROP BUFFER FULL');
			}
		}
    },
	onIFrame: function(data){
		LC.publisher.RXframeSyncTimestamp = data.sync;
		if(LC.publisher.rx.RxVideo == true) {
			if(LC.publisher.RXvideoQueue.length < LC.publisher.rx.RxVideoBuffers) {
				var even = data.Even;
				var ImageObj = new Image();
				ImageObj.src = data.Image;
				ImageObj.onload = function () {
					LC.publisher.RXInterlacedCanvasContext.drawImage(ImageObj, 0, 0);
					/*
					var	iImg = LC.publisher.RXInterlacedCanvasContext.getImageData(0,0,LC.publisher.rx.RxVideoWidth, LC.publisher.rx.RxVideoHeight/2);
					var	ibuffer32 = new Uint8Array(iImg.data.buffer);
					var	keyImg = LC.publisher.RXKeyCanvasContext.getImageData(0,0,LC.publisher.rx.RxVideoWidth, LC.publisher.rx.RxVideoHeight);
					var	kbuffer32 = new Uint8Array(keyImg.data.buffer);
					if (data.Even == true){
						var lines = 0;
						for (var y = 0; y < LC.publisher.rx.RxVideoHeight; y += 2 ) {
							for (var x = 0; x < LC.publisher.rx.RxVideoWidth; x += 1 ) {
								var pp = (y * LC.publisher.rx.RxVideoWidth + x) * 4;
								var ppi = (lines * LC.publisher.rx.RxVideoWidth + x) * 4;
								kbuffer32[pp]   = ibuffer32[ppi];
								kbuffer32[pp+1] = ibuffer32[ppi+1];
								kbuffer32[pp+2] = ibuffer32[ppi+2];
								kbuffer32[pp+3] = 255;
							}
							lines++;
						}
					}
					if (data.Even == false){
						var lines = 0;
						for (var y = 1; y < LC.publisher.rx.RxVideoHeight; y += 2 ) {
							for (var x = 0; x < LC.publisher.rx.RxVideoWidth; x += 1 ) {
								var pp = (y * LC.publisher.rx.RxVideoWidth + x) * 4;
								var ppi = (lines * LC.publisher.rx.RxVideoWidth + x) * 4;
								kbuffer32[pp]   = ibuffer32[ppi];
								kbuffer32[pp+1] = ibuffer32[ppi+1];
								kbuffer32[pp+2] = ibuffer32[ppi+2];
								kbuffer32[pp+3] = 255;
							}
							lines++;
						}
					}
					LC.publisher.RXKeyCanvasContext.putImageData(keyImg,0,0);
					*/

					var lines = 0;
					if (even == true){
						for (var y = 0; y < LC.publisher.rx.RxVideoHeight; y += 2 ) {
							var newImg = LC.publisher.RXInterlacedCanvasContext.getImageData(0,lines,LC.publisher.rx.RxVideoWidth,1);
							LC.publisher.RXKeyCanvasContext.putImageData(newImg,0,y);
							lines++;
						}
					} 
					if (even == false){
						for (var y = 1; y < LC.publisher.rx.RxVideoHeight; y += 2 ) {
							var newImg = LC.publisher.RXInterlacedCanvasContext.getImageData(0,lines,LC.publisher.rx.RxVideoWidth,1);
							LC.publisher.RXKeyCanvasContext.putImageData(newImg,0,y);
							lines++;
						}
					} 
					
					var IFrame = LC.publisher.RXKeyCanvasContext.getImageData(0,0,LC.publisher.rx.RxVideoWidth,LC.publisher.rx.RxVideoHeight);
					var data = {
						'image' : IFrame,
						'sync': LC.publisher.RXframeSyncTimestamp
					};
					LC.publisher.RXvideoQueue.push(data);
				};
			} else {
				LC.publisher.SyncCnt++;
				LC.publisher.log('onIFrame', 'DROP');
			}
		}
	},
	onPFrame: function(data){
		LC.publisher.RXframeSyncTimestamp = data.sync;
		if(LC.publisher.rx.RxVideo == true) {
			if(LC.publisher.RXvideoQueue.length < LC.publisher.rx.RxVideoBuffers) {
				var mbwidth = data.mbwidth;
				var mbheight = data.mbheight;
				var ImageObj = new Image();
				ImageObj.src = data.Image;
				ImageObj.onload = function () {
					LC.publisher.RXMakroBlocksCanvasContext.drawImage(ImageObj, 0, 0);
					var blockWidth = mbwidth;
					var blockHeight = mbheight;
					var blockCheck = (((blockWidth) * (blockHeight)*4)/2)+((blockWidth/2)*4);
					var blockDiff = 25;//LC.publisher.tx.TxMBDiff;
					for (var y = 0; y < LC.publisher.rx.RxVideoHeight; y += blockHeight ) {
						for (var x = 0; x < LC.publisher.rx.RxVideoWidth; x += blockWidth ) {
							var newImg = LC.publisher.RXMakroBlocksCanvasContext.getImageData(x,y,blockWidth,blockHeight);
							var keyImg = LC.publisher.RXKeyCanvasContext.getImageData(x,y,blockWidth,blockHeight);
							if( LC.publisher.colorDistance( newImg.data[blockCheck+0],newImg.data[blockCheck+1],newImg.data[blockCheck+2], 0,0,0) > blockDiff) {
								LC.publisher.RXKeyCanvasContext.putImageData(newImg,x,y);
							}
						}
					}
					var PFrame = LC.publisher.RXKeyCanvasContext.getImageData(0,0,LC.publisher.rx.RxVideoWidth,LC.publisher.rx.RxVideoHeight);
					var data = {
						'image' : PFrame,
						'sync': LC.publisher.RXframeSyncTimestamp
					};
					LC.publisher.RXvideoQueue.push(data);
				};
			} else {
				LC.publisher.SyncCnt++;
				LC.publisher.log('onPFrame', 'DROP');
			}
		}
	},
	onAudioChunk: function(data){
		LC.publisher.RXchunkSyncTimestamp = data.sync;
		if(LC.publisher.rx.RxVideo == true && LC.publisher.rx.RxAudio == true) {
			if(LC.publisher.RXaudioQueue.length < LC.publisher.rx.RxAudioBuffers) {
				//Skip This, it's already Binary Float32Array
				/*
				var resampledRaw = new Float32Array(Object.keys(data.chunk).length);
				var ol = Object.keys(data.chunk).length;
				for (var i = 0; i < ol; ++i) {
					resampledRaw[i] = data.chunk[i];
				}
				var data = {
					'chunk' : resampledRaw,
					'sync': LC.publisher.RXchunkSyncTimestamp
				};
				*/
				LC.publisher.RXaudioQueue.push(data);
			} else {
				LC.publisher.SyncCnt++;
				LC.publisher.log('onAudioChunk', 'DROP');
			}
		}
    },
	onTextMessage: function(data){
		if( jQuery('#'+data.shoutid).length > 0) {
			LC.publisher.messageConfirm(data);
		} else {
			LC.publisher.messageReceive(data);
		}
    },
	colorDistance: function(r1,g1,b1,r2,g2,b2) {
		var d = Math.sqrt( Math.pow(r2-r1,2) + Math.pow(g2-g1,2) + Math.pow(b2-b1,2) );
		// Math.sqrt( Math.pow(255,2) + Math.pow(255,2) + Math.pow(255,2) );
		return d; 
	},
	getUniqueNickname: function (){
		var d = new Date().getTime();
		var uuid = 'GUEST_xxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return (c=='x' ? r : (r&0x7|0x8)).toString(16);
		});
	return uuid;
	},
	uniqueId:function(){
      var d = new Date().getTime();
      var uuid = 'GS-'+'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
      });
      return uuid;
    },
    log: function(func,data){
      try{
        console.log(func + ': ' + data);
		/*
		var logid = LC.publisher.uniqueId();
		 jQuery('#chattext').val('');
        var line = jQuery('<div/>', { 'class': 'line system confirmed', 'id': logid });
				   jQuery('<div/>', { 'class': 'text',     'text': ''  + data     }).appendTo(line);
				   jQuery('<div/>', { 'class': 'chatleft', 'text': ' ' + func }).appendTo(line);
        line.appendTo('#chatstream');
		//jQuery('#' + logid).fadeOut(2500,'easeInExpo', function(){ jQuery(this).remove(); });			
		jQuery('#chattext').focus();
		LC.publisher.guiCleanup();
		*/
      } catch(error){
        console={},
        console.log=function(a){}
      }
    },
	guiCleanup: function() {
      var cnt = jQuery('#chatstream').children('.line').length;
      jQuery('#chatstream').children('.line').each(function() {
        if(cnt > 15) {
            jQuery(this).fadeOut(2500,'easeInExpo', function(){
              jQuery(this).remove();
            });
            cnt--;
        } 
      });
    },
	join: function(nickname, room){
		try {
			if( nickname && room != "") {
				LC.publisher.nickname = nickname;
				LC.publisher.room = room;
			var now = new Date().getTime();
			var mdata = {
				'frametype' : 'Join',
				'room': LC.publisher.room,
				'publisher': LC.publisher.publish,
				'subscriber': LC.publisher.subscribe,
				'codec' : LC.publisher.tx,
				'nickname': LC.publisher.nickname,
				'sync' : now,
			};
			LC.publisher.doMetaData(mdata);
				jQuery("#chatnickname").addClass('disabled');
				jQuery("#chatjoin").addClass('disabled');
				jQuery("#joinchat").addClass('disabled');
				jQuery("#chatbutton").removeClass('disabled');
				jQuery("#chattext").removeClass('disabled');
				jQuery('#chattext').focus();
			} else {
				jQuery("#joinchat").removeClass('disabled');
				jQuery("#joinchat").removeClass('disabled');
				jQuery("#chatnickname").removeClass('disabled');
				jQuery("#chatjoin").removeClass('disabled');
				jQuery('#chatnickname').focus();
			}
		} catch (e) { 
			LC.publisher.log('join', e);
		}
	},
	messageSubmit: function(){
      if( jQuery('#chattext').val().length > 0 ) {
        var data = {
			'frametype' : 'TextMessage',
			'shoutid':  LC.publisher.uniqueId(), 
			'nickname': LC.publisher.nickname, 
			'room': LC.publisher.room, 
			'text': jQuery('#chattext').val()
        };
        jQuery('#chattext').val('');
        var line = jQuery('<div/>', { 'class': 'line mymessage unconfirmed', 'id': data.shoutid });
				   jQuery('<div/>', { 'class': 'text',     'text': ''  + data.text     }).appendTo(line);
				   jQuery('<div/>', { 'class': 'chatleft', 'text': ' ' + data.nickname }).appendTo(line);
        line.appendTo('#chatstream');
        LC.publisher.guiCleanup();
        jQuery('#chatbox').tinyscrollbar().tinyscrollbar_update('bottom');
        LC.publisher.doTextMessage(data);
      }
      if(LC.publisher.wait > 0) {
        jQuery('#chattext').focus();
        jQuery('#chatbutton').attr("disabled","disabled");
        var val = jQuery('#chatbutton').val();
        jQuery('#chatbutton').val('Warte ' + LC.publisher.wait);
        var sec = 1000;
        for (var i = LC.publisher.wait-1; i >= 1; i--){
          setTimeout('jQuery(\'#chatbutton\').val(\'Warte '+i+'\');',parseInt(sec));  
          sec += 1000;
        }
        setTimeout('jQuery(\'#chatbutton\').val(\''+val+'\');',parseInt(LC.publisher.wait) * 1000 );
        setTimeout('jQuery(\'#chatbutton\').removeAttr(\'disabled\');',parseInt(LC.publisher.wait) * 1000 );
        jQuery('#chattext').focus();
      }
    },
	messageConfirm: function(data){
      //LC.publisher.log('messageConfirm', JSON.stringify(data));
      jQuery('#'+data.shoutid).removeClass('unconfirmed');
      jQuery('#'+data.shoutid).addClass('confirmed');
    }, 
    messageReceive: function(data){
      jQuery('#chattext').focus();
      //LC.publisher.log('messageReceive', JSON.stringify(data));
        var line1 = jQuery('<div/>', { 'class': 'line message confirmed',  'id': data.shoutid,  'onclick': 'LC.publisher.reply(\''+data.nickname+'\');' });
			        jQuery('<div/>', { 'class': 'text',     'text': '' +  data.text     }).appendTo(line1);
			        jQuery('<div/>', { 'class': 'chatleft', 'text': ' ' + data.nickname }).appendTo(line1);
        line1.appendTo('#chatstream');   
      jQuery('#chattext').focus();
      LC.publisher.guiCleanup();
      jQuery('#chatbox').tinyscrollbar().tinyscrollbar_update('bottom');
    },
  };
  parent.publisher = publisher;
  return parent;
})(LC || {}, jQuery);