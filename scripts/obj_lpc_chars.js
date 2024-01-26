
const Dir = {
  UP: 0,
  DOWN: 1,
  LEFT: 2,
  RIGHT: 3,
  NONE: 4
}

class SpriteBasic {
  constructor (scene, key, spritesheet_fn) {
    this.scene = scene;
    this.key = key;
    this.spritesheet_fn = spritesheet_fn;
    
    this.init = this.init.bind(this);
    this.preload = this.preload.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
  }

  init () {
    this.ani = '';
    this.last_ani = '';
  }

  preload (frameWidth, frameHeight, rowSize) {
    this.rowSize = rowSize;
    this.scene.load.spritesheet(this.key, 
                                this.spritesheet_fn, 
                                {
                                  frameWidth: frameWidth,
                                  frameHeight: frameHeight
                                });    
  }

  create (aniList) {
    aniList.forEach( (ani) => {
      let frm_spec = { start:ani.row*this.rowSize, end: (ani.row*this.rowSize)+ani.length };
      let frms = this.scene.anims.generateFrameNumbers(this.key, frm_spec );

      this.scene.anims.create({
        key: ani.name + "_" + this.key,
        frames: frms,
        frameRate: 10,
        repeat: (ani.name == 'lpc_dead') ? 0 : -1
      });      
    });

    this.grp = this.scene.physics.add.group();
    this.obj = this.grp.create(-256, -256, this.key);
  }

  update () {
    if (this.ani != this.last_ani) {
      this.last_ani = this.ani;

      if (this.ani.length > 0) {
        this.obj.play(this.ani);   
      } else {
        this.obj.stop(0);
      }
    }
  }
}

/* LpcSprite - Assuming a spritesheet compliant to
 * the Universal Liberated Pixel Cup standard,
 * generate all needed animation sequences for that
 * sprite.
 * 
 * LPC sprites are generated from:
 *   https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/
 *
 * The spritesheet may have a width of 13 or 24 tiles, depending on
 * what accessories the sprite uses.  This class does not autodetect this (yet).
 * In this case, set the isLargeSpritesheet property.
 */
class LpcSprite extends SpriteBasic {
  constructor (scene, key, spritesheet_fn) {
    super(scene, key, spritesheet_fn);
    this.preload = this.preload.bind(this);
    this.create = this.create.bind(this);
    this.setPosition = this.setPosition.bind(this);
    this.isLargeSpritesheet = false;
  }
  
  preload() {
    let row_width = (this.isLargeSpritesheet) ? 24 : 13;
    super.preload(64,64, row_width);
  }

  create () {
    let aniList = [
      /* Spell Casting Animations */
      { name: 'lpc_cast_up', row: 0, length: 6 },
      { name: 'lpc_cast_left', row: 1, length: 6 },
      { name: 'lpc_cast_down', row: 2, length: 6 },
      { name: 'lpc_cast_right', row: 3, length: 6 },

      /* Poke */
      { name: 'lpc_stab_up', row: 4, length: 7 },
      { name: 'lpc_stab_left', row: 5, length: 7 },
      { name: 'lpc_stab_down', row: 6, length: 7 },
      { name: 'lpc_stab_right', row: 7, length: 7 },

      /* Walk Cycles */
      { name: 'lpc_walk_up', row: 8, length: 8 },
      { name: 'lpc_walk_left', row: 9, length: 8 },
      { name: 'lpc_walk_down', row: 10, length: 8 },
      { name: 'lpc_walk_right', row: 11, length: 8 },

      /* Slash */
      { name: 'lpc_slash_up', row: 12, length: 5 },
      { name: 'lpc_slash_left', row: 13, length: 5 },
      { name: 'lpc_slash_down', row: 14, length: 5 },
      { name: 'lpc_slash_right', row: 15, length: 5 },

      /* Shoot */
      { name: 'lpc_shoot_up', row: 16, length: 12 },
      { name: 'lpc_shoot_left', row: 17, length: 12 },
      { name: 'lpc_shoot_down', row: 18, length: 12 },
      { name: 'lpc_shoot_right', row: 19, length: 12 },

      /* Dead */
      { name: 'lpc_dead', row: 20, length: 5 }

    ];

    super.create(aniList);

    this.obj.setScale(1.0);
    //this.obj.body.setSize(24,24).setOffset(20,40);
    this.obj.body.setCircle(12).setOffset(16+2, 32+16);
    this.obj.setCollideWorldBounds(true);

    this.ani = 'lpc_walk_down' + "_" + this.key;
    this.setPosition({ x: -4, y: -4});
  }

  setPosition (loc) {
    this.obj.setPosition(loc.x * 32, loc.y * 32);
  }

}

/* MobileSprite - Adds movement to an Animated LPC Sprite.
 * A target is specified using "moveTo", and the sprite
 * will produce a velocity vector with appropriate direction
 * and speed.  On reaching the target, the sprite will slow
 * and then stop.
 */
class MobileSprite extends LpcSprite {
  constructor (scene, key, spritesheet_fn) {
    super(scene, key, spritesheet_fn);
    this.updateAnimations = this.updateAnimations.bind(this);
    this.moveTo = this.moveTo.bind(this);
    this.moveTarget = { x: 0, y: 0 };
    this.walkSpeed = 128;
    this.dead = false;

    this.kill = this.kill.bind(this);
  }

  kill () {
    this.dead = true;
    this.obj.dead = true;
    this.ani = "lpc_dead_" + this.key;
    this.obj.setDepth(this.obj.depth -1 );
    this.obj.disableBody();
  }

  create () {
    super.create();
    this.obj.setDepth(25);
    this.setPosition(-5, -5);
  }

  updateAnimations () {
    /* Get Velocity */
    let vel = this.obj.body.velocity;

    /* Are we moving? */
    if ((vel.x == 0) && (vel.y == 0)) {
      this.ani = "";
    } else {
      let dir;
      /* Moving vertical or horizontal? */
      if (Math.abs(vel.x) > Math.abs(vel.y)) {
        dir = (vel.x > 0) ? "right" : "left";
      } else {
        dir = (vel.y > 0) ? "down" : "up";
      }
      this.ani = 'lpc_walk_' + dir + "_" + this.key;
    }

    if (this.dead) { this.ani = 'lpc_dead_' + this.key};
  }

  updateMovement () {
    if (this.dead) {
      this.obj.setVelocity(0,0);
      return;
    }

    /* Map sprite location to grid location */
    let grid_loc = { 
      x: (this.obj.x / 32),
      y: (this.obj.y / 32)
    }

    /* Get the direction to the move target */
    let dy = (this.moveTarget.y - 0.3) - grid_loc.y;
    let dx = (this.moveTarget.x + 0.5) - grid_loc.x;
    this.distRemaining = Math.sqrt( Math.pow(dx, 2) + Math.pow(dy,2));

    if (this.distRemaining > 0.06 ) {
      let dir = Math.atan2(dy, dx);

      /* Normalize direction onto the walk speed */
      let vy = Math.sin(dir) * this.walkSpeed;
      let vx = Math.cos(dir) * this.walkSpeed;
  
      if (this.distRemaining < 0.3) {
        vy = vy / 3;
        vx = vx / 3;
      }

      /* Apply velocity to sprite */
      this.obj.setVelocity(vx, vy);

    } else {
      /* If we're at the destination, stop */
      this.obj.setVelocity(0,0);
    }
  }

  update () {
    super.update();
    this.updateAnimations();
    this.updateMovement();
  }

  moveTo (loc) {
    if (this.dead) {
      return;
    }
    
    let current_loc = { 
      x: (this.obj.x / 32),
      y: (this.obj.y / 32)
    }

    /* Save a simple target for the update loop to move towards */
    if ((loc.x != this.moveTarget.x) ||
        (loc.y != this.moveTarget.y)) {
      /* console.log("Moving from (" + current_loc.x + "," + current_loc.y + ") " +
                  "to (" + loc.x + "," + loc.y + ")"); */
      this.moveTarget = loc;
    }
  }

  setPosition (loc) {
    super.setPosition(loc);
    this.moveTarget = loc;
  }
}


/* StarSprite adds Automatic Pathing and collision avoidance
 * to a Mobile Sprite 
 *
 * StarSprite assumes that the containing scene has an
 * instance of Easystar at scene.easystar, which is shared
 * between all StarSprites.
 */
class StarSprite extends MobileSprite {
  constructor (army, scene, key, spritesheet_fn) {
    super(scene, key, spritesheet_fn);
    this.army = army;
    this.starPath = [];
    this.pathSeq = 0;
    this.pathInstance = null;
    this.maxPathError = 0.2;

    this.step_sprites = [];

    this.moveToWithRetry = this.moveToWithRetry.bind(this);
  }

  preload () {
    super.preload();
    this.scene.load.image('footprint', "sprites/footprints.png" );
  }

  setPosition (loc) {
    super.setPosition(loc);
    this.starTarget = loc;
  }

  moveToWithRetry (dest_loc, isRetry) {
    if ((dest_loc.x == this.starTarget.x) &&
        (dest_loc.y == this.starTarget.y)) {
      return;
    }
    this.starTarget = dest_loc;

    /* Map sprite location to grid location */
    let grid_loc = { 
      x: Math.floor(this.obj.x / 32),
      y: Math.ceil(this.obj.y / 32)
    }

    if (this.pathInstance != null) {
      this.army.easystar.cancelPath(this.pathInstance);
    }

    console.log(this.name + " searching for path from (" + grid_loc.x + "," + grid_loc.y + ") to (" + dest_loc.x + "," + dest_loc.y + ")");
    try {
      this.pathInstance = this.army.easystar.findPath(grid_loc.x, grid_loc.y, 
        dest_loc.x, dest_loc.y, (path) => {
          //console.log("Got Easystar path!");
          console.log(path);

          this.starPath = path;
          this.pathSeq = 1;
          if ((this.starPath != null) && (this.starPath.length > 1)) {

            this.step_sprites.forEach((step) => step.destroy());
            this.step_sprites = [];

            this.starPath.forEach( (path_step) => {
              let step = this.scene.add.sprite(path_step.x*32, path_step.y*32, 'footprint');
              step.setDepth(this.obj.depth-1);
              step.setScale(0.5);
              step.setOrigin(0);
              step.setAlpha(0.5);
              this.step_sprites.push(step);
            })

            super.moveTo(this.starPath[this.pathSeq]);
          } else {
            /* Pathing failed. */
            if (isRetry) {
              this.starPath = [];
            } else {
              /* Wait and retry once to see if pathing clears */
              this.starPath = [];
              this.starTarget = { x: -1, y: -1 }
              console.log(this.name + " Scheduled pathing retry.");
              setTimeout(() => this.moveToWithRetry(dest_loc, true), 500);
            }
          }
        });
    } catch (e) {
      console.log("Easystar failure." + e);
      this.starPath = [];
    }
  }

  moveTo (dest_loc) {
    this.moveToWithRetry(dest_loc, false)
  }

  repath () {
    let tmp = this.starTarget;
    this.starTarget = { x: -1, y: -1 };
    this.moveTo(tmp);
  }

  update () {
    super.update();
    
    /* If we have reached a waypoint, then go to the next one */
    if (this.distRemaining < this.maxPathError) {
      if (++this.pathSeq < this.starPath.length) {
        super.moveTo(this.starPath[this.pathSeq]);
      } else {
        this.starPath = [];
        this.pathSeq = 0;
      }
    }

    this.step_sprites.forEach ((step) => step.setAlpha(step.alpha * 0.99));
  }
}

