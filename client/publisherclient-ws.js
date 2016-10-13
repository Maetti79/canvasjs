$( document ).ready(function() {
	var ws = new WebSocket('wss://purepix.net:8080');
	ws.binaryType = 'arraybuffer';
	ws.onopen = function(data) {
		console.log("onopen" + JSON.stringify(data));
		LC.publisher.onConnect();
	};
	ws.onmessage = function(event) {
		var dataRAW = event.data;
		var dataObj = JSON.parse(event.data);
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
	};
	ws.onerror = function(data) {
		console.log("onerror" + JSON.stringify(data));
	};
	ws.onclose = function(data) {
		//console.log("onclose" + JSON.stringify(data));
		LC.publisher.onDisconnect();
	};
    LC.publisher.initSock(ws, true, true, false);
});