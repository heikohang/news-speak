// ==UserScript==
// @name         News Speak
// @namespace    https://github.com/heikohang/news-speak
// @version      0.1
// @description  Reads news articles out loud
// @author       Heiko Häng
// @match        https://*.err.ee/*
// @match        https://*.delfi.ee/artikkel/*
// @icon         https://s.err.ee/www/images/favicon/uudised@2x.png
// @grant        GM_addStyle
// @grant        GM.xmlHttpRequest
// @connect      api.tartunlp.ai
// ==/UserScript==

async function fetchAudioNLP(text, speakerValue, tempo) {
    const response = await fetch("https://api.tartunlp.ai/text-to-speech/v2", {
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "text": text,
            "speed": tempo,
            "speaker": speakerValue
        })
    });
    console.log("Waiting: response from NLP");

    if (!response.ok) {
        throw new Error("Problem with NLP");
    }

    console.log("Waiting: final response from NLP");

    // return await response.blob();

    let blob = await response.blob();
    let url;
    url = window.URL.createObjectURL(blob);
    //console.log(url);
    //document.getElementById("audioplayersource").src = url;
    return url;
}

async function fetchAudioEKI(text) {
    const response = await fetch("https://www.eki.ee/heli/kiisu/syntproxy.php", {
    method: "POST",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    },
    body: "v=15&e=0&speech="+text
    });

    console.log("Waiting: response from EKI");

    if(!response.ok) {
        throw new Error("Problem with EKI");
    }

    console.log("Waiting: final response from EKI");
    //let data = await response.json();
    //console.log(data);
    //await console.log(response.json());
    //return await response;
    return await response.json();
}

async function fetchAudioAzureStream(text, token) {
    const response = await fetch("https://eastus.tts.speech.microsoft.com/cognitiveservices/v1", {
    method: "POST",
    headers: {
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-160kbitrate-mono-mp3",
        "Authorization": token
    },
    body: `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="et-EE"><voice name="et-EE-AnuNeural"><prosody rate="0%" pitch="0%">${text}</prosody></voice></speak>`
    });

    console.log("Waiting: response from Azure");

    if(!response.ok) {
        throw new Error("Problem with Azure");
    }

    console.log("Waiting: final response from Azure");
    let blob = await response.blob();
    let url;
    url = window.URL.createObjectURL(blob);
    return url;
}

async function fetchAzureToken() {
	try{
		const response = await fetch("https://cors-heiko.herokuapp.com/https://azure.microsoft.com/en-us/services/cognitive-services/text-to-speech/", {
        method: "GET",
        headers: {
            "Origin": "null"
        }
        })
		const res = await response.text();
        const token = res.match("token: \"(.+?)\"");
		return token[1];
	} catch(err) {
		console.error(err);
	}
}

async function fetchAudioAzure(text) {
	let azuretoken = await fetchAzureToken("Tere-tere vana kere");
	console.log(azuretoken);
	let azureblob = await fetchAudioAzureStream(text, azuretoken);
	console.log(azureblob);
	return azureblob;
}

function getAudioEKI(text) {
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");

  var raw = "v=15&e=0&speech="+text;

  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };

  let res;
  fetch("https://www.eki.ee/heli/kiisu/syntproxy.php", requestOptions)
    .then(response => response.text())
    .then(result => setStream("https://eki.ee"+JSON.parse(result)["mp3"]))
    .catch(error => console.log('error', error));
}

function createTTSBox() {
    GM_addStyle(`
    .box {
    position: fixed;
    width: 300px;
    bottom: 80%;
    top: 10%;
    left: 20px;
    overflow-x: hidden;
    overflow-y: auto
    }
    `);

    var audioplayer = document.createElement("div");
    audioplayer.innerHTML = `
    <div id="audioplayer" class="box">
    <button id="tts-start" class="btn big round footer-buttons footer-buttons-feedback" >Start TTS</button>
    </div>
    `;
    // <button id="tts-start" class="btn big round footer-buttons footer-buttons-feedback" >Start TTS</button>
    document.body.appendChild(audioplayer);

    document.getElementById("tts-start").addEventListener("click", function(){
        console.log("TTS firing");
        switch(true) {
            case document.URL.includes("delfi"):
                //console.log("DELFI");
                //TTS(getArticle_delfi());
                TTS(getArticle("delfi"));
                break;
            case document.URL.includes("err"):
                //console.log("ERR");
                //TTS(getArticle_err());
                TTS(getArticle("err"));
                break;
        }
        document.getElementById("tts-start").disabled = true;
        document.getElementById("tts-start").innerText = "Loading...";
    });
}

function createAudioBox(url) {
    let audiobox_html = `<audio id="audioplayersource" src="${url}" controls autoplay ></audio>`;

    document.getElementById("audioplayer").innerHTML = audiobox_html;

    /*
    var newHTML         = document.createElement ("div");
    newHTML.innerHTML   = `
    <div id="audioplayer" class="box">
    <audio id="audioplayersource" controls autoplay >
    </audio>
    </div>
    `;
    document.body.appendChild (newHTML);
    document.getElementById("audioplayersource").src = url;
    document.getElementById("tts-start").remove();
    */
}

function setAudioBoxStream(url) {
  document.getElementById("audioplayersource").src = url;
}

function TTS(text) {
    console.log("Text length: "+text.length);
    const setAudio = async () => {
        try {
            // Defaulting to NLP's TTS
            let nlp_blob;
            nlp_blob = await fetchAudioNLP(text, "mari", 1);
            createAudioBox(nlp_blob);
            //setAudioBoxStream(url);
        } catch (Error) {
            // Fallback to Azure's TTS
            console.log(Error);
            let azure_blob;
            azure_blob = await fetchAudioAzure(text);
            createAudioBox(azure_blob);
            //setAudioBoxStream("https://eki.ee"+eki.mp3);
        }/* finally {
            // Fallback to EKI's TTS
            let eki;
            eki = await fetchAudioEKI(text);
            console.log(eki["mp3"]);
            createAudioBox("https://eki.ee"+eki.mp3);
            //setAudioBoxStream("https://eki.ee"+eki.mp3);
        }*/
    }

    setAudio();
}

function getArticle_err() {
  //let article = document.getElementsByClassName("text flex-row");
  let article = document.getElementsByClassName("text flex-row")[0].innerText;
  let article_title = document.getElementsByTagName("header")[0].innerText;
  let article_time = document.getElementsByClassName("pubdate ng-binding")[0].innerText;
  let article_lead = document.getElementsByClassName("lead")[0].innerText;
  let article_text = article_title+". "+article_time+". "+article_lead+" "+article;
  //console.log(article);
  //for (const [key, value] of Object.entries(article)) {
    //console.log(`${key}: ${value.innerText}`);
    //console.log(value.innerText);
    //article_text += value.innerText;
  //}
  console.log(article_text);
  return article_text;
}

function getArticle_delfi() {
  let article_title = document.getElementsByClassName("C-article-info__title")[0].innerText;
  //let article_time = document.getElementsByClassName("pubdate ng-binding")[0].innerText;
  let article_lead = document.getElementsByClassName("C-fragment C-fragment-html C-article-info__lead C-fragment-html--paragraph")[0].innerText;
  let article_content = document.getElementsByClassName("C-fragment C-fragment-html C-fragment-html--paragraph");
  let article_text = article_title+". "+". "+article_lead;

  for (const [key, value] of Object.entries(article_content)) {
    article_text += value.innerText;
  }

  console.log(article_text);
  return article_text;
}

function getArticle(provider) {
  switch(provider) {
    case "err": {
      let article = document.getElementsByClassName("text flex-row")[0].innerText;
      let article_title = document.getElementsByTagName("header")[0].innerText;
      let article_time = document.getElementsByClassName("pubdate ng-binding")[0].innerText;
      let article_lead = document.getElementsByClassName("lead")[0].innerText;
      let article_text = article_title+". "+article_time+". "+article_lead+" "+article;
      return article_text;
      break;
    }
    case "delfi": {
      let article_title = document.getElementsByClassName("C-article-info__title")[0].innerText;
      let article_lead = document.getElementsByClassName("C-fragment C-fragment-html C-article-info__lead C-fragment-html--paragraph")[0].innerText;
      let article_content = document.getElementsByClassName("C-fragment C-fragment-html C-fragment-html--paragraph");
      let article_text = article_title+". "+". "+article_lead;
      for (const [key, value] of Object.entries(article_content)) {
        article_text += value.innerText;
      }
      return article_text;
      break;
    }

  }
}

if(window.location.pathname.length > 1) {
    createTTSBox();
}
