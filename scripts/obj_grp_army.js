
class Army extends BasicObject {
  constructor (scene, team) {
    super(scene);
    this.team = team;
    this.service_id = 0;
    this.playerDepth = 50;
    this.targets_grp = null;
    this.obj_types = { }
    this.callbackFn = null;
    this.spawn = this.spawn.bind(this);
    this.orderMove = this.orderMove.bind(this);
    this.onClick = this.onClick.bind(this);
    this.getLiveCount = this.getLiveCount.bind(this);
    this.defaultOrders = this.defaultOrders.bind(this);
    this.buildLocalGrid = this.buildLocalGrid.bind(this);
    this.makeLocReservation = this.makeLocReservation.bind(this);

    this.easystar = new EasyStar.js();
  }

  init () {
    super.init();
    this.service_id = 0;
    this.playerDepth = 50;
    this.targets_grp = null;
    this.grp = null;
  }

  create () {
    super.create();

    // Create a physics collider for the army 
    this.grp = this.scene.physics.add.group();

    this.easystar.setAcceptableTiles(0);
    this.easystar.setIterationsPerCalculation(1000);
    this.easystar.enableCornerCutting();
    this.easystar.enableDiagonals();

  }

  getLiveCount () {
    let count = 0;
    Object.keys(this.objects)
      .map( (key) => this.objects[key] )
      .filter( (obj) => (obj.isProto != true))
      .filter( (obj) => (obj.dead == false))
      .forEach( (obj) => count++)

    return count;
   }

  spawn (x, y, unit_type) {
    /* Get a spawn point */
    let loc = { x, y };

    /* Create a new soldier  */
    let name = this.team + "_" + unit_type + "_" + this.service_id++;
    let newObj = this.obj_types[unit_type]();
    this.addObject(name, newObj);

    this.objects[name].init();
    this.objects[name].create();
    this.objects[name].name = name;
    this.objects[name].obj.name = name;


    /* Put the solider on the spawn point */
    this.objects[name].setPosition(loc);

    /* Include the new mob in the armys collision group */
    this.grp.add(this.objects[name].obj);

    /* Correct for psuedo 3d map layering */
    this.objects[name].obj.setDepth(this.playerDepth);

    /* Listen for mouse events */
    this.objects[name].onClick( (object) => {
      if (this.callbackFn != null) {
        this.callbackFn(this.team,  object);
      }
    });
  }

  /* callback_fn = (team, object) => {} */
  onClick(callback_fn) {
    this.callbackFn = callback_fn;
  }

  /* Determine nearest non-conflicting path target */
  makeLocReservation (loc) {
    let reserved_loc = { x: -1, y: -1 };
    let range = 1;

    var reservations_grid = this.buildLocalGrid();
    Object.keys(this.objects).forEach( (key) => {
      let target = this.objects[key].aiTarget;
      if (typeof target === 'object') {
        reservations_grid[target.y][target.x] = 1;
      }
    });

    let world_high_x = reservations_grid[0].length;
    let world_high_y = reservations_grid.length;

    while (reserved_loc.x  < 0) {
      let adj_range = range -1;
      let low_x = Math.max(loc.x-adj_range, 0);
      let high_x = Math.min(loc.x+adj_range, world_high_x-1);
      let low_y = Math.max(loc.y-adj_range, 0);
      let high_y = Math.min(loc.y+adj_range, world_high_y-1);
  
      for (let x=low_x; x<=high_x; x++) {
        for (let y=low_y; y<=high_y; y++) {
          if (reservations_grid[y][x] == 0) {
            reserved_loc = { x: x, y: y};
          }
        }
      }
      range = range*2;  
    }

    return reserved_loc;
  }

  orderMove (selected, is_aggro, loc) {
    /** 
    let selected = Object.keys(this.objects)
                    .map( (key) => this.objects[key] )
                    .filter ( (object) => (object.isProto != true))
                    .reduce ( (sum, object) => object)
                    .name;
    console.log(selected);
    **/

    //this.objects[selected].moveTo(loc);
    let res_loc = this.makeLocReservation(loc);
    this.objects[selected].setAggressive(is_aggro);
    this.objects[selected].orderMove(res_loc);
  }

  getSpriteGroup () {
    return this.grp;
  }

  setPlayerDepth (player_depth) {
    this.playerDepth = player_depth;
  }

  setTargets(sprite_group) {
    this.targets_grp = sprite_group;
  }

  checkWounded() {
    let q = this.scene.game.model.attack_queue;
    q.forEach( (atk) => {
      if (atk.attackingTeam != this.team) {
        Object.keys(this.objects).forEach( (key) => {
          let loc = {
            x: Math.round(this.objects[key].obj.x / 32),
            y: Math.round(this.objects[key].obj.y / 32)
          }

          if ((loc.x == atk.grid.x) && (loc.y == atk.grid.y)) {
            this.objects[key].injure(atk.power);
          }
        })
      }
    })
  }

  buildLocalGrid () {
    let rows = this.scene.game.model.map_info.routing_grid.length;
    let cols = this.scene.game.model.map_info.routing_grid[0].length;

    let lgrid = []
    for (let r=0; r<rows; r++) {
      let row = []
      for (let c=0; c<cols; c++) {
        row.push(this.scene.game.model.map_info.routing_grid[r][c]);
      }
      lgrid.push(row);
    }

    Object.keys(this.objects).forEach( (key) => {
      let loc = {
        x: Math.floor(this.objects[key].obj.x / 32),
        y: Math.ceil(this.objects[key].obj.y / 32)
      }

      if (this.objects[key].dead != true) {
        if ((loc.x >= 0) && (loc.y >= 0)) {
          lgrid[loc.y][loc.x] = 2;
        }
      }
    });

    return lgrid;
  }

  update () {
    super.update();
    //console.log(this.team);

    this.easystar.setGrid(this.buildLocalGrid());
    this.easystar.calculate();
  }

  defaultOrders () {
    Object.keys(this.objects).forEach( (key) => {
      if (this.objects[key].isProto != true) {
        this.objects[key].setAggressive(true);
        this.objects[key].orderHalt();
      }
    })
  }


}


class PlayerArmy extends Army {
  constructor (scene) {
    super(scene, "blue");
    this.obj_types["soldier"] = () => { return new BlueSoldier(this, scene)};
    this.obj_types["mage"]    = () => { return new BlueMage(this, scene)};
    this.obj_types["archer"]  = () => { return new BlueArcher(this, scene)};

    Object.keys(this.obj_types).forEach( (key) => {
      let prototype_name = "blue_" + key + "_proto";
      this.addObject(prototype_name, this.obj_types[key]());
      this.objects[prototype_name].isProto = true;
    })
  }
}


class NpcArmy extends Army {
  constructor (scene) {
    super(scene, "red");
    this.obj_types["soldier"] = () => { return new RedSoldier(this, scene)};
    this.obj_types["mage"]    = () => { return new RedMage(this, scene)};
    this.obj_types["archer"]  = () => { return new RedArcher(this, scene)};

    Object.keys(this.obj_types).forEach( (key) => {
      let prototype_name = "red_" + key + "_proto";
      this.addObject(prototype_name, this.obj_types[key]());
      this.objects[prototype_name].isProto = true;
    })
  }


  create () {
    super.create() 
  }

  update () {
    super.update();
  }
}
