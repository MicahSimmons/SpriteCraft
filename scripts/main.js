

/**
 *       audio: {
        context:Tone.context._context 
      },
 */

const init_model = {
    tmp: 0,
    config: {
      type: Phaser.AUTO,
      width: 960,
      height: 540,
      pixelArt: true,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scene: [
        SceneOpening,
        SceneGame,
        SceneEnding
      ],
      parent: "dom_id"
    },
    score: 0,
    time_remaining: 0,
    audio_cfg: {
      bgm_enabled: true,
      bgm_fn: "./music/MarsTheBringerOfWar.mid" 
      /* bgm_fn: "./music/DanceOfTheKnights.mid" */
      /* bgm_fn: "./music/NeverGonnaGiveYouUp.mid" */
    },
    map_info: {
      red_spawn_pts: [],
      blue_spawn_pts: [],
      routing_grid: [],
    },
    controls: {
      unit: [],
      target: "",
      ground: ""
    },
    attack_queue: [],
    results: {
      blue: 0,
      red: 0
    }
  }
  
  class Model {
    constructor ( ) {
      Object.entries(init_model).forEach((e,i) => {
        let [k,v] = e;
        this[k] = v;
      });
    }
  
    setDomId (dom_id) {
      this.config.parent = dom_id;
    }
  }
  
  class Game {
    constructor (dom_id) {
      this.model = new Model();
      this.model.setDomId(dom_id);
      
      this.phaser = new Phaser.Game(this.model.config);
      this.phaser.model = this.model;
    }
  }
       