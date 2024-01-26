class GridLoader extends BasicObject {
  constructor ( scene ) {
    super(scene);
    this.getBounds = this.getBounds.bind(this);
    this.findSpawnPoints = this.findSpawnPoints.bind(this);
    this.getPlayerDepth = this.getPlayerDepth.bind(this);
    this.setCollisions = this.setCollisions.bind(this);
    this.getRoutingGrid = this.getRoutingGrid.bind(this);

    this.playerDepth = 50;
  }

  preload () {
    this.scene.load.image('LPC_Atlas_Terrain', 'terrain/lpc_atlas/terrain_atlas.png');
    this.scene.load.image('LPC_Atlas_Base',    'terrain/lpc_atlas/base_out_atlas.png');

    this.scene.load.image('LPC_Atlas_Build',   'terrain/lpc_atlas_2/build_atlas.png');
    this.scene.load.image('LPC_Atlas_Misc',    'terrain/lpc_atlas_2/obj_misk_atlas.png');

    this.scene.load.tilemapTiledJSON('map', 'terrain/terrain.json');
  }

  create () {
    this.map = this.scene.make.tilemap({key: 'map'});
    this.tilesets = [
      this.map.addTilesetImage('LPC_Atlas_Base',    'LPC_Atlas_Base'),
      this.map.addTilesetImage('LPC_Atlas_Build',   'LPC_Atlas_Build'),
      this.map.addTilesetImage('LPC_Atlas_Misc',    'LPC_Atlas_Misc'),
      this.map.addTilesetImage('LPC_Atlas_Terrain', 'LPC_Atlas_Terrain')
    ];

    this.map_layers = [];
    this.map.layers.forEach( (layer) => {
      console.log(layer.name);
      this.map_layers.push(this.map.createLayer(layer.name, this.tilesets, 0, 0));
    })

    this.map_layers.forEach( (tilemap_layer, index) => {
      tilemap_layer.setDepth(index+1);
      switch (tilemap_layer.layer.name) {
        case 'Player':
          this.playerDepth = index+1;
          break;
        case 'spawn_points':
          this.findSpawnPoints(tilemap_layer);
          break;
      }
    });
  }

  findSpawnPoints (layer) {
    this.scene.game.model.map_info.red_spawn_pts = [];
    this.scene.game.model.map_info.blue_spawn_pts = [];


    for (let x=0; x< this.map.width; x++) {
      for (let y=0; y< this.map.height; y++) {
        let tile = layer.getTileAt(x,y);
        if (tile != null) {
          console.log("Spawn point at tile: (" + x + "," + y + "):" + tile.index);
          switch (tile.index) {
            case 4353: // Blue Spawn Point
              this.scene.game.model.map_info.blue_spawn_pts.push( { x, y, type: "soldier" });
              break;
            case 4354: // Blue Mage Spawn Point
              this.scene.game.model.map_info.blue_spawn_pts.push( { x, y, type: "mage" });
              break;
            case 4355: // Blue Archer Spawn Point
              this.scene.game.model.map_info.blue_spawn_pts.push( { x, y, type: "archer" });
              break;


            case 4097: // Red Soldier Point
              this.scene.game.model.map_info.red_spawn_pts.push( { x, y, type: "soldier"});
              break;
            case 4098: // Red Mage Point
              this.scene.game.model.map_info.red_spawn_pts.push( { x, y, type: "mage"});
              break;
            case 4099: // Red Archer Point
              this.scene.game.model.map_info.red_spawn_pts.push( { x, y, type: "archer"});
              break;

            default:
              console.log("Unknown spawn location (" + x + "," + y + "): " + tile.index);
              break;
          }
        }
      }
    }
  }

  getBounds () {
    return { x: this.map.widthInPixels, y: this.map.heightInPixels };
  }

  
  setCollisions (sprite_obj, callback) {
    this.map_layers.forEach( (tilemap_layer, index) => {
      if (tilemap_layer.layer.name == 'collider') {
        console.log('Adding map collisions');
        tilemap_layer.setCollisionBetween(1, 0xFFFF);
        this.scene.physics.add.collider(sprite_obj, tilemap_layer, callback);
      }    
    });
  }

  getRoutingGrid () {
    let routing_grid = [];
    this.map_layers.forEach( (tilemap_layer, index) => {
      if (tilemap_layer.layer.name == 'collider') {
        for (let y=0; y< this.map.height; y++) {
          let row = [];
          for (let x=0; x< this.map.width; x++) {
            let tile = tilemap_layer.getTileAt(x,y);
            row.push( (tile == null) ? 0 : 1 );
          }
          routing_grid.push(row);
        }    
      }    
    });
    return routing_grid;
  }

  getPlayerDepth () {
    return this.playerDepth;
  }

}
