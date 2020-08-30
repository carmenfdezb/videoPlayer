var ytfailCount = 0;
var ytApiKey = 'AIzaSyBHWWmICLJr2-MoxRjTS7qs2vOJ5HY86so'

function checkYoutube(url) {
    // Yeah I hate RegEx. Thx user2200660 for this nice youtube regex ;)
    //if (url.match('/?.*(?:youtu.be\\/|v\\/|u/\\w/|embed\\/|watch\\?.*&?v=)')) {
    // Use more advanced regex to detect youtube video urls
    if (url.match(/https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/ytscreeningroom\?v=|\/feeds\/api\/videos\/|\/user\S*[^\w\-\s]|\S*[^\w\-\s]))([\w\-]{11})[?=&+%\w-]*/ig) || url.match(/ytapi.com/)) {
        console.debug("Youtube URL detected");
        return true;
    }
    else {
        return false;
    }
} 

function getYtID(url) {
    var youtube_id;
    if (url.match('embed')) { youtube_id = url.split(/embed\//)[1].split(/[?&\"]/)[0]; }
    else if (url.match(/ytapi.com/)) { youtube_id = url.split(/vid=/)[1].split(/[?&]/)[0]; }
    else { youtube_id = url.split(/v\/|v=|youtu\.be\//)[1].split(/[?&]/)[0]; }
    console.debug("Youtube ID: " + youtube_id);
    return youtube_id;
}

function getYoutubeVid(url) {
    var youtube_id;
    youtube_id = getYtID(url);
    var ytUrl = getYoutubeStream(youtube_id);
    //if (ytUrl !== "") return ytUrl;  // XMLHttpRequest does not know synchronus in QML so I need to restructe everything if I directly want to use Youtubes server
    return("http://ytapi.com/?vid=" + youtube_id + "&format=direct");
}

function getYoutubeTitle(url) {
//    var youtube_id;
//    youtube_id = getYtID(url);
//    var xhr = new XMLHttpRequest();
//    xhr.open("GET","https://www.googleapis.com/youtube/v3/videos?id=" + youtube_id + "&key="+ ytApiKey + "&fields=items(snippet(title))&part=snippet",true);
//    xhr.onreadystatechange = function() {
//        if (xhr.readyState === 4) {
//            if (xhr.status === 200) {
//                var jsonObject = eval('(' + xhr.responseText + ')');
//                //console.log("JSON Response: " + jsonObject.data.items[0].snippet);
//                console.log("Youtube Title: " + jsonObject.items[0].snippet.title);
//                firstPage.streamTitle = jsonObject.items[0].snippet.title;
//                //                for ( var index in jsonObject.data )
//                //                {
//                //                    console.log("Youtube Title: " + jsonObject.data.title);
//                //                    firstPage.streamTitle = jsonObject.data.title;
//                //                }
//            } else {
//                firstPage.streamTitle = url
//                console.log("responseText", xhr.responseText);
//            }
//        }
//    }
//    xhr.send();
}


// This would be a proper way to get the youtube video stream url
function getYoutubeStream(youtube_id) {

    var doc = new XMLHttpRequest();

    doc.onreadystatechange = function() {
        if (doc.readyState == XMLHttpRequest.DONE) {

            var videoInfo = doc.responseText;

            var videoInfoSplit = videoInfo.split("&");
            var streams;
            var response;
            var streamData;
            var paramPair;
            var videoDetailsData;
            var videoTitle;

            for (var i = 0; i < videoInfo.length; i++) {
                try {
                    paramPair = videoInfoSplit[i].split("=");
                    //console.log(paramPair)
                } catch(e) {
                    msg = "[yt.js]: " + e
                    //console.debug(msg)
                }
                if (paramPair[0] === "player_response") {
                    //console.log("player response found: " + paramPair[1]);
                    response = JSON.parse(decodeURIComponent(paramPair[1]));
                    //console.log("Response:" + response);
                    streamData = response["streamingData"];
                    //console.log("StreamData:" + JSON.stringify(streamData));
                    streams = streamData["formats"];
                    //console.log("Formats: " + JSON.stringify(streams));

                    //streams = response.stream //decodeURIComponent(paramPair[1]);
                    videoDetailsData = response["videoDetails"];
                    videoTitle = videoDetailsData["title"];
                    break;
                }
            }

            if (!streams) {
                var msg = "YouTube videoInfo parsing: url_encoded_fmt_stream_map not found";
                console.debug(msg);
                //return;
            }
            try {
                var found = false;
                for (var i = 0; i < streams.length; i++) {
                    var streamObject = streams[i];
                    //console.log("Get streamObject " + i + " : " + JSON.stringify(streamObject))
                    var url=decodeURIComponent(streamObject["url"]), sig="", itag=streamObject["itag"], sp="";
                    if ("cipher" in streamObject) sig=streamObject.cipher
                    var resolutionFormat;

                        //***********************************************//
                        //     List of video formats as of 2012.12.10    //
                        // fmt=17   144p        vq=?           ?    vorbis   //
                        // fmt=36   240p        vq=small/tiny  ?    vorbis   //
                        // fmt=5    240p        vq=small/tiny  flv  mp3      //
                        // fmt=18   360p        vq=medium      mp4  aac      //
                        // fmt=34   360p        vq=medium      flv  aac      //
                        // fmt=43   360p        vq=medium      vp8  vorbis   //
                        // fmt=35   480p        vq=large       flv  aac      //
                        // fmt=44   480p        vq=large       vp8  vorbis   //
                        // fmt=22   720p        vq=hd720       mp4  aac      //
                        // fmt=45   720p        vq=hd720       vp8  vorbis   //
                        // fmt=37  1080p        vq=hd1080      mp4  aac      //
                        // fmt=46  1080p        vq=hd1080      vp8  vorbis   //
                        // fmt=38  1536p        vq=highres     mp4  aac      //
                        //***********************************************//

                        // Try to get 720p HD video stream first
                        if (itag === 22) { // 5 parameters per video; itag 22 is "MP4 720p", see http://userscripts.org/scripts/review/25105
                            resolutionFormat = "MP4 720p"
                            if (!!sig) {
                                url += "&signature=" + sig;
                            }
                            else if (!!sp) {
                                url += "&sp=" + sp;
                            }
                            firstPage.url720p = url
                            found = true;
                            continue;
                        }
                        // If above fails try to get 480p video stream
                        // TODO: This is not working. Need to check it in the future
                        else if (itag === 35) { // 12 parameters per video; itag 135 is "MP4 480p", see http://userscripts.org/scripts/review/25105
                            resolutionFormat = "MP4 480p"
                            if (!!sig) {
                                url += "&signature=" + sig;
                            }
                            else if (!!sp) {
                                url += "&sp=" + sp;
                            }
                            firstPage.url480p = url
                            found = true;
                            continue;
                        }
                        // If above fails try to get 360p video stream
                        else if (itag === 18) { // 5 parameters per video; itag 18 is "MP4 360p", see http://userscripts.org/scripts/review/25105
                            resolutionFormat = "MP4 360p"
                            if (!!sig) {
                                url += "&signature=" + sig;
                            }
                            else if (!!sp) {
                                url += "&sp=" + sp;
                            }
                            firstPage.url360p = url
                            found = true;
                            continue;
                        }
                        // If above fails try to get 240p video stream
                        else if (itag === 36) { // 5 parameters per video; itag 36 is "3GPP 240p", see http://userscripts.org/scripts/review/25105
                            resolutionFormat = "FLV 240p"
                            if (!!sig) {
                                url += "&signature=" + sig;
                            }
                            else if (!!sp) {
                                url += "&sp=" + sp;
                            }
                            firstPage.url240p = url
                            found = true;
                            continue;
                        }

                }

                if (found) {
                    //console.debug("[yt.js]: Video in format " + resolutionFormat + " found with direct URL: " + url);
                    if (firstPage.youtubeDirect) {
                        if (firstPage.url720p != "none" && firstPage.url720p != "" && firstPage.ytQualWanted == "720p") {
                            console.debug("[yt.js]: Video in format MP4 720p found with direct URL: " + firstPage.url720p)
                            firstPage.streamUrl = firstPage.url720p
                            firstPage.ytQual = "720p"
                        }
                        if (firstPage.url480p != "none" && firstPage.url480p != "" && (firstPage.ytQual == "" || firstPage.ytQualWanted == "480p")) {
                            console.debug("[yt.js]: Video in format MP4 480p found with direct URL: " + firstPage.url480p)
                            /*if (firstPage.url720p == "")*/ firstPage.streamUrl = firstPage.url480p
                            firstPage.ytQual = "480p"
                        }
                        if (firstPage.url360p != "none" && firstPage.url360p != "" && (firstPage.ytQual == "" || firstPage.ytQualWanted == "360p")) {
                            console.debug("[yt.js]: Video in format MP4 360p found with direct URL: " + firstPage.url360p)
                            /*if (firstPage.url720p == "" && firstPage.url480p == "")*/ firstPage.streamUrl = firstPage.url360p
                            firstPage.ytQual = "360p"
                        }
                        if (firstPage.url240p != "none" && firstPage.url240p != "" && (firstPage.ytQual == "" || firstPage.ytQualWanted == "240p")) {
                            console.debug("[yt.js]: Video in format MP4 240p found with direct URL: " + firstPage.url240p)
                            /*if (firstPage.url720p == "" && firstPage.url480p == "" && firstPage.url360p == "")*/ firstPage.streamUrl = firstPage.url240p
                            firstPage.ytQual = "240p"
                        }
                        found = false;
                    }

                    //if (firstPage.youtubeDirect) firstPage.streamUrl = url
                    if (videoTitle) {
                        var vT = videoTitle.replace(/\+/g, " ");
                        firstPage.streamTitle = vT;
                    }
                    return url;

                } else {
                    var msg = "Couldn't find video either in MP4 720p, FLV 480p, MP4 360p and FLV 240p";
                    console.debug(msg);
                    return;
                }
            } catch(e) {
                //console.debug("[yt.js]: " + e)
                //console.debug("[yt.js] ytfailCount: " +ytfailCount);
                ytfailCount++;
                getYoutubeStream(youtube_id);
            }

        }
    }


    if (ytfailCount == 0) {
        doc.open("GET", "https://www.youtube.com/get_video_info?video_id=" + youtube_id);
        doc.send();
    }
    else if (ytfailCount == 1) {
        doc.abort()
        doc.open("GET", "https://www.youtube.com/get_video_info?video_id=" + youtube_id + "&el=embedded");
        doc.send();
    }
    else if (ytfailCount == 2) {
        doc.abort()
        doc.open("GET", "https://www.youtube.com/get_video_info?video_id=" + youtube_id + "&el=detailpage");
        doc.send();
    }
    else if (ytfailCount == 3) {
        doc.abort()
        doc.open("GET", "https://www.youtube.com/get_video_info?video_id=" + youtube_id + "&el=vevo");
        doc.send();
    }
    else {
        console.debug("[yt.js] ytfailCount:" + ytfailCount);
        console.debug("Could not find video stream.")
        ytfailCount = 0
    }
}


// Damn it RegExp again :P
function getDownloadableTitleString(streamTitle) {
    if (streamTitle.match(/\//g)) streamTitle = streamTitle.replace(/\//g, "");
    if (streamTitle.match(/\?/g)) streamTitle = streamTitle.replace(/\?/g,'');
    if (streamTitle.match('!')) streamTitle = streamTitle.replace("!", "");
    if (streamTitle.match(/\*/g)) streamTitle = streamTitle.replace(/\*/g, "");
    if (streamTitle.match('`')) streamTitle = streamTitle.replace("`", "");
    if (streamTitle.match('~')) streamTitle = streamTitle.replace("~", "");
    if (streamTitle.match('@')) streamTitle = streamTitle.replace("@", "");
    if (streamTitle.match('#')) streamTitle = streamTitle.replace("#", "");
    if (streamTitle.match('$')) streamTitle = streamTitle.replace("$", "");
    if (streamTitle.match('%')) streamTitle = streamTitle.replace("%", "");
    if (streamTitle.match('^')) streamTitle = streamTitle.replace("^", "");
    if (streamTitle.match(/\\/g)) streamTitle = streamTitle.replace(/\\/g, "");
    if (streamTitle.match('|')) streamTitle = streamTitle.replace("|", "");
    if (streamTitle.match('<')) streamTitle = streamTitle.replace("<", "");
    if (streamTitle.match('>')) streamTitle = streamTitle.replace(">", "");
    if (streamTitle.match(';')) streamTitle = streamTitle.replace(";", "");
    if (streamTitle.match(':')) streamTitle = streamTitle.replace(":", "");
    if (streamTitle.match('\'')) streamTitle = streamTitle.replace("\'", "");
    if (streamTitle.match('\"')) streamTitle = streamTitle.replace("\"", "");
    if (streamTitle.match(/\[/g)) streamTitle = streamTitle.replace(/\[/g, "");
    if (streamTitle.match(/\]/g)) streamTitle = streamTitle.replace(/\]/g, "");
    if (streamTitle.match(/\{/g)) streamTitle = streamTitle.replace(/\{/g, "");
    if (streamTitle.match(/\}/g)) streamTitle = streamTitle.replace(/\}/g, "");
    return streamTitle;
}
