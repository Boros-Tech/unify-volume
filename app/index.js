
const audioEncoder = require('audio-encoder/dist/audioEncoder')
const AdmZip = require('adm-zip')
const { dialog } = require('@electron/remote')
const fs = require('fs')
const Buffer = require('buffer').Buffer

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
let processBtn = document.getElementById('process-button');

soundFile.onchange = async function (e) {
    processBtn.disabled = true
    await processFiles(e.target.files)
    processBtn.disabled = false
}

let processes = []
async function processFiles(files) {
    processes = []
    for (let file of files) {
        let ps = new SoundProcesser(file);
        audioList.appendChild(ps.element);
        processes.push(ps);
    }
    for (let ps of processes) {
        await ps.process()
    }
}

async function processFile(file) {
    return new Promise(async function(resolve, reject) {
        let ps = new SoundProcesser(file);
        await ps.process()
        audioList.appendChild(ps.element);
        resolve(ps)
    })
}

let audioList = document.getElementById('audio-list')
let ctx = new AudioContext();

class SoundProcesser {
    constructor(file) {
        this.file = file;
        this._element = document.createElement('div')
        this.textLabel = document.createElement('label')
        this._element.appendChild(this.textLabel)

        this.statusLabel = document.createElement('label')
        this._element.appendChild(this.statusLabel)
        this.status = 0;
        this.update()
    }

    async process() {
        let data = await this.loadData(this.file);
        this.data = data;
        this.audioBuffer = await ctx.decodeAudioData(data);

        let val = 0;
        for (let i = 0; i < this.audioBuffer.numberOfChannels; ++i) {
            let data = this.audioBuffer.getChannelData(i);
            let frame = 0
            let total = 0
            for (let n = 0, t = data.length; n < t; ++n) {
                let w = Math.abs(data[n]);
                if (w > 0.01) {
                    frame++;
                    total += w;
                }
            }
            val += (total / frame) * this.audioBuffer.sampleRate / 100;
        }
        this.voice = val / this.audioBuffer.numberOfChannels;

        this.percent = currentVoice() / this.voice
        this.status = 1;
        this.update()
    }

    loadData(file) {
        return new Promise(function (resolve, reject) {
            let reader = new FileReader();
            reader.onload = async function (e) {
                resolve(e.target.result)
            }
            reader.readAsArrayBuffer(file)
        });
    }

    /**
     * @type {HTMLElement}
     */
    get element() {
        return this._element
    }

    update() {
        if (this.status >= 1) {
            this.textLabel.textContent = `Voice:${this.voice} Recommand:${this.percent}`
        } else {
            this.textLabel.textContent = 'Processing...'
        }
        if (this.status == 2) {
            this.statusLabel.textContent = 'Waiting...'
        } else if (this.status == 3) {
            this.statusLabel.textContent = 'Done'
        } else {
            this.statusLabel.textContent = ''
        }
    }

    get name() {
        return this.file.name.match(/^([^\.]+)/)[0] + '.mp3'
    }

    output() {
        this.status = 2;
        this.update()
        return new Promise( (resolve, reject) => {
            let audioBuffer = this.audioBuffer;
            let targetBuffer = ctx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
            let percent = this.percent;
            for (let channel = 0; channel < audioBuffer.numberOfChannels; ++channel) {
                let fromData = audioBuffer.getChannelData(channel)
                let toData = targetBuffer.getChannelData(channel)
                for (let off = 0; off < fromData.length; ++off) {
                    toData[off] = fromData[off] * percent;
                }
            }
            audioEncoder(targetBuffer, 128, null, async (blob) => {
                let buf = await blob.arrayBuffer();
                this.status = 3;
                this.update()
                resolve(buf)
            })
        });
    }
}

processBtn.onclick = async function () {
    let ret = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    
    if (ret.filePaths.length > 0) {
        for (let ps of processes) {
            ps.status = 2;
            ps.update()
        }
        for (let ps of processes) {
            console.log('save ', `${ret.filePaths[0]}/${ps.name}`)
            fs.writeFileSync(`${ret.filePaths[0]}/${ps.name}`, Buffer.from(await ps.output()))
        }
    }

}