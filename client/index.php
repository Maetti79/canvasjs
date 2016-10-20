<!DOCTYPE html>
<?php 
if(key_exists('REQUEST_URI',$_SERVER)) { $room = str_replace('/canvas/','',$_SERVER['REQUEST_URI']); }
if($room == "") { $room = "lobby"; } 
?>
<html>
<head>
	<link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css" />
	<link rel="stylesheet" href="/canvas/bootstrap.min.css" />
	<link rel="stylesheet" href="/canvas/userchat.css?t=<?php echo time();?>" />
	<script src="//code.jquery.com/jquery-1.12.4.js"></script>
	<script src="//code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
	<script src="/canvas/jquery.tinyscrollbar.js"></script>
    <script src="/canvas/jquery.easeing.js"></script>
	<script src="/canvas/soundbuffer.js"></script>
	<script src="/canvas/xaudio.js"></script>
	<script src="/canvas/publisher.js?t=<?php echo time();?>"></script>	
	<meta name="viewport" content="width=320" />
</head>
<body>
<div class="fullscreen">

	<div class="ratio">
		<div id="videostreamuser" name="videostreamuser" class="videostream">
			<div style="position:relative;margin:auto;">
				<video  id="CameraVideo1"      width="320" height="240" style="width: 320px; height: 240px;" autoplay="true" controls="true"></video>
				<video  id="MicrophoneVideo1"  width="320" height="240" style="width: 320px; height: 240px;" autoplay="true" controls="true"></video>
				<canvas id="CameraCanvasRX1"   width="320" height="240" style="width: 100%;  border: dashed 1px #00aa00; margin:auto;"></canvas>
				<canvas id="CameraCanvasTX1"   width="320" height="240" style="position: absolute; top: 5px; left: 5px; width: 35%;  border: dashed 1px #aa0000; margin:auto;"></canvas>
			</div>
		</div>
	</div>
	
	<div class="chat">
		<div id="chatbox" class="chatbox" name="chatbox">
			<div class="scrollbar">
				<div class="track">
					<div class="thumb">
						<div class="end"></div>
					</div>
				</div>
			</div>
			<div id="viewport" class="viewport">
				<div id="overview" class="overview">
					<div id="chatstream" name="chatstream" class="chatstream"></div>
				</div>
			</div>
		</div>
		
		<div id="TX" style="position: absolute; left: calc(35% + 10px); top: 5px; width: 50px; height: 30px; -webkit-border-radius: 15px; -moz-border-radius: 15px; border-radius: 15px; background:rgba(255,100,100,0.8); border: 1px solid #222222; font-size:8px; line-height:12px;">
		TX
		</div>
		<div id="RX" style="position: absolute; left: calc(35% + 65px); top: 5px; width: 50px; height: 30px; -webkit-border-radius: 15px; -moz-border-radius: 15px; border-radius: 15px; background:rgba(100,255,100,0.8); border: 1px solid #222222; font-size:8px; line-height:12px;">
		RX
		</div>
		
		<div id="chatinput" name="chatinput" class="chatinput">	
			<form onsubmit="return false;">			
				<input id="chattext" name="chattext" class="chattext" type="text" placeholder="Chat Text" maxlength="500" disabled autocomplete="off"/>
			</form>
		</div>
	</div>
	
	<div id="joinchat" style="position:absolute; top: 35%; left: calc(50% - 150px); -webkit-border-radius: 15px; -moz-border-radius: 15px; border-radius: 15px; background:rgba(100,100,100,0.8); border: 1px solid #222222;">
		<div style="margin-top: 10px; margin-left:10px; margin-right: 10px; margin-bottom: 25px;">
			<div class="text" style="color: #ffffff; width: 100%; text-align: center; font-weight: bold; font-size: 20px; margin-bottom:5px;">Room: <?php echo $room;?></div>
			<div class="text" style="color: #ffffff;width: 100%; text-align: center; font-weight: bold; font-size: 20px; margin-bottom:5px;">Choose Nickname</div>
			<div class="text" style="width: 100%; text-align: center; margin-bottom: 20px;">
				<form onsubmit="return false;">			
					<input id="chatnickname" name="chatnickname" class="chatnickname" type="text" placeholder="Nickname" value="" maxlength="25"/>
					<input id="chatjoin" name="chatjoin" class="chatjoin" type="button" value="Join" autocomplete="off"/>
				</form>
			</div>
		</div>
	</div>
	
</div>
<script>
$(document).ready(function(){    
	var room = '<?php echo $room; ?>';
	var nickname = LC.publisher.getUniqueNickname();
	jQuery('#chatnickname').val(nickname);
	LC.publisher.initStreams();
	LC.publisher.initSock('wss://purepix.net/cc/',room , nickname);
	
	$('#TX').click(function(event) {
		LC.publisher.tx.TxVideo = !LC.publisher.tx.TxVideo;
		LC.publisher.log('TX', LC.publisher.tx.TxVideo);
	});
	$('#RX').click(function(event) {
		LC.publisher.rx.RxVideo = !LC.publisher.rx.RxVideo;
		LC.publisher.log('RX', LC.publisher.rx.RxVideo);
	});
	
    $('#chatbox').tinyscrollbar();
    jQuery('#chattext').focus(function() {
		$('#chatbox').css('visibility','visible');
    });
    $('#overview, #viewport').click(function() {
		$('#chatbox').css('visibility','hidden');
    });
    jQuery('#chattext').keypress(function(event) {
		if (event.which == 13) {
			if(jQuery('#chattext').val().length > 0){
                if( jQuery('#chattext').val()!= "Chat Text"){
					LC.publisher.messageSubmit();
               }
            }
		}
	});
	jQuery('#chatjoin').click(function(event) {
		if( jQuery('#chatnickname').val()!= "Nickname"){
			LC.publisher.join(jQuery('#chatnickname').val(),'<?php echo $room; ?>');
			 $('#chattext').prop('disabled',false);
		}
	});
	jQuery('#chatnickname').keypress(function(event) {
		if (event.which == 13) {
			if( jQuery('#chatnickname').val()!= "Nickname"){
				LC.publisher.join(jQuery('#chatnickname').val(),'<?php echo $room; ?>');
				$('#chattext').prop('disabled',false);
			}
		}
	});
	window.onresize = function(){ $('#chatbox').tinyscrollbar().tinyscrollbar_update('bottom'); }
});
</script>
</body>
</html>