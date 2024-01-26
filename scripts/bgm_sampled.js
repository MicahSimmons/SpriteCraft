
/* Interface for webaudiofont,
 *   https://github.com/surikov/webaudiofont
 *
 * Heavily Based on sample code:
 *   https://surikov.github.io/webaudiofont/examples/midiplayer.html#
 * 
 * The MIDI file parser from the demo seems to have come from here?
 *   https://bl.ocks.org/rveciana/f1a11a4464ccc1bf57e8010bd2932512
 * 
 * WebAudioFont dynamically loads instrument sample data based on the
 * tracks requested instruments in the Midi file, from WebAudioFont's
 * CDN.  These create a more realistic sounding set of synth voices
 * compared to available libraries of synth waveforms (Tone.js / tinysynth)
 * 
 * Adapted for use with Phaser 3.
 */

class BgmSampled {
  constructor (scene) {
    this.init = this.init.bind(this);
    this.preload = this.preload.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.toggleBgm = this.toggleBgm.bind(this);
    this.resetEqualizer = this.resetEqualizer.bind(this);
    this.sendNotes = this.sendNotes.bind(this);
    this.startLoad = this.startLoad.bind(this);
    this.getTime = this.getTime.bind(this);

    this.scene = scene;
    this.filename = null;

    this.player = null;
    this.reverberator = null;
    this.equalizer = null;
    this.input = null;

    this.audioContext = null;
    var AudioContextFunc = window.AudioContext || window.webkitAudioContext;
    this.audioContext = new AudioContextFunc();
    this.player = new WebAudioFontPlayer();
    this.equalizer = this.player.createChannel(this.audioContext);
    this.reverberator = this.player.createReverberator(this.audioContext);
    this.reverberator.dry.gain.value = 0.3;
    this.reverberator.dry.gain.value = 0.7;

    //input = reverberator.input;
    this.input = this.equalizer.input;
    this.equalizer.output.connect(this.reverberator.input);
    this.reverberator.output.connect(this.audioContext.destination);
  }

  init () {
    this.songStart = 0;             // Start of song playing, based on audiocontext time
    this.currentSongTime = 0;       // Beginning of window of notes to queue and dispatch
    this.nextStepTime = 0;          // End of window
    this.stepDuration = 44 / 1000;  // Approximation of frame rate for update()
    this.loadedSong = null;         // Song/Track/Note data.  Also used to signify Midi and font requests are complete.
  }

  preload () {
    this.filename = this.scene.game.model.audio_cfg.bgm_fn;

    /* Construct an AJAX request to get the MIDI file from the webserver */
    var xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open("GET", this.filename, true);
    xmlHttpRequest.responseType = "arraybuffer";
    xmlHttpRequest.ctx = this;
    xmlHttpRequest.onload = function (e) {
      var arrayBuffer = xmlHttpRequest.response;
      var midiFile = new MIDIFile(arrayBuffer);
      var song = midiFile.parseSong();
      xmlHttpRequest.ctx.startLoad(song);
    };
    xmlHttpRequest.send(null);  
  }

  /* Since we don't know what instruments are needed until the MIDI file 
   * is retrieved and parsed, the instrument samples are downloaded in the
   * background thread.  
   * 
   * WebAudioFont.Loader provides findInstrument() & instrumentInfo() to
   * help map the program instruments to the correct sample library. You
   * can also manually create this mapping - info.url and info.variable
   * can be found in the instrument sample catalog:
   *    https://surikov.github.io/webaudiofont/#catalog-of-instruments
   * 
   * WebAudioFont.Player provides startLoad() to perform the background
   * download, and waitLoad() executes as a completion callback.
   * 
   * It's likely that phaser will start attempting to render update() frames
   * so this.loadedSong is used as a Semaphor.
   * */
  startLoad(song) {
    console.log(song);
  
    for (var i = 0; i < song.tracks.length; i++) {
      var nn = this.player.loader.findInstrument(song.tracks[i].program);
      var info = this.player.loader.instrumentInfo(nn);
      song.tracks[i].info = info;
      song.tracks[i].id = nn;
  
      console.log("Loading track " + i + " with instrument " + info.title + "(" + song.tracks[i].program + ")");
      this.player.loader.startLoad(this.audioContext, info.url, info.variable);
    }
    for (var i = 0; i < song.beats.length; i++) {
      var nn = this.player.loader.findDrum(song.beats[i].n);
      var info = this.player.loader.drumInfo(nn);
      song.beats[i].info = info;
      song.beats[i].id = nn;
      this.player.loader.startLoad(this.audioContext, info.url, info.variable);
    }
    
    this.player.loader.waitLoad(() => {
      console.log("load finished");
      this.resetEqualizer();
      this.loadedSong = song;
    });
  }


  resetEqualizer(){
    let equalizer = this.equalizer;
    equalizer.band32.gain.setTargetAtTime(2,0,0.0001);
    equalizer.band64.gain.setTargetAtTime(2,0,0.0001);
    equalizer.band128.gain.setTargetAtTime(1,0,0.0001);
    equalizer.band256.gain.setTargetAtTime(0,0,0.0001);
    equalizer.band512.gain.setTargetAtTime(-1,0,0.0001);
    equalizer.band1k.gain.setTargetAtTime(5,0,0.0001);
    equalizer.band2k.gain.setTargetAtTime(4,0,0.0001);
    equalizer.band4k.gain.setTargetAtTime(3,0,0.0001);
    equalizer.band8k.gain.setTargetAtTime(-2,0,0.0001);
    equalizer.band16k.gain.setTargetAtTime(2,0,0.0001);
  }

  create () {

  }

  update () {
    /* Waiting for waitload to complete, loadedSong isn't populated until
     * the MIDI long file and all supporting instrument documents are ready.
     */
    if (this.loadedSong == null) {
      return;
    }

    /* If the user alt-tabs, then the audioContext can appear to jump.  
     * This can also happen while waiting for loadedSong to release.
     *
     * Reset the song start time relative to when the tab goes active again, 
     * so that the audio appears to continue without break or error.
     */
    if ((this.audioContext.currentTime - this.nextStepTime) > this.stepDuration * 2) {
      console.log("Correcting Audio lag..");
      this.songStart = this.audioContext.currentTime - this.currentSongTime;
      this.nextStepTime = this.audioContext.currentTime;
    }

    /* If too many audio samples are loaded in, you can overflow the stack.  Tone.js has
     * this limitation too, for Midi files > 100k in size.
     * 
     * To keep the data set in the sequencer to a managable size, sendNotes() only queues
     * a couple of refreshFrames worth of data at a time.
     */
    if (this.audioContext.currentTime >= this.nextStepTime - this.stepDuration) {
      this.sendNotes(this.songStart, this.currentSongTime, this.currentSongTime + this.stepDuration);
      this.currentSongTime = this.currentSongTime + this.stepDuration;
      this.nextStepTime = this.nextStepTime + this.stepDuration;

      /* Loop the song back to the beginning on complete */
      if (this.currentSongTime > this.loadedSong.duration) {
        this.currentSongTime = this.currentSongTime - this.loadedSong.duration;
        this.sendNotes(this.songStart, 0, this.currentSongTime);
        this.songStart += this.loadedSong.duration;
      }
    }
  }

  toggleBgm(play) {
    let bgm_enabled = this.scene.game.model.audio_cfg.bgm_enabled;
    if ((play) && (bgm_enabled)) {
      console.log("toggleBgm");
      this.currentSongTime = 0;
      this.songStart = this.audioContext.currentTime;
      this.nextStepTime = this.audioContext.currentTime;
      this.audioContext.resume();
    } else {
      this.audioContext.suspend();
    }
  }

  getTime() {
    return this.currentSongTime;
  }

  /* sendNotes seaches the loadedSong and Tracks for any notes that bound
   * between the start and end times, and then dispatches them to the player
   * queue.  queueWaveTable() sends the MIDI attack/release messages to the
   * sound hardware.
   * 
   * This process is repeated for melody and percussion tracks.
   */
  sendNotes(songStart, start, end) {
    //console.log("sendNotes");
    let song = this.loadedSong;
    for (var t = 0; t < song.tracks.length; t++) {
      var track = song.tracks[t];
      for (var i = 0; i < track.notes.length; i++) {
        if (track.notes[i].when >= start && track.notes[i].when < end) {
          var when = songStart + track.notes[i].when;
          var duration = track.notes[i].duration;
          if (duration > 3) {
            duration = 3;
          }
          var instr = track.info.variable;
          var v = track.volume / 7;
          this.player.queueWaveTable(this.audioContext, this.input, window[instr], when, track.notes[i].pitch, duration, v, track.notes[i].slides);
        }
      }
    }
    for (var b = 0; b < song.beats.length; b++) {
      var beat = song.beats[b];
      for (var i = 0; i < beat.notes.length; i++) {
        if (beat.notes[i].when >= start && beat.notes[i].when < end) {
          var when = songStart + beat.notes[i].when;
          var duration = 1.5;
          var instr = beat.info.variable;
          var v = beat.volume / 2;
          this.player.queueWaveTable(this.audioContext, this.input, window[instr], when, beat.n, duration, v);
        }
      }
    }
  }
  
}


