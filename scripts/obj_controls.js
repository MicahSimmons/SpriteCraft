class GameController extends BasicObject {
  constructor (scene) {
    super(scene);
    this.camera_speed = 20;
    this.moveOrderCb = null;
    this.useAggressive = true;

    this.setBounds = this.setBounds.bind(this);
    this.setMoveOrderCb = this.setMoveOrderCb.bind(this);
    this.selectUnit = this.selectUnit.bind(this);
    this.selectTarget = this.selectTarget.bind(this);
    this.clearSelections = this.clearSelections.bind(this);
    this.evalSelections = this.evalSelections.bind(this);
  }

  selectUnit (unit_name) {
    let units = [unit_name]
    if (this.useAggressive == false) {
      units = this.scene.game.model.controls.unit;
      if (units.includes(unit_name)) {
        let tmp = units.filter( (name) => (name != unit_name));
        units = tmp;
      } else {
        units.push(unit_name);
      }
    }

    this.scene.game.model.controls = {
      unit: units,
      target: "",
      ground: { x: -1, y: -1 }
    }

    this.evalSelections();
  }

  selectTarget (unit_name) {
    this.scene.game.model.controls = {
      ...this.scene.game.model.controls,
      target: unit_name
    }

    this.evalSelections();
  }

  selectGround (grid_loc) {
    this.scene.game.model.controls = {
      ...this.scene.game.model.controls,
      ground: grid_loc
    }

    this.targetSprite.setPosition(grid_loc.x * 32, grid_loc.y * 32);
    this.targetSprite.setAlpha(1);

    this.evalSelections();
  }

  clearSelections () {
    this.scene.game.model.controls = {
      unit: [],
      target: "",
      ground: { x: -1, y: -1 }
    }
  }

  evalSelections () {
    let ctrl = this.scene.game.model.controls;

    if (ctrl.unit.length > 0) {
      /* Check if this resolves to a movement action */
      if ((ctrl.ground.x >= 0) && (ctrl.ground.y >= 0)) {
        ctrl.unit.forEach( (unit) => {
          this.doMove(unit, ctrl.ground);
        })

        /* The unit selection remains, in order to chain movement commands */
        let units = ctrl.unit;
        this.scene.game.model.controls = {
          unit: units,
          target: "",
          ground: { x: -1, y: -1 }
        }
      }
    }
  }

  doMove (unit, grid_loc) {
    if (this.moveOrderCb != null) {
      this.moveOrderCb(unit, this.useAggressive, grid_loc);
    }
  }

  /* cb = (unit_name, aggressive, loc) => {} */
  setMoveOrderCb (cb) {
    this.moveOrderCb = cb;
  }

  setBounds (x_max, y_max) {
    this.scene.cameras.main.setBounds(0, 0, x_max, y_max);
  }

  preload () {
    super.preload();
    this.scene.load.image('target_selection', "sprites/mouse_target.png" );
  }

  create () {
    super.create();

    this.targetSprite = this.scene.physics.add.sprite(0,0, 'target_selection');
    this.targetSprite.setOrigin(0.2);
    this.targetSprite.setDepth(99);
    this.targetSprite.setTint(0x00cc3333);
    this.targetSprite.setAlpha(0);

    this.scene.cameras.main.scrollY = 700;
    this.scene.cameras.main.scrollX = 650;
    
    this.shiftKey = this.scene.input.keyboard.addKey('SHIFT');

    /* Setup Keyboard Inputs */
    this.key_actions = [
      { key:'w',   action: () => { this.scene.cameras.main.scrollY -= this.camera_speed }  },
      { key:'s',   action: () => { this.scene.cameras.main.scrollY += this.camera_speed }  },
      { key:'a',   action: () => { this.scene.cameras.main.scrollX -= this.camera_speed }  },
      { key:'d',   action: () => { this.scene.cameras.main.scrollX += this.camera_speed }  },
      { key:'q',   action: () => { this.scene.cameras.main.zoom    = (this.scene.cameras.main.zoom > 5) ? 5 : this.scene.cameras.main.zoom + 0.05;  }  },
      { key:'e',   action: () => { this.scene.cameras.main.zoom    = (this.scene.cameras.main.zoom < 0.3) ? 0.3 : this.scene.cameras.main.zoom - 0.05;  }  },
      { key:'ESC', action: () => { this.clearSelections() }  },
    ].map( (cfg) => { return { 
        ...cfg, 
        obj: this.scene.input.keyboard.addKey(cfg.key)
      } 
    });

    /* Setup Mouse Inputs */
    this.scene.input.topOnly = true;
    this.scene.input.on('pointerdown', (pointer) => {
      console.log("Mouse was clicked: (" + pointer.worldX + "," + pointer.worldY + ")");
      /* Map to world coordinates */
      let grid_loc = {
        x: Math.floor(pointer.worldX / 32),
        y: Math.floor(pointer.worldY / 32)
      }
      this.selectGround(grid_loc);
    });
  }

  update () {
    if (this.targetSprite.alpha > 0.01) {
      this.targetSprite.setAlpha(this.targetSprite.alpha * 0.97)
    }

    if (this.shiftKey.isDown) {
      this.useAggressive = false;
    } else {
      this.useAggressive = true;
    }

    this.key_actions.forEach( (control) => {
      if (control.obj.isDown) {
        control.action();
      }
    });
  }
}