// create Agora client
var client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
var rtmClient,rtmChannel;
var mainRtmChannel = "main";

var localTracks = {
  videoTrack: null,
  audioTrack: null
};
var remoteUsers = {};
// Agora client options
var options = {
  appid: null,
  channel: null,
  uid: null,
  accountName: null
};

// the demo can auto join channel with params in url
$(() => {
  var urlParams = new URL(location.href).searchParams;
  options.appid = urlParams.get("appid");
  options.accountName = urlParams.get("accountName");
  if (options.appid && options.channel) {
    $("#appid").val(options.appid);
    $("#accountName").val(options.accountName);
    $("#join-form").submit();
  }
})

$("#join-form").submit(async function (e) {
  e.preventDefault();
  $("#join").attr("disabled", true);
  try {
    options.appid = $("#appid").val();
    options.accountName = $("#accountName").val();
    await joinRtm();
  } catch (error) {
    console.error(error);
  } finally {
    $("#createRoom").attr("disabled", false);
  }
})

$("#createRoom").click(function (e) {
  var channelName = createChannelName();  
  join(channelName,"new","host");
  $("#createRoom").attr("disabled", true);
})

async function joinRtm() {
  rtmClient = AgoraRTM.createInstance(options.appid);
  rtmClient.login({ token: '', uid: options.accountName}).then(() => {
    console.log('AgoraRTM client login success');

    //rtm channel
    rtmChannel = rtmClient.createChannel(mainRtmChannel);
    rtmChannel.join().then(()=>{
        console.log("RTM Join Channel Success");

        rtmChannel.on('ChannelMessage', function (message, memberId) {
            console.log("Get channel message:"+memberId);
            console.dir(message);
            const information = JSON.parse(message.text);

            if(information.type == "new"){

              const room = $(`
                <div id="player-wrapper-${memberId}" >
                  <button id="" type="submit" class="btn btn-primary btn-sm" onclick="join('${information.channelName}','','host')">Join Speaker(Host:${memberId})</button>
                  <button id="" type="submit" class="btn btn-primary btn-sm" onclick="join('${information.channelName}','','audience')">Join Audience(Host:${memberId})</button>
                  <button id="" type="submit" class="btn btn-primary btn-sm" onclick="leave()">Leave</button>
                </div>
                <br />
              `);
              $("#remote-playerlist").append(room);
            }
        });
    });
  }, function (err) {
    console.log("AgoraRTC client init failed", err);
  });
}


async function join(channelName,type,role) {
  console.log("channelName:" + channelName);
  // add event listener to play remote tracks when remote user publishs.
  client.on("user-published", handleUserPublished);
  client.on("user-unpublished", handleUserUnpublished);
  client.setClientRole(role);
  const uid = await client.join(options.appid, channelName, null, null);

  if(role == "host"){
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    // Publish the local audio track to the channel.
    await client.publish([localAudioTrack]);
  }

  if(type == "new"){
    //新規ルームの通知
    var info = JSON.stringify({uid: options.accountName, channelName: channelName, type: type});
    rtmChannel.sendMessage({text: info});
    console.log("send new channel info");
  }

  //console.log("publish success");
}

async function leave() {
  // leave the channel
  await client.leave();
  console.log("client leaves channel success");
}

async function subscribe(user, mediaType) {
  const uid = user.uid;
  // subscribe to a remote user
  await client.subscribe(user, mediaType);
  console.log("subscribe success");

  if (mediaType === 'audio') {
    user.audioTrack.play();
  }
}

function handleUserPublished(user, mediaType) {
  const id = user.uid;
  remoteUsers[id] = user;
  subscribe(user, mediaType);
}

function handleUserUnpublished(user) {
  const id = user.uid;
  delete remoteUsers[id];
  $(`#player-wrapper-${id}`).remove();
}

function createChannelName(){
  var l = 8;
  var c = "abcdefghijklmnopqrstuvwxyz";
  var cl = c.length;
  var r = "";
  for(var i=0; i<l; i++){
    r += c[Math.floor(Math.random()*cl)];
  }
  return r;
}

