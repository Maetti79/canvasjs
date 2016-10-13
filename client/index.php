<!DOCTYPE html>
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
	<script src="/canvas/publisherclient-ws.js?t=<?php echo time();?>"></script>
	<script src="/canvas/publisher.js?t=<?php echo time();?>"></script>	
	<meta name="viewport" content="width=320" />
</head>
<body>

</body>
</html>

<body>
    <div class="fullscreen">
      <!-- LiveStream -->
      <div class="ratio">
        <div id="videostreamuser" name="videostreamuser" class="videostream">
            <video  id="CameraVideo1"    width="320" height="240" style="width:320px; height:240px;" autoplay controls></video>
			<canvas id="CameraCanvasRX1" width="320" height="240" style="top: 0px; width: 75%; position: relative; border: dashed 1px #00aa00;"></canvas>
			<canvas id="CameraCanvasTX1" width="320" height="240" style="top: 0px; width: 75%; position: relative; border: dashed 1px #aa0000;"></canvas>
		</div>
      </div>

      <div class="chat">

        <div id="chatbox" class="chatbox" name="chatbox">
          <div class="scrollbar">
            <div class="track">
              <div class="thumb">
                <div class="end">
                </div>
              </div>
            </div>
          </div>
          <div id="viewport" class="viewport">
            <div id="overview" class="overview">
              <div id="chatstream" name="chatstream" class="chatstream">
              </div>
            </div>
          </div>
        </div>

        <div id="chatinput" name="chatinput" class="chatinput">	
          <form onsubmit="return false;">			
            <input id="chattext" name="chattext" class="chattext disabled" type="text" placeholder="Chat Text" maxlength="500"/>
            <input id="chatbutton" name="chatbutton" class="chatbutton disabled" type="button" value="Send"/>
          </form>
        </div>

      </div>

      <div id="tooltip" class="tooltip">
        <div id="tooltiptext" class="tooltiptext"></div>
      </div>

      <div id="joinchat" style="position:absolute; top: 25%; left: calc(50% - 150px); -webkit-border-radius: 15px; -moz-border-radius: 15px; border-radius: 15px; background:rgba(255,255,255,0.5);">
        <div style="margin-top: 10px; margin-left:10px; margin-right: 10px; margin-bottom: 25px;">
          <div class="text" style="width: 100%; text-align: center; font-weight: bold; font-size: 20px;">
            Bitte w&auml;hle deinen Nickname
          </div>
          <br/>
          <div class="text" style="width: 100%; text-align: center; margin-bottom: 20px;">
            <form onsubmit="return false;">			
              <input id="chatnickname" name="chatnickname" class="chatnickname" type="text" placeholder="Nickname" value="" maxlength="25"/>
              <input id="chatjoin" name="chatjoin" class="chatjoin" type="button" value="Join"/>
            </form>
          </div>
        </div>
      </div>

    </div>

    <script>
      $(document).ready(function(){        
        var tt = 0;
        $('#chatbox').tinyscrollbar();
        jQuery('#chatbutton').click(function(event) {
          if(jQuery('#chattext').val().length > 0){
            if( jQuery('#chattext').val()!= "Chat Text"){
              LC.publisher.messageSubmit();
            }
          }
        });
      
        jQuery('#chattext, #chatbutton').focus(function() {
          $('#chatbox').css('visibility','visible');
          $('#tooltip').hide();  
          tt = 0;
        });
        jQuery('#chattext, #chatbutton').blur(function() {
          //$('#chatbox').css('visibility','hidden');
          tt = 1;
        });
      
        $('#chattext, #chatbutton').mousemove(function(event) { 
          if(tt == 1) {
            $('#tooltiptext').html('Hier klicken um den Chat ein zu blenden.');
            var left = event.pageX + 5;
            var top = event.pageY - $('#tooltip').height() - 5;
            $('#tooltip').css({top: top,left: left}).show();
          } else {
            //$('#tooltip').hide();  
          }
        });
        
        $('#chattext, #chatbutton').mouseout(function() {
          if(tt == 1) {
            $('#tooltip').hide();  
          }
        });
        
        $('#overview, #viewport').click(function() {
          $('#chatbox').css('visibility','hidden');
        });
        
        $('#chattext').click(function() {
          $('#tooltip').hide();
        });

        jQuery('#chattext').keypress(function(event) {
          if (event.which == 13) {
            if (jQuery('#chatbutton').attr("disabled") == "disabled") {
            } else{
              if(jQuery('#chattext').val().length > 0){
                if( jQuery('#chattext').val()!= "Chat Text"){
                  LC.publisher.messageSubmit();
                }
              }
            }
          }
        });
        jQuery('#chatjoin').click(function(event) {
          if( jQuery('#chatnickname').val()!= "Nickname"){
            LC.publisher.join(jQuery('#chatnickname').val());
          }
        });
        jQuery('#chatnickname').keypress(function(event) {
          if (event.which == 13) {
            if( jQuery('#chatnickname').val()!= "Nickname"){
              LC.publisher.join(jQuery('#chatnickname').val());
            }
          }
        });
        window.onresize = function(){ $('#chatbox').tinyscrollbar().tinyscrollbar_update('bottom'); }
      });
    </script>
  </body>
</html>
