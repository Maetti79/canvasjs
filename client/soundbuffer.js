var SoundBuffer = (function () {
    function SoundBuffer(ctx, sampleRate, bufferSize, desination, debug ) {
        if (bufferSize === void 0) { bufferSize = 6; }
        if (debug === void 0) { debug = true; }
        this.ctx = ctx;
        this.sampleRate = sampleRate;
        this.bufferSize = bufferSize;
        this.debug = debug;
        this.chunks = [];
        this.isPlaying = false;
        this.startTime = 0;
        this.lastChunkOffset = 0;
		this.desination = desination;
    }
    SoundBuffer.prototype.createChunk = function (chunk) {
        var _this = this;
        var audioBuffer = this.ctx.createBuffer(1, chunk.length, this.sampleRate);
        audioBuffer.getChannelData(0).set(chunk);
        var source = this.ctx.createBufferSource();
        source.buffer = audioBuffer;
        //source.connect(this.ctx.destination);
		source.connect(this.desination);
        source.onended = function (e) {
            _this.chunks.splice(_this.chunks.indexOf(source), 1);
            if (_this.chunks.length == 0) {
                _this.isPlaying = false;
                _this.startTime = 0;
                _this.lastChunkOffset = 0;
            }
        };
        return source;
    };
    SoundBuffer.prototype.log = function (data) {
        if (this.debug) {
            console.log(new Date().toUTCString() + " : " + data);
        }
    };
    SoundBuffer.prototype.addChunk = function (data) {
        if (this.isPlaying && (this.chunks.length > this.bufferSize)) {
            this.log("chunk discarded");
            return; // throw away
        }
        else if (this.isPlaying && (this.chunks.length <= this.bufferSize)) {
            this.log("chunk accepted");
            var chunk = this.createChunk(data);
            chunk.start(this.startTime + this.lastChunkOffset);
            this.lastChunkOffset += chunk.buffer.duration;
            this.chunks.push(chunk);
        }
        else if ((this.chunks.length < (this.bufferSize / 2)) && !this.isPlaying) {
            this.log("chunk queued");
            var chunk = this.createChunk(data);
            this.chunks.push(chunk);
        }
        else {
            this.log("queued chunks scheduled");
            this.isPlaying = true;
            var chunk = this.createChunk(data);
            this.chunks.push(chunk);
            this.startTime = this.ctx.currentTime;
            this.lastChunkOffset = 0;
            for (var i = 0; i < this.chunks.length; i++) {
                var chunk_1 = this.chunks[i];
                chunk_1.start(this.startTime + this.lastChunkOffset);
                this.lastChunkOffset += chunk_1.buffer.duration;
            }
        }
    };
    return SoundBuffer;
}());