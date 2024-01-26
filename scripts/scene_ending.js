
class EndingTitle extends BasicObject {
  constructor (scene) {
    super(scene);
  }

  create () {
    super.create();

    this.obj = this.scene.add.text(480, 150, "Game Over", {
      fontSize: '5rem',
      fill: '#FFEEAA',
      boundsAlignH: 'center',
      boundsAlignV: "middle"
    });
    this.obj.setOrigin(0.5);

    if (this.scene.game.model.results.blue <= 0) {
      this.obj.text = "You Lose!"
    } else {
      this.obj.text = "Blue Victory!"
    }

  }

}

class EndingInfo extends BasicObject {
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

class SceneEnding extends BasicScene {
  constructor () {
    super("SceneEnding");
    this.addObject("title", new EndingTitle(this));
    this.addObject("info", new EndingInfo(this));
  }
  
  create () {
    super.create();
    this.input.on('pointerdown', (pointer) => {
      console.log("And so it begins!!");
      this.scene.start("SceneOpening");
    });
  }
}