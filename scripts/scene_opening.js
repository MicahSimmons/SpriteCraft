
class OpeningTitle extends BasicObject {
  constructor (scene) {
    super(scene);
  }

  create () {
    super.create();
    this.obj = this.scene.add.text(480, 150, "SpriteCraft", {
      fontSize: '5rem',
      fill: '#FFEEAA',
      boundsAlignH: 'center',
      boundsAlignV: "middle"
    });
    this.obj.setOrigin(0.5);
  }
}

class OpeningInfo extends BasicObject {
  constructor (scene) {
    super(scene);
  }

  create () {
    super.create();
    this.obj = this.scene.add.text(480, 270, "Click to Begin", {
      fontSize: '2rem',
      fill: '#FFEEAA',
      boundsAlignH: 'center',
      boundsAlignV: "middle"
    });
    this.obj.setOrigin(0.5);
  }
}

class OpeningHelp extends BasicObject {
  constructor (scene) {
    super(scene);
  }

  init () {
    this.help_counter = 0;
    this.help_text = [
      "Destroy Enemy Units",
      "WASD to move the view",
      "QE to zoom the view",
      "Click a unit to select",
      "Click the map to attack",
      "Shift-Click the map to move"
    ]
  }

  create () {
    super.create();
    this.obj = this.scene.add.text(480, 500, "", {
      fontSize: '2rem',
      fill: '#FFEEAA',
      boundsAlignH: 'center',
      boundsAlignV: "middle"
    });
    this.obj.setOrigin(0.5);
  }

  update () {
    super.update();
    this.help_counter++;
    this.obj.text = this.help_text[ Math.floor(this.help_counter / 180 ) % this.help_text.length]
  }
}

class SceneOpening extends BasicScene {
  constructor () {
    super("SceneOpening");
    this.addObject("title", new OpeningTitle(this));
    this.addObject("info", new OpeningInfo(this));
    this.addObject("help", new OpeningHelp(this));
  }
  
  create () {
    super.create();
    this.input.on('pointerdown', (pointer) => {
      console.log("And so it begins!!");
      this.scene.start("SceneGame");
    });
  }
}