// Copyright (c) 2019 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* ===
ml5 Example
A game using pitch Detection with CREPE
=== */

// Pitch variables
let crepe;
const voiceLow = 100;
const voiceHigh = 500;
let audioStream;
let average;
let myVol;

let fft;
let spectrum;

// Circle variables
let circleSize = 42;
const scale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Text variables
let goalNote = 0;
let currentNote = '';
let currentText = '';
let textCoordinates;

// Osc variables
let currentFreq;
let osc, oscFreq, oscAmp;
let osc2, oscFreq2, oscAmp2;
let osc3, oscFreq3, oscAmp3;
let reverb;
let audioOn = false;

// handpose

let handpose;
let video;
let predictions = [];

let handposeReady = false;
let pitchReady = false;
let c;
let soundFile;
let playbackRate = 0;
let oldAverage;

function preload() {
  soundFile = loadSound('soundFile.ogg');
}

function setup() {
  c = createCanvas(640, 480);
  c.parent('sketch-holder');
  video = createCapture(VIDEO);
  video.size(width, height);

  handpose = ml5.handpose(video, modelReadyHandpose);

  // This sets up an event that fills the global variable "predictions"
  // with an array every time new hand poses are detected
  handpose.on('predict', results => {
    predictions = results;
  });

  // Hide the video element, and just show the canvas
  video.hide();
  textCoordinates = [width / 2, 30];
  audioContext = getAudioContext();
  getAudioContext().suspend();
  mic = new p5.AudioIn();
  mic.start(startPitch);
  osc = new p5.Oscillator('sawtooth');
  osc2 = new p5.Oscillator('sawtooth');
  osc3 = new p5.Oscillator('sawtooth');
  osc.start();
  osc2.start();
  osc3.start();
  reverb = new p5.Reverb();
  osc.disconnect();
  osc2.disconnect();
  osc3.disconnect();

  // connect soundFile to reverb, process w/
  // 3 second reverbTime, decayRate of 2%
  reverb.process(osc, 3, 2);
  reverb.process(osc2, 3, 2);
  reverb.process(osc3, 3, 2);

  soundFile.loop();
  soundFile.amp(0.4);
  fft = new p5.FFT(0.8, 16);
  noStroke();
}

function draw() {
  let spectrum = fft.analyze();

  osc.amp(0.1);
  osc2.amp(0.1);
  osc3.amp(0.1);
  osc.freq(currentFreq);
  osc2.freq((random(0.99, 1.01) * (currentFreq * 3)) / 2);
  osc3.freq((random(0.99, 1.01) * (currentFreq * 5)) / 4);
  background(240);
  soundFile.rate(playbackRate);
  // Goal Circle is Blue

  image(video, 0, 0, width, height);
  noStroke();
  // for (let i = 0; i < spectrum.length; i++) {
  //   let x = map(i, 0, spectrum.length, 0, width);
  //   let h = -height + map(spectrum[i], 0, 255, height, 0);
  //   fill(spectrum[i], 0, spectrum[i], 50);
  //   rect(x, 0, width / spectrum.length, height);
  // }
  let waveform = fft.waveform();
  noFill();
  beginShape();
  stroke('#ffc43d');
  strokeWeight(5);
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length - 1, 0, width);
    let y = map(waveform[i], -1, 1, 0, height);
    vertex(x, y);
  }
  endShape();
  stroke(map(freqToMidi(currentFreq), 0, 100, 0, 255));
  strokeWeight(10);
  // fill(0, 0, map(freqToMidi(currentFreq), 0, 100, 0, 255));
  fill(
    lerpColor(
      color('#1b9aaa'),
      color('#ef476f'),
      map(freqToMidi(currentFreq), 0, 100, 0, 1)
    )
  );
  rect(map(freqToMidi(currentFreq), 0, 100, 0, width), height / 2, 100, 100);
  if (myVol) {
    soundFile.amp(myVol / height);
  }
  // We can call both functions to draw all keypoints and the skeletons
  drawKeypoints();
}

function startPitch() {
  pitch = ml5.pitchDetection('./model/', audioContext, mic.stream, modelLoaded);
}

function modelLoaded() {
  pitchReady = true;
  if (handposeReady) {
    select('#status').html('Pitch Model & Handpose Model Ready');
    document.getElementById('start-audio').style.visibility = 'visible';
  } else {
    select('#status').html('Pitch Model Loaded... Waiting on Handpose Model');
  }
}

function modelReadyHandpose() {
  handposeReady = true;
  if (pitchReady) {
    select('#status').html('Pitch Model & Handpose Model Ready');
    document.getElementById('start-audio').style.visibility = 'visible';
  } else {
    select('#status').html(
      'Handpose Model Loaded... Waiting on Pitch Detection Model'
    );
  }
}

function getPitch() {
  pitch.getPitch(function (err, frequency) {
    currentFreq = frequency;
    if (frequency) {
      let midiNum = freqToMidi(frequency);
      currentNote = scale[midiNum % 12];
      select('#currentNote').html(currentNote);
    }
    getPitch();
  });
}

function startAudio() {
  if (!audioOn) {
    getAudioContext().resume();
    document.getElementById('start-audio').innerText = 'Pause Audio';
    document.getElementById('start-audio').style.backgroundColor = '#ef476fff';
    audioOn = true;
  } else {
    getAudioContext().suspend();
    document.getElementById('start-audio').innerText = 'Start Audio';
    document.getElementById('start-audio').style.backgroundColor = '#1b9aaa';
    audioOn = false;
  }
  getPitch();
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints() {
  let averageXY = 0;
  for (let i = 0; i < predictions.length; i += 1) {
    const prediction = predictions[i];

    for (let j = 0; j < prediction.landmarks.length; j += 1) {
      const keypoint = prediction.landmarks[j];
      fill('#88fcdd');
      noStroke();
      ellipse(keypoint[0], keypoint[1], 10, 10);
      averageXY += keypoint[0] + keypoint[1];
      if (i == 0 && j == 0) {
        myVol = keypoint[1];
      }
    }
  }
  average = round(averageXY / predictions.length) / (length + width);
  if (average) {
    playbackRate = map(average, 5, 25, -5, 5);
  }
}
