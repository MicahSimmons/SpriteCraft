

class BgmMidi {
  constructor (scene) {
      this.scene = scene;
      this.start = false;

      this.started = false;
      this.ready = false;

      this.synths = [];
      this.parts = [];

      this.toggleBgm = this.toggleBgm.bind(this);
      this.getTime = this.getTime.bind(this);
      this.init = this.init.bind(this);
      this.preload = this.preload.bind(this);
      this.create = this.create.bind(this);
      this.update = this.update.bind(this);

      this.remix_channels = [
        117, // 0 - pizzicato strings (45)
        92, // 1 - french horn
        -1, // 2 - flute
        -1, // 3 - string ensemble
        -1, // 4 - church organ
        33, // 5 - tuba
        15, // 6 - brass section
        -1, // 7 - bassoon
        -1, // 8 - trombone
        -1, // 9 - orchestra kit
        -1, // 10 - percussion
      ];

      /* 
      this.remix_channels = [
        117, // 0 - pizzicato strings (45)
        117, // 1 - french horn
        117, // 2 - flute
        117, // 3 - string ensemble
        117, // 4 - church organ
        117, // 5 - tuba
        117, // 6 - brass section
        117, // 7 - bassoon
        117, // 8 - trombone
        117, // 9 - orchestra kit
        -1, // 10 - percussion
      ];
      */

      this.remix_enable = true;
      this.enabled_tracks = [ 0, 1,2,3,4,5,7,8, 9, 10 ];
      //this.enabled_tracks = [ 0, 1, 2,3, 5, 10 ];
      this.loop_start = 12.9; 
      this.loop_start = 238.4; 
      this.loop_end = this.loop_start + (1.85 * 195);
  }

  init () {

  }

  preload () {
      if (!this.ready) {
          Tone.start();
          MidiConvert.load("music/MarsTheBringerOfWar.mid", (midi_json) => {
              console.log("Loaded Midi file.");
              Tone.Transport.bpm.value = midi_json.header.bpm;
              this.synths = [];
              this.parts = [];


              midi_json.tracks.forEach( (track, index) => {
                  console.log("Creating track number: " + track.channelNumber + " with instrument (" + track.instrument + "): " + track.instrumentNumber);
                  let ch = track.channelNumber;
                  /* Create a synth */
                  //let synth = new Tone.Synth().toDestination();
                  if (ch >= 0) {
                      let synth = new WebAudioTinySynth({internalcontext:0})
                      synth.setQuality(1);
                      Tone.connect(synth.setAudioContext(Tone.context), Tone.Master);

                      if ((this.remix_enable) && (this.remix_channels[ch] >= 0 )) {
                        synth.send([0xc0+ch, this.remix_channels[ch]]);
                      } else {
                        synth.send([0xc0+ch, track.instrumentNumber]);
                      }
      
                      /* Activate Midi Controls */
                      Object.keys(track.controlChanges).forEach( (key) => {
                          track.controlChanges[key].forEach( (change) => {
                              console.log("Control key :" + change.number + " value: " + change.value);
                              let number = change.number;
                              let time = change.time;
                              let value = change.value;
                              synth.send([0xb0+ch, number, value*100], time);
                          });
                      });
      
                      /* Create a part */
                      let part = new Tone.Part( (time, note) => {
                          //console.log(note);
                          synth.send([0x90+ch, note.midi, note.velocity * 100], time)
                          synth.send([0x80+ch, note.midi, 0], time + note.duration)
      
                      }, track.notes);
      
                      /* Save the results */
                      this.synths.push(synth);
                      this.parts.push(part); 
                  }
              });
              this.ready = true
          });    
      }
  }

  create () {

  }

  update () {
      if (this.ready) {
          if (this.start != this.started) {
              console.log("Starting?");
              if (this.start) {
                  this.parts.forEach((part, idx) => {
                    if (this.enabled_tracks.includes(idx)) {
                      console.log("Starting Part: " + idx);
                      part.start()
                    }
                  });

                  Tone.Transport.seconds = this.loop_start;
                  Tone.Transport.start();
              } else {
                  //this.parts.forEach((part) => part.stop());
                  Tone.Transport.pause();
              }

              this.started = this.start;
          }

          if (this.started) {
            if (Tone.Transport.seconds > this.loop_end) {
              console.log("Looping music...");
              Tone.Transport.seconds = this.loop_start;
            }
          }
      }
  }

  toggleBgm( enable ) {
      console.log("toggleBgm!");
      this.start = enable;

      if (!enable) {
          console.log("Stopping music now!");
          //this.parts.forEach((part) => part.stop());
          Tone.Transport.pause();
          console.log("Music stop complete.");
          this.started = this.start;
      }
  }

  getTime () {
      return Tone.Transport.seconds;
  }

}