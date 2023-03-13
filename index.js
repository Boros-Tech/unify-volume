
const audioEncoder = require('audio-encoder/dist/audioEncoder')
const fileSaver = require('file-saver')

let seVoice = localStorage.getItem("se_voice")
if (seVoice) {
    seVoice = parseFloat(seVoice)
} else {
    seVoice = 35
}
let bgmVoice = localStorage.getItem("bgm_voice")
if (bgmVoice) {
    bgmVoice = parseFloat(bgmVoice)
} else {
    bgmVoice = 20
}

let seInput = document.getElementById('se-input')
seInput.value = seVoice
seInput.onchange = function () {
    seVoice = parseFloat(seInput.value)
    seInput.value = seVoice
    localStorage.setItem("se_voice", seVoice)
}

let bgmInput = document.getElementById("bgm-input")
bgmInput.value = bgmVoice
bgmInput.onchange = function () {
    bgmVoice = parseFloat(bgmInput.value)
    bgmInput.value = bgmVoice
    localStorage.setItem("bgm_voice", bgmVoice)
}

let seRadio = document.getElementById("stander1")
let bgmRadio = document.getElementById("stander2")
function currentVoice() {
    if (seRadio.checked) {
        return seVoice
    } else {
        return bgmVoice
    }
}

let soundFile = document.getElementById('sound-file'); 
soundFile.onchange = function (e) {
    let reader = new FileReader();
    reader.onload = function (event) {
        readerTarget(event.target.result)
    }
    reader.readAsArrayBuffer(e.target.files[0])
} 
let ctx = new AudioContext();
let resultLabel = document.getElementById('result-label')
let voiceInput = document.getElementById('voice-input')
let voiceLabel = document.getElementById('voice-label')

voiceInput.onchange = function () {
    voiceLabel.innerText = voiceInput.value
    targetBuffer = null
}

/**
 * @type {AudioBuffer}
 */
let audioBuffer
let targetBuffer

async function readerTarget(data) {
    audioBuffer = await ctx.decodeAudioData(data);
    
    let val = 0;
    for (let i = 0; i < audioBuffer.numberOfChannels; ++i) {
        let data = audioBuffer.getChannelData(i);
        let frame = 0
        let total = 0
        for (let n = 0, t = data.length; n < t; ++n) {
            let w = Math.abs(data[n]);
            if (w > 0.01) {
                frame++;
                total += w;
            }
        }
        val += (total / frame) * audioBuffer.sampleRate / 100;
    }
    let voice = val / audioBuffer.numberOfChannels;
    resultLabel.innerHTML = `V:${voice} -- `;
    var percent = currentVoice() / voice
    resultLabel.innerHTML += ` Recommend:${Math.floor(percent * 100)}% `
    voiceInput.value = percent
    voiceInput.onchange()
    targetBuffer = null
}

function getTargetBuffer() {
    if (!targetBuffer) {
        targetBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
        let percent = parseFloat(voiceInput.value)
        for (let channel = 0; channel < audioBuffer.numberOfChannels; ++channel) {
            let fromData = audioBuffer.getChannelData(channel)
            let toData = targetBuffer.getChannelData(channel)
            for (let off = 0; off < fromData.length; ++off) {
                toData[off] = fromData[off] * percent;
            }
        }
    }
    return targetBuffer;
}

let currentSource
let playButton = document.getElementById('play-button');
playButton.onclick = function() {
    if (currentSource) {
        currentSource.stop()
        currentSource = null
        playButton.textContent = "Play"
    } else {
        currentSource = ctx.createBufferSource()
        currentSource.buffer = getTargetBuffer()
        currentSource.connect(ctx.destination);
        currentSource.start();
        playButton.textContent = "Pause"
    }
}

let downloadButton = document.getElementById('download-button')
downloadButton.onclick = function () {
    audioEncoder(getTargetBuffer(), 128, null, function (blob) {
        let path = soundFile.value;
        fileSaver(blob, path.match(/([\w ]+)([\w \.]*)$/)[1])
    });
}

// let originCanvas = document.getElementById("origin-canvas")
// /**
//  * 
//  * @param {HTMLCanvasElement} canvas 
//  * @param {AudioBuffer} audioBuffer 
//  */
// function drawCanvas(canvas, audioBuffer) {
//     let width = canvas.width;
//     let height = canvas.height;
//     let ctx = canvas.getContext("2d")
//     ctx.strokeStyle = "white"
//     ctx.beginPath()
//     ctx.moveTo(0, height / 2)
//     ctx.lineTo(width, height / 2)
//     ctx.stroke()

    
// }

// drawCanvas(originCanvas)