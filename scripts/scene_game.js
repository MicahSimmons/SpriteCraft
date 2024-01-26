
class AttackMgr extends BasicObject {
  constructor (scene) {
    super(scene);
  }

  preload () {
    super.preload();
    this.scene.load.spritesheet("circle_atk", 
      "sprites/attacks/circle01.png", 
      {
        frameWidth: 16,
        frameHeight: 16
      });    
  }

  create () {
    super.create();
    let frms = this.scene.anims.generateFrameNumbers("circle_atk", {start:0, end:4} );

    this.scene.anims.create({
      key: "circle_atk",
      frames: frms,
      frameRate: 10,
      repeat: 0
    });

    this.grp = this.scene.physics.add.group();
  }

  update () {
    super.update();
    let atks = this.scene.game.model.attack_queue;
    atks.forEach( (atk) => {
      let obj = this.grp.create(atk.grid.x*32, atk.grid.y*32, "circle_atk");
      obj.setDepth(100);
      obj.setScale(2.0);
      obj.age = 60;
      if (atk.attackingTeam == "blue") {
        obj.setTint(0x0000ff);
      } else {
        obj.setTint(0xff0000);
      }
      obj.play("circle_atk");
    })

    this.grp.children.each( (obj) => {
      obj.setAlpha(obj.alpha * 0.9);
      if (obj.age-- <= 0) {
        obj.destroy();
      }
    })
  }
}

class SceneGame extends BasicScene {
  constructor () {
    super("SceneGame");
    this.addObject("bgm", new BgmSampled(this));
    this.addObject("controls", new GameController(this));

    /* Important!  Grid needs to be on the object queue before armies,
     * since it needs to populate the routing grid and spawn locations 
     */
    this.addObject("grid", new GridLoader(this));
    this.addObject("blue_army", new PlayerArmy(this));
    this.addObject("red_army", new NpcArmy(this));
    this.addObject("attacks", new AttackMgr(this));

    this.easystar = new EasyStar.js();
  }
  
  init () {
    super.init();
  }

  preload () {
    this.objects["bgm"].init();
    super.preload();
  }

  create () {
    this.graphics = this.add.graphics();
    super.create();

    this.objects["bgm"].toggleBgm(true);

    /* Strong borders */
    let bounds = this.objects.grid.getBounds();
    this.physics.world.setBounds(0,0, bounds.x, bounds.y );
    this.objects.controls.setBounds(bounds.x, bounds.y);

    /* Enable Collision */
    let blue_grp = this.objects.blue_army.getSpriteGroup();
    this.objects.grid.setCollisions(blue_grp, (blueSprite) => {});

    let red_grp = this.objects.red_army.getSpriteGroup();
    this.objects.grid.setCollisions(red_grp, (redSprite) => {});

    let player_depth = this.objects.grid.getPlayerDepth();
    this.objects.blue_army.setPlayerDepth(player_depth);
    this.objects.blue_army.setTargets(red_grp);
    this.objects.red_army.setPlayerDepth(player_depth);
    this.objects.red_army.setTargets(blue_grp);

       /* Setup EasyStar Routing */
    this.game.model.map_info.routing_grid = this.objects.grid.getRoutingGrid();
    this.easystar.setGrid(this.game.model.map_info.routing_grid);
    this.easystar.setAcceptableTiles(0);
    this.easystar.setIterationsPerCalculation(1000);
    this.easystar.enableCornerCutting();
    this.easystar.enableDiagonals();

    /* UI Callbacks */
    this.objects.blue_army.onClick( (team, object) => {
      //console.log("From " + team + " Army, " + object.name + " was selected.");
      this.objects.controls.selectUnit(object.name);
    });
    this.objects.red_army.onClick( (team, object) => {
      //console.log("From " + team + " Army, " + object.name + " was selected.");
      this.objects.controls.selectTarget(object.name);
    });

    this.objects.controls.setMoveOrderCb( (unit_name, is_aggro, grid_loc) => {
      this.objects.blue_army.orderMove(unit_name, is_aggro, grid_loc);
    });

    /* Spawn mobs at all spawn locations */
    this.game.model.map_info.blue_spawn_pts.forEach( (spawn_pt) => {
      this.objects.blue_army.spawn(spawn_pt.x, spawn_pt.y, spawn_pt.type);
    });
    this.game.model.map_info.red_spawn_pts.forEach( (spawn_pt) => {
      this.objects.red_army.spawn(spawn_pt.x, spawn_pt.y, spawn_pt.type);
    });

    this.objects.blue_army.grp.children.each( (blue) => {
      this.objects.red_army.grp.children.each( (red) => {
        this.physics.add.collider(blue, red, ()=>{});
      });
    })

    this.objects.blue_army.grp.children.each( (blue) => {
      this.objects.blue_army.grp.children.each( (b2) => {
        this.physics.add.collider(blue, b2, ()=>{
          this.objects.blue_army.objects[blue.name].repath();
          this.objects.blue_army.objects[b2.name].repath();
        });
      });
    })

    this.objects.red_army.grp.children.each( (red) => {
      this.objects.red_army.grp.children.each( (r2) => {
        this.physics.add.collider(r2, red, ()=>{
          this.objects.red_army.objects[red.name].repath();
          this.objects.red_army.objects[r2.name].repath();

        });
      });
    })


    this.objects.red_army.defaultOrders();
    this.objects.blue_army.defaultOrders();

  }

  update () {
    super.update();
    this.easystar.calculate();
    
    this.objects.blue_army.checkWounded();
    this.objects.red_army.checkWounded();
    this.game.model.attack_queue = [];

    if ((this.objects.blue_army.getLiveCount() == 0) ||
        (this.objects.red_army.getLiveCount() == 0)) {
      this.game.model.results = {
        blue: this.objects.blue_army.getLiveCount(),
        red: this.objects.red_army.getLiveCount()
      }
      this.scene.start("SceneEnding");
    }
  }
}