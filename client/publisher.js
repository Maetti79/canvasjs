$( document ).ready(function() {
	$("#CameraVideo1").hide();
	$("#CameraVideo1").prop("volume", 0);
	$('#chatnickname').val(LC.publisher.nickname);
});

function getUniqueNickname(){
  var d = new Date().getTime();
  var uuid = 'GUEST_xxxxxxx'.replace(/[xy]/g, function(c) {
    var r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return (c=='x' ? r : (r&0x7|0x8)).toString(16);
  });
  return uuid;
}

var LC = (function(parent, $) {
  var publisher = {
	sock: null,
	room: 'Dennis',
	nickname: getUniqueNickname(),
	publish: false,
	wait: 0,
	subscribe: false,
	//Audio
	audioContext: null,
	//Recording
	audioSource: null,
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
	CameraVideo: null, 		// WebCam + Microphone -> Video IN
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
	busy: false,
	
	initiated : false,
	
	SyncCnt : 0,
	RXsyncAV : 0,
	MSperSample : 0,
	
	tx : {
			'id': null, 
			//TX Video
			'TxVideo': true,
			'TxVideoWidth': 216,
			'TxVideoHeight': 160,
			'TxVideoQuality': 0.8,
			'TxVideoFPS': 16,
			'TxVideoBuffers' : 2,
			'TxVideoKPS': 8,
			'TxVideoInterlaced' : true,
			'TxVideoMBWidth': 8,
			'TxVideoMBHeight': 8,
			'TxVideoMBDiff': 10,
			//TX Audio
			'TxAudio': true,
			'TxAudioSampleRate': 8000,
			'TxAudioBufferSize': 1024*2,
			'TxAudioCPS': 8,
			'TxAudioBuffers': 2,
	},
	rx: {
			'id': null, 
			//Video
			'RxVideo': true,
			'RxVideoWidth': 214,
			'RxVideoHeight': 160,
			'RxVideoFPS': 16,
			'RxVideoBuffers' :32,
			//Audio
			'RxAudio': true,
			'RxAudioSampleRate': 8000,
			'RxAudioBufferSize': 1024*2,
			'RxAudioCPS': 8,
			'RxAudioBuffers': 16,
	},	
	initStreams: function(publish,subscribe) {	
		if(LC.publisher.initiated == false) {
			LC.publisher.publish = publish;
			LC.publisher.subscribe = subscribe;
			
			LC.publisher.CameraVideo = document.getElementById('CameraVideo1');			//Webcam -> VideoTag
			LC.publisher.CameraCanvas = document.createElement('canvas');	//CameraTimer -> VideoTag -> CameraCanvas
			LC.publisher.CameraCanvas.width = LC.publisher.tx.TxVideoWidth;
			LC.publisher.CameraCanvas.height = LC.publisher.tx.TxVideoHeight;
			LC.publisher.CameraCanvasContext = LC.publisher.CameraCanvas.getContext('2d'); 
			//TX
			LC.publisher.CameraCanvasTX = document.getElementById('CameraCanvasTX1'); 			//CameraCanvas -> Canvas Video OUT TX
			LC.publisher.CameraCanvasTX.width = LC.publisher.tx.TxVideoWidth;
			LC.publisher.CameraCanvasTX.height = LC.publisher.tx.TxVideoHeight;
			LC.publisher.CameraCanvasTXContext = LC.publisher.CameraCanvasTX.getContext('2d');
		
			LC.publisher.TXMakroBlocksCanvas = document.createElement('canvas');			//Macroblocks
			LC.publisher.TXMakroBlocksCanvas.width = LC.publisher.tx.TxVideoWidth;
			LC.publisher.TXMakroBlocksCanvas.height = LC.publisher.tx.TxVideoHeight;
			LC.publisher.TXMakroBlocksCanvasContext = LC.publisher.TXMakroBlocksCanvas.getContext('2d');
			
			LC.publisher.TXInterlacedCanvas = document.createElement('canvas');				//Interlaces Lines
			LC.publisher.TXInterlacedCanvas.width = LC.publisher.tx.TxVideoWidth;
			LC.publisher.TXInterlacedCanvas.height = LC.publisher.tx.TxVideoHeight/2;
			LC.publisher.TXInterlacedCanvasContext = LC.publisher.TXInterlacedCanvas.getContext('2d');
			
			LC.publisher.CameraCanvasRX = document.getElementById('CameraCanvasRX1'); 			//CameraCanvas -> Canvas Video In RX
			LC.publisher.CameraCanvasRX.width = LC.publisher.rx.RxVideoWidth;
			LC.publisher.CameraCanvasRX.height = LC.publisher.rx.RxVideoHeight;
			LC.publisher.CameraCanvasRXContext = LC.publisher.CameraCanvasRX.getContext('2d');
			
			LC.publisher.RXInterlacedCanvas = document.createElement('canvas');				//Interlaces Lines
			LC.publisher.RXInterlacedCanvas.width = LC.publisher.rx.RxVideoWidth;
			LC.publisher.RXInterlacedCanvas.height = LC.publisher.rx.RxVideoHeight/2;
			LC.publisher.RXInterlacedCanvasContext = LC.publisher.RXInterlacedCanvas.getContext('2d');
			
			LC.publisher.RXMakroBlocksCanvas = document.createElement('canvas');				//Interlaces Lines
			LC.publisher.RXMakroBlocksCanvas.width = LC.publisher.rx.RxVideoWidth;
			LC.publisher.RXMakroBlocksCanvas.height = LC.publisher.rx.RxVideoHeight;
			LC.publisher.RXMakroBlocksCanvasContext = LC.publisher.RXMakroBlocksCanvas.getContext('2d');
			
			LC.publisher.RXKeyCanvas = document.createElement('canvas');				//Interlaces Lines
			LC.publisher.RXKeyCanvas.width = LC.publisher.rx.RxVideoWidth;
			LC.publisher.RXKeyCanvas.height = LC.publisher.rx.RxVideoHeight;
			LC.publisher.RXKeyCanvasContext = LC.publisher.RXKeyCanvas.getContext('2d');
			//RX
			LC.publisher.audioContext = new (window.AudioContext || window.webkitAudioContext)(LC.publisher.tx.TxAudioSampleRate);		
			LC.publisher.log('Context AudioSampelRate', LC.publisher.audioContext.sampleRate + 'Hz');
			LC.publisher.resampler = new Resampler(LC.publisher.audioContext.sampleRate, LC.publisher.tx.TxAudioSampleRate, 1,  LC.publisher.tx.TxAudioBufferSize);
			LC.publisher.log('TX AudioSampleRate', LC.publisher.tx.TxAudioSampleRate + 'Hz');
			LC.publisher.log('RX AudioSampleRate', LC.publisher.rx.RxAudioSampleRate + 'Hz');
			
			LC.publisher.TXaudioFlushSize = Math.ceil(LC.publisher.tx.TxAudioSampleRate / LC.publisher.tx.TxAudioCPS);
			LC.publisher.TXaudioBuffer = new Float32Array(LC.publisher.TXaudioFlushSize);
			LC.publisher.RXaudioFlushSize = Math.ceil(LC.publisher.rx.RxAudioSampleRate / LC.publisher.rx.RxAudioCPS);
			LC.publisher.RXaudioBuffer = new Float32Array(LC.publisher.RXaudioFlushSize);
			LC.publisher.log('TX AudioBufferSize', LC.publisher.tx.TxAudioBufferSize + 'byte/s');
			LC.publisher.log('RX AudioBufferSize', LC.publisher.rx.RxAudioBufferSize + 'byte/s');
			LC.publisher.log('TX AudioFlushSize', LC.publisher.TXaudioFlushSize + 'byte');
			LC.publisher.log('RX AudioFlushSize', LC.publisher.RXaudioFlushSize + 'byte');
			LC.publisher.log('Engige AudioChunks', (LC.publisher.tx.TxAudioSampleRate / LC.publisher.TXaudioFlushSize) + ' /s');
			LC.publisher.RXsyncAV = (1000/(LC.publisher.rx.RxAudioSampleRate / LC.publisher.RXaudioFlushSize))*LC.publisher.rx.RxAudioBuffers;
			LC.publisher.log('Engige AVSyncDelay', LC.publisher.RXsyncAV + '/ms');
			LC.publisher.SampleMS = (1000/LC.publisher.rx.RxAudioSampleRate); 
			LC.publisher.log('Engige SampleMS', LC.publisher.SampleMS + '/ms');
			LC.publisher.ChunkMS = LC.publisher.SampleMS * LC.publisher.RXaudioFlushSize;
			LC.publisher.log('Engige ChunkMS', LC.publisher.ChunkMS + '/ms');
			
			if( publish == true && LC.publisher.videoTimerTX == null){
				LC.publisher.CameraTimer = setInterval(LC.publisher.videoRecorder, (1000/LC.publisher.tx.TxVideoFPS));
				LC.publisher.log('Context Webcam Timer', (1000/LC.publisher.tx.TxVideoFPS) + 'ms');
				LC.publisher.videoTimerTX = setInterval(LC.publisher.doTX, (1000/LC.publisher.tx.TxVideoFPS));
				LC.publisher.log('TX VideoTimer', (1000/LC.publisher.tx.TxVideoFPS) + 'ms');
			} else {
				//$("#CameraCanvasTX1").hide();
			}
			if( subscribe == true && LC.publisher.videoTimerRX == null) {
				LC.publisher.videoTimerRX = setInterval(LC.publisher.doRX, (1000/LC.publisher.rx.RxVideoFPS));
				LC.publisher.log('RX VideoTimer', (1000/LC.publisher.rx.RxVideoFPS) + 'ms');
			} else {
				//$("#CameraCanvasRX1").hide();
			}
		}
		
		if( publish == true && LC.publisher.initiated == false ){
			/*
			$("#MicrophoneSelect").empty();
							$("#MicrophoneSelect").on('change', function() {
								LC.publisher.videoSource = $("#CameraSelect").val();
								LC.publisher.audioSource = $("#MicrophoneSelect").val();
								LC.publisher.sourceSelected(LC.publisher.audioSource, LC.publisher.videoSource);
							});
			$("#CameraSelect").empty();
			$("#CameraSelect").on('change', function() {
								LC.publisher.videoSource = $("#CameraSelect").val();
								LC.publisher.audioSource = $("#MicrophoneSelect").val();
								LC.publisher.sourceSelected(LC.publisher.audioSource, LC.publisher.videoSource);
							});
			*/
			MediaStreamTrack.getSources(function(sourceInfos) {
				for (var i = 0; i != sourceInfos.length; ++i) {
					var sourceInfo = sourceInfos[i];
					if (sourceInfo.kind === 'audio') {
						//LC.publisher.log('AudioDevice['+i+']', sourceInfo.id, sourceInfo.label || 'microphone');		
						/*						
							var ao = new Option( sourceInfo.label, sourceInfo.id);
							$(ao).html(sourceInfo.label);
							$("#MicrophoneSelect").append(ao);
						*/
						LC.publisher.audioSource = sourceInfo.id;
					} else if (sourceInfo.kind === 'video') {
						//LC.publisher.log('VideoDevice['+i+']', sourceInfo.id, sourceInfo.label || 'camera');
						/*
							var vo = new Option(sourceInfo.label, sourceInfo.id);
							$(vo).html(sourceInfo.label);
							$("#CameraSelect").append(vo);
						*/
						LC.publisher.videoSource = sourceInfo.id;
					} else {
					  LC.publisher.log('MediaDevice['+i+']', sourceInfo.id, sourceInfo.label || 'device');		
					}
				 }
				 LC.publisher.sourceSelected(LC.publisher.audioSource, LC.publisher.videoSource);
			});
		} else {
			 //LC.publisher.handleStream(null);
		}
		LC.publisher.log('Context TRX ', 'done!');
		//LC.publisher.doTRX();
		LC.publisher.initiated = true;
	},
	sourceSelected: function (audioSource, videoSource) {
	  var media = {
		audio: {
			sampleRate: LC.publisher.tx.TxAudioSampleRate,
			sourceId: audioSource
		},
		video: {
			width: LC.publisher.tx.TxVideoWidth,
			height: LC.publisher.tx.TxVideoHeight,
			sourceId: videoSource
		}
	  };
	  navigator.getUserMedia(media, LC.publisher.handleStream, LC.publisher.streamError);
	},
	handleStream: function(stream) {
		LC.publisher.log('handleStream','init Stream Mapping');
		LC.publisher.handleAudio(stream);
		LC.publisher.handleVideo(stream);
	},
	handleVideo: function (stream) {
		//LC.publisher.log('handleVideo','init Video Stream');
		if(LC.publisher.publish == true && LC.publisher.tx.TxVideo == true) {
			LC.publisher.CameraVideo.src = window.URL.createObjectURL(stream);
			LC.publisher.videoRecorder();
			LC.publisher.log('handleVideo','init TX Video');
		}
		if(LC.publisher.subscribe == true && LC.publisher.rx.RxVideo == true) {
			LC.publisher.log('handleVideo','init RX Video');
		}
	},
	handleAudio: function (stream) {
		//LC.publisher.log('handleAudio','init Audio Stream');
		//init audioRecorder
		if(LC.publisher.publish == true && LC.publisher.tx.TxAudio == true) {
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
			LC.publisher.log('handleAudio','init TX Audio');
		}
		if(LC.publisher.subscribe == true && LC.publisher.rx.RxAudio == true) {
			LC.publisher.audioAnalyzerRX = LC.publisher.audioContext.createAnalyser();
			LC.publisher.audioAnalyzerRX.fftSize = LC.publisher.rx.RxAudioBufferSize;
			LC.publisher.audioPlayer = new SoundBuffer(LC.publisher.audioContext, LC.publisher.rx.RxAudioSampleRate, LC.publisher.rx.RxAudioBuffers, LC.publisher.audioAnalyzerRX, false);
			LC.publisher.audioAnalyzerRX.connect(LC.publisher.audioContext.destination);
			LC.publisher.log('handleAudio','init RX Audio');
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
		LC.publisher.videoEncoder();
	},
	videoEncoder: function () {
		LC.publisher.TXframeSyncTimestamp = new Date().getTime();
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
	},
	encodeIFrame: function (force) {
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
	encodePFrame: function (force) {
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
		//Queue TX
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
	},
	doTRX:function (){
		//LC.publisher.videoTimerRX = window.requestAnimationFrame(LC.publisher.doTRX);
		LC.publisher.TRXsyncTimestamp = new Date().getTime();
		var TRXsyncMS = LC.publisher.TRXsyncTimestamp - LC.publisher.TRXsyncLastTimestamp;
		//LC.publisher.log('doTRX',TRXsyncMS);
		LC.publisher.TRXsyncLastTimestamp = LC.publisher.TRXsyncTimestamp;
		//LC.publisher.doRX();
		//LC.publisher.doTX();
	},
	doTX: function () {
		LC.publisher.TXsyncTimestamp = new Date().getTime();
		var TXsyncMS = LC.publisher.TXsyncTimestamp - LC.publisher.TXsyncLastTimestamp;
		if(LC.publisher.TXsyncTimestampS == null){
			if(LC.publisher.TXaudioQueue.length > 0 && LC.publisher.TXsyncTimestampS == null) {
				LC.publisher.TXsyncTimestampS = LC.publisher.TXaudioQueue[0].sync;
				LC.publisher.log('doTX', 'SET TXsyncTimestampS ' + LC.publisher.TXsyncTimestampS);
			} 
			if(LC.publisher.TXvideoQueue.length > 0 && LC.publisher.TXsyncTimestampS == null) {
				LC.publisher.TXsyncTimestampS = LC.publisher.TXvideoQueue[0].sync;
				LC.publisher.log('doTX', 'SET TXsyncTimestampS ' + LC.publisher.TXsyncTimestampS);
			} 
		} else {
			LC.publisher.TXsyncTimestampS += TXsyncMS;
		}
		//LC.publisher.doAudioAnalyzerTX();
		if(LC.publisher.TXaudioQueue.length >= LC.publisher.tx.TxAudioBuffers) {
			var adata = LC.publisher.TXaudioQueue.shift();
			LC.publisher.doAudioChunk(adata);
			LC.publisher.TXsyncTimestampA = adata.sync;
		} else {
			LC.publisher.TXsyncTimestampA = LC.publisher.TXsyncTimestampS;
		}
		if(LC.publisher.TXvideoQueue.length >= LC.publisher.tx.TxVideoBuffers) {
			var vdata = LC.publisher.TXvideoQueue.shift();
			if(vdata.frametype == "KeyFrame") {
				LC.publisher.doKeyFrame(vdata);
			}
			if(vdata.frametype == "PFrame") {
				LC.publisher.doPFrame(vdata);
			}
			if(vdata.frametype == "IFrame") {
				LC.publisher.doIFrame(vdata);
			}
			LC.publisher.TXsyncTimestampV = vdata.sync;
		} else {
			LC.publisher.TXsyncTimestampV = LC.publisher.TXsyncTimestampS;
		}
		LC.publisher.TXsyncLastTimestamp = LC.publisher.TXsyncTimestamp;
		//LC.publisher.doBuffersTX();
	},
	doRX: function () {
		LC.publisher.videoTimerRX = window.requestAnimationFrame(LC.publisher.doRX);
		LC.publisher.RXsyncTimestamp = new Date().getTime();
		var RXsyncMS = LC.publisher.RXsyncTimestamp - LC.publisher.RXsyncLastTimestamp;
		if(LC.publisher.RXsyncTimestampS == null){
			if(LC.publisher.RXaudioQueue.length > 0 && LC.publisher.RXsyncTimestampS == null) {
				LC.publisher.RXsyncTimestampS = LC.publisher.RXaudioQueue[0].sync - 500;
				LC.publisher.log('doRX', 'SET RXsyncTimestampS ' + LC.publisher.RXsyncTimestampS);
			} 
			if(LC.publisher.RXvideoQueue.length > 0 && LC.publisher.RXsyncTimestampS == null) {
				LC.publisher.RXsyncTimestampS = LC.publisher.RXvideoQueue[0].sync - 500;
				LC.publisher.log('doRX', 'SET RXsyncTimestampS ' + LC.publisher.RXsyncTimestampS);
			} 
		} else {
			LC.publisher.RXsyncTimestampS += RXsyncMS;
		}
		//LC.publisher.doAudioAnalyzerRX();
		if(LC.publisher.RXaudioQueue.length > 0) {
			if( (LC.publisher.RXaudioQueue[0].sync) > (LC.publisher.RXsyncTimestampS - (1000/LC.publisher.rx.RxAudioCPS)) ){
				if(LC.publisher.RXaudioQueue[0].sync < LC.publisher.RXsyncTimestampS){			
					var adata = LC.publisher.RXaudioQueue.shift();
					LC.publisher.audioPlayer.addChunk(adata.chunk);
					LC.publisher.RXsyncTimestampA = adata.sync;
					//LC.publisher.log('doRX', 'play ' + (adata.sync - LC.publisher.RXsyncTimestampS));
				} else {
					LC.publisher.RXsyncTimestampA += RXsyncMS;
					LC.publisher.SyncCnt++;
					//LC.publisher.log('doRX', 'wait ' + (LC.publisher.RXaudioQueue[0].sync - LC.publisher.RXsyncTimestampS));
				}
				LC.publisher.SyncCnt = 0;
			} else {
				while(LC.publisher.RXaudioQueue.length > 0 ) {
					if	(LC.publisher.RXaudioQueue[0].sync < LC.publisher.RXsyncTimestampS) {
						var adata = LC.publisher.RXaudioQueue.shift();
						LC.publisher.log('doRX', 'DROP CHUNK ' + (adata.sync - LC.publisher.RXsyncTimestampS));
						LC.publisher.SyncCnt++;
					} else {
						break;
					}
				};
				LC.publisher.RXsyncTimestampA += RXsyncMS;
			}
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
					LC.publisher.RXsyncTimestampV += RXsyncMS;
					LC.publisher.SyncCnt++;
					//LC.publisher.log('doRX', 'wait ' + (Vsync - LC.publisher.RXsyncTimestampS));
				}
				LC.publisher.SyncCnt = 0;
			} else {
				while(LC.publisher.RXvideoQueue.length > 0  ) {
					var Vsync = LC.publisher.RXvideoQueue[0].sync + LC.publisher.RXsyncAV;
					if( Vsync < LC.publisher.RXsyncTimestampS) {
						var vdata = LC.publisher.RXvideoQueue.shift();
						LC.publisher.log('doRX', 'DROP FRAME' + (Vsync - LC.publisher.RXsyncTimestampS));
						LC.publisher.SyncCnt++;
					} else {
						break;
					}
				};
				LC.publisher.RXsyncTimestampV += RXsyncMS;
			}
		} else {
			LC.publisher.RXsyncTimestampV = LC.publisher.RXsyncTimestampS;
		}
		if(LC.publisher.SyncCnt > LC.publisher.rx.RxVideoFPS || LC.publisher.SyncCnt > LC.publisher.rx.RxAudioCPS){
			LC.publisher.SyncCnt = 0;
			LC.publisher.RXsyncTimestampS = null;
			while(LC.publisher.RXaudioQueue.length > 0 ) {
				var vdata = LC.publisher.RXaudioQueue.shift();
			}
			LC.publisher.RXsyncTimestampA = null;
			while(LC.publisher.RXvideoQueue.length > 0 ) {
				var vdata = LC.publisher.RXvideoQueue.shift();
			}
			LC.publisher.RXsyncTimestampV = null;
			LC.publisher.log('doRX', 'SYNC ' + RXsyncMS);
		}
		
		LC.publisher.RXsyncLastTimestamp = LC.publisher.RXsyncTimestamp;
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
    initSock: function(sock, publish, subscribe){
		try {
			LC.publisher.log('initSock','Try to connect...');
			LC.publisher.publish = publish;
			LC.publisher.subscribe = subscribe;
			LC.publisher.sock = sock;
		} catch (e) {
			LC.publisher.log('initSock', e);
		}
    },
    onConnect:function(){
		try {
			LC.publisher.log('onConnect','Connected !');
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
			LC.publisher.log('onConnect', e);
		}
    },
	onDisconnect:function(){
		try {
			LC.publisher.log('onDisconnect','DisConnected !');
		} catch (e) {
			LC.publisher.log('onDisconnect', e);
		}
    },
	doJoin: function(data){
		LC.publisher.sock.send(JSON.stringify(data),{mask: true});
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
				LC.publisher.log('TX', JSON.stringify(LC.publisher.tx));
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
				LC.publisher.log('RX', JSON.stringify(LC.publisher.rx));
			}
			if(data.init == "trx" ) {
				LC.publisher.initStreams(LC.publisher.publish, LC.publisher.subscribe);
			}
			/*
			var line = jQuery('<div/>', { 'class': 'line system confirmed',  'id': data.metaid });
				jQuery('<div/>', { 'class': 'text',  'text': ' ' + data.text }).appendTo(line);
				jQuery('<div/>', { 'class': 'chatleft',  'text': 'System Message' }).appendTo(line);
			line.appendTo('#chatstream');
			jQuery('#' + data.metaid).fadeOut(2500,'easeInExpo', function(){ jQuery(this).remove(); });		
			*/
		} catch (e) { 
			LC.publisher.log('onMetaData', e);
		}
    },
	onKeyFrame: function(data){
			LC.publisher.RXframeSyncTimestamp = data.sync;
			if(LC.publisher.RXvideoQueue.length < LC.publisher.rx.RxVideoBuffers) {
				var ImageObj = new Image();
				ImageObj.src = data.Image;
				LC.publisher.RXKeyCanvasContext.drawImage(ImageObj, 0, 0);
				var KeyFrame = LC.publisher.RXKeyCanvasContext.getImageData(0,0,LC.publisher.rx.RxVideoWidth,LC.publisher.rx.RxVideoHeight);
				var data = {
					'image' : KeyFrame,
					'sync': LC.publisher.RXframeSyncTimestamp
				};
				LC.publisher.RXvideoQueue.push(data);
			} else {
				LC.publisher.SyncCnt++;
				LC.publisher.log('onKeyFrame', 'DROP BUFFER FULL');
			}
    },
	onIFrame: function(data){
			LC.publisher.RXframeSyncTimestamp = data.sync;
			if(LC.publisher.RXvideoQueue.length < LC.publisher.rx.RxVideoBuffers) {
				var ImageObj = new Image();
				ImageObj.src = data.Image;
				LC.publisher.RXInterlacedCanvasContext.drawImage(ImageObj, 0, 0);
				var lines = 0;
				if (data.Even == true){
					for (var y = 0; y < LC.publisher.rx.RxVideoHeight; y += 2 ) {
						var newImg = LC.publisher.RXInterlacedCanvasContext.getImageData(0,lines,LC.publisher.rx.RxVideoWidth,1);
						LC.publisher.RXKeyCanvasContext.putImageData(newImg,0,y);
						lines++;
					}
				} 
				if (data.Even == false){
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
			} else {
				LC.publisher.SyncCnt++;
				LC.publisher.log('onIFrame', 'DROP');
			}
	},
	onPFrame: function(data){
			LC.publisher.RXframeSyncTimestamp = data.sync;
			if(LC.publisher.RXvideoQueue.length < LC.publisher.rx.RxVideoBuffers) {
				var ImageObj = new Image();
				ImageObj.src = data.Image;
				LC.publisher.RXMakroBlocksCanvasContext.drawImage(ImageObj, 0, 0);
				var blockWidth = data.mbwidth;
				var blockHeight = data.mbheight;
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
			} else {
				LC.publisher.SyncCnt++;
				LC.publisher.log('onPFrame', 'DROP');
			}
	},
	onAudioChunk: function(data){
			LC.publisher.RXchunkSyncTimestamp = data.sync;
			if(LC.publisher.RXaudioQueue.length < LC.publisher.rx.RxAudioBuffers) {
				var resampledRaw = new Float32Array(Object.keys(data.chunk).length);
				var ol = Object.keys(data.chunk).length;
				for (var i = 0; i < ol; ++i) {
					resampledRaw[i] = data.chunk[i];
				}
				var data = {
					'chunk' : resampledRaw,
					'sync': LC.publisher.RXchunkSyncTimestamp
				};
				LC.publisher.RXaudioQueue.push(data);
			} else {
				LC.publisher.SyncCnt++;
				LC.publisher.log('onAudioChunk', 'DROP');
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
	join: function(data){
		try {
			LC.publisher.log('join', JSON.stringify(data));
			if( data.length > 0 ) {
			LC.publisher.nickname = data;
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
        var line = jQuery('<div/>', {
          'class': 'line mymessage unconfirmed', 
          'id': data.shoutid
        });
        jQuery('<div/>', {
          'class': 'chatleft',  
          'text': '' + data.nickname
        }).appendTo(line);
        jQuery('<div/>', {
          'class': 'text',      
          'text': ' ' + data.text
        } ).appendTo(line);
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
      LC.publisher.log('messageConfirm', JSON.stringify(data));
      jQuery('#'+data.shoutid).removeClass('unconfirmed');
      jQuery('#'+data.shoutid).addClass('confirmed');
    }, 
    messageReceive: function(data){
      jQuery('#chattext').focus();
      LC.publisher.log('messageReceive', JSON.stringify(data));
        var line1 = jQuery('<div/>', {
          'class': 'line message confirmed', 
          'id': data.shoutid, 
          'onclick': 'LC.publisher.reply(\''+data.nickname+'\');'
        });
        jQuery('<div/>', {
          'class': 'chatleft', 
          'text': '' + data.nickname
        }).appendTo(line1);
        jQuery('<div/>', {
          'class': 'text', 
          'text': ' ' + data.text
        }).appendTo(line1);
        line1.appendTo('#chatstream');   
    
      jQuery('#chattext').focus();
      LC.publisher.guiCleanup();
      jQuery('#chatbox').tinyscrollbar().tinyscrollbar_update('bottom');
    },
	
  };
  parent.publisher = publisher;
  return parent;
})(LC || {}, jQuery);