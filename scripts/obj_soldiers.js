

class SelectableStar extends StarSprite {
  constructor (army, scene, key, spritesheet_fn) {
    super(army, scene, key, spritesheet_fn);
    this.onClick = this.onClick.bind(this);
    this.callbackFn = null;

    this.selected = false;
  }

  // callback_fn = (obj) => {} 
  onClick ( callback_fn ) {
    this.callbackFn = callback_fn;
  }

  kill () {
    super.kill();
    this.obj.setInteractive(false);
  }
  
  preload () {
    super.preload();
    this.scene.load.image('target_selection', "sprites/mouse_target.png" );
  }

  create () {
    super.create();
    this.targetSprite = this.scene.add.sprite(this.obj.x, this.obj.y, 'target_selection');
    this.targetSprite.setDepth(this.obj.depth-2);
    this.targetSprite.setTint(0x003333cc);
    this.targetSprite.setVisible(false);

    this.obj.setInteractive();
    this.obj.on('pointerdown', (pointer, localX, localY, event) => {
      if (this.callbackFn != null) {
        if (this.dead == false) {
          this.callbackFn(this);
          event.stopPropagation();
        }
      }
    });
  }

  update () {
    super.update();
    this.targetSprite.setPosition(this.obj.x, this.obj.y+28);
    this.targetSprite.setDepth(this.obj.depth-1);
    this.targetSprite.rotation += 0.1;

    let now_selected = (this.scene.game.model.controls.unit.includes(this.name));

    if (now_selected != this.selected) {
      this.targetSprite.setVisible(now_selected);
      this.selected = now_selected;
    }
  }
}

class StatSoldier extends SelectableStar {
  constructor (army, scene, key, spritesheet_fn) {
    super(army, scene, key, spritesheet_fn);
    this.health = 100;
    this.maxHealth = 100;

    this.setMaxHealth = this.setMaxHealth.bind(this);
  }

  setMaxHealth (health_pts) {
    this.health = health_pts;
    this.maxHealth = health_pts;
  }

  preload () {
    super.preload();
    this.scene.load.image('health_bar', "sprites/health_bar.png" );
  }

  create () {
    super.create();
    this.healthBar = this.scene.add.sprite(0,0, 'health_bar');
    this.healthBg = this.scene.add.sprite(0,0, 'health_bar');
    this.healthBar.setTint(0x00ff00);
    this.healthBg.setTint(0x000000);
    this.healthBar.setOrigin(0);
    this.healthBg.setOrigin(0);
  }

  update () {
    super.update();
    this.healthBar.setPosition(this.obj.x - 16, this.obj.y - 28);
    this.healthBg.setPosition(this.obj.x -16, this.obj.y - 28);

    let pct = (this.health / this.maxHealth);
    this.healthBar.setScale(pct, 0.5)
    this.healthBar.setDepth(this.obj.depth);
    if (pct > 0.8) {
      this.healthBar.setTint(0x00ff00);
    } else if (pct > 0.4) {
      this.healthBar.setTint(0xEBE91B);
    } else {
      this.healthBar.setTint(0xff0000);
    }

    this.healthBg.setScale(1, 0.5)
    this.healthBg.setDepth(this.obj.depth - 1);
    if (this.dead) {
      this.healthBg.setAlpha(0);
    }
  }

  injure (damage) {
    this.health -= damage;
    console.log(this.name + " is injured (" + this.health + ")");

    if (this.health <= 0) {
      this.health = 0;
      this.kill();
    }



  }
}

/* Adds High level AI modes to an Autopathing Sprite */
class SmartSprite extends StatSoldier {
  constructor (army, scene, key, spritesheet_fn) {
    super(army, scene, key, spritesheet_fn);

    this.fsmStop = this.fsmStop.bind(this);
    this.fsmGuard = this.fsmGuard.bind(this);
    this.fsmMove = this.fsmMove.bind(this);
    this.fsmPatrol = this.fsmPatrol.bind(this);
    this.fsmAttack = this.fsmAttack.bind(this);
    this.fsmSuspend = this.fsmSuspend.bind(this);
    this.setAggressive = this.setAggressive.bind(this);
    this.orderHalt = this.orderHalt.bind(this);
    this.orderMove = this.orderMove.bind(this);
    this.orderAttack = this.orderAttack.bind(this);

    this.getNearestEnemy = this.getNearestEnemy.bind(this);
    this.updateCooldown = this.updateCooldown.bind(this);
    this.doAttack = this.doAttack.bind(this);
    this.fsm = this.fsmStop

  }

  init () {
    super.init();
    this.aggressive = false;
    this.isAngered = false;

    this.aiTarget = "";
    this.attackRange = 48;
    this.guardRange = 320;
    this.attackCooldown = 0;
    this.maxCooldown = 20;
    this.attackPower = 10;

    this.repathCount = 0;
    this.repathCountMax = 10;

    this.resumeTarget = "";
    this.resumeOrder = null;
    this.suspendTimer = 0;
    this.suspendTimerMax = 120;
    this.suspendCount = 0;
    this.suspendCountMax = 20;

    this.fsm = this.fsmStop
  }

  updateCooldown () {
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }
  }

  doAttack (attack_loc) {
    if ((this.attackCooldown == 0) && (this.dead == false)) {
      let q = this.scene.game.model.attack_queue;
      let attack = {
        source: this.name,
        grid: attack_loc,
        attackingTeam: this.army.team,
        power: Math.random() * this.attackPower
      }
      q.push(attack);

      this.attackCooldown = this.maxCooldown;
    }
  }

  kill () {
    super.kill();
    this.fsm = this.fsmStop;
  }

  repath () {
    super.repath();

    /* If actively pathing towards an enemy, attempt to push through the collision */
    if (this.isAngered == false) {
      this.repathCount++;
    }

    /* If friendly has been collided with multiple times, then  pause a bit then resume */
    if (this.repathCount > this.repathCountMax) {
      this.repathCount = 0;
      this.resumeTarget = this.aiTarget;
      this.resumeOrder = this.fsm;
      this.suspendTimer = Math.floor(Math.random() * this.suspendTimerMax/2);
      this.fsm = this.fsmSuspend;
    }
  }

  fsmSuspend () {
    this.suspendTimer++;

    /* If pathing is colliding, wait and then retry */
    if (this.suspendTimer > this.suspendTimerMax) {
      this.fsm = this.resumeOrder;
      this.aiTarget = this.resumeTarget;
      this.suspendCount++;
    }

    /* If retries are failing, give up and abandon orders */
    if (this.suspendCount > this.suspendCountMax) {
      this.suspendCount = 0;
      //his.orderHalt();
    }
  }

  getNearestEnemy () {
    let my_loc = { 
      x: this.obj.x,
      y: this.obj.y
    }

    let nearest_enemy = this.army.targets_grp.children.entries.reduce( (nearest, target) => {
      if (target.dead) { return nearest };
      if (nearest == null) { return target };
      let nearest_q_dist = Math.abs(my_loc.x - nearest.x) + Math.abs(my_loc.y - nearest.y);
      let target_q_dist =  Math.abs(my_loc.x - target.x) + Math.abs(my_loc.y - target.y);
      if (nearest_q_dist < target_q_dist) { return nearest };
      return target;
    });

    let nearest_dist = Math.sqrt( Math.pow(my_loc.x - nearest_enemy.x, 2) + Math.pow(my_loc.y - nearest_enemy.y, 2) );
    if (nearest_enemy.dead) { 
      return { obj: null, dist: 0, grid: { x: 0, y: 0} }
     };

    return { obj: nearest_enemy, dist: nearest_dist, grid: { x: Math.round(nearest_enemy.x / 32), y: Math.round(nearest_enemy.y / 32)} };
  }

  /* Stop / Guard */
  fsmStop () {
    /* Do nothing.  Await further orders */
  }

  fsmGuard () {
    this.isAngered = false;
    let nearest_data = this.getNearestEnemy();

      /* If all enemies are down, proceed to ai target */
    if (nearest_data.obj == null) {
      /* Check for distance to grid location.  If tether is exceeded, move to ai target */
      this.moveTo(this.aiTarget);
    } else if (nearest_data.dist < this.attackRange) {
      /* Check to see if any enemies are in attack range.  If so, attack! */
      this.isAngered = true;
      this.doAttack(nearest_data.grid);
    
    } else if (nearest_data.dist < this.guardRange) {
      /* Check to see if any enemies are nearby, but out of range.  If so, move toward the enemy */
      let enemy_grid_loc = {
        x: Math.round(nearest_data.obj.x / 32),
        y: Math.round(nearest_data.obj.y / 32)
      }

      this.isAngered = true;
      this.moveTo(enemy_grid_loc);

    
    } else {
      /* Check for distance to grid location.  If tether is exceeded, move to ai target */
      this.moveTo(this.aiTarget);
    }

  }

  /* Move / Patrol */
  fsmMove () {
    this.isAngered = false;
    let my_loc = { 
      x: Math.round(this.obj.x / 32),
      y: Math.round(this.obj.y / 32)
    }

    /* Blindly go forth to our destination */
    this.moveTo(this.aiTarget);

    /* If we have reached the destination, switch to stationary AI */
    if ((my_loc.x == this.aiTarget.x) &&
        (my_loc.y == this.aiTarget.y)) {
      this.fsm = this.fsmStop;
    }
  }

  fsmPatrol () {
    this.isAngered = false;
    let nearest_data = this.getNearestEnemy();

    if (nearest_data.obj == null) {
      this.moveTo(this.aiTarget);
    } else if (nearest_data.dist < this.attackRange) {
      /* Check to see if any enemies are in attack range.  If so, attack! */
      this.isAngered = true;
      this.doAttack(nearest_data.grid);
    
    } else if (nearest_data.dist < this.guardRange) {
      /* Check to see if any enemies are nearby, but out of range.  If so, move toward the enemy */
      let enemy_grid_loc = {
        x: Math.round(nearest_data.obj.x / 32),
        y: Math.round(nearest_data.obj.y / 32)
      }
      this.isAngered = true;
      this.moveTo(enemy_grid_loc);

    
    } else {
      /* Check for distance to grid location.  If tether is exceeded, move to ai target */
      let my_loc = { 
        x: Math.round(this.obj.x / 32),
        y: Math.round(this.obj.y / 32)
      }
  
      /* Blindly go forth to our destination */
      this.moveTo(this.aiTarget);
  
      /* If we have reached the destination, switch to stationary AI */
      if ((my_loc.x == this.aiTarget.x) &&
          (my_loc.y == this.aiTarget.y)) {
        this.fsm = this.fsmGuard;
      }
    }
  }

  /* Attack */
  fsmAttack () {
    this.isAngered = false;
    /* Find our quary.  In this case AI target is the name. */
    let quary = this.army.targets_grp.reduce( (target, enemy) => {
      if (enemy.name == this.aiTarget) { return enemy };
      return target;
    });

    if (quary.dead) {
      let my_loc = { 
        x: Math.round(this.obj.x / 32),
        y: Math.round(this.obj.y / 32)
      }
      this.aiTarget = my_loc;

      if (this.aggressive) {
        this.fsm = this.fsmGuard;
      } else {
        this.fsm = this.fsmStop;
      }
      return;
    }

    if (quary) {
      let target_loc = { 
        x: Math.round(quary.x / 32),
        y: Math.round(quary.y / 32)
      }
      let enemy_dist = Math.sqrt( Math.pow(this.obj.x - quary.x, 2) + Math.pow(this.obj.y - quary.y, 2) );
      if (enemy_dist < this.attackRange) {
        /* If they are in attack range, then attack */
        this.isAngered = true;
        this.doAttack(target_loc);

      } else {
        /* If they are not in attack range, move towards them */
        this.isAngered = true;
        this.moveTo(target_loc);
      }
    } else {
    /* If target cannot be found, switch to guard mode, with current location as aiTarget */
      let my_loc = { 
        x: Math.round(this.obj.x / 32),
        y: Math.round(this.obj.y / 32)
      }
      this.aiTarget = my_loc;

      if (this.aggressive) {
        this.fsm = this.fsmGuard;
      } else {
        this.fsm = this.fsmStop;
      }
    }
  }


  setAggressive (aggressive_mode) {
    if (aggressive_mode != this.aggressive) {
      console.log(this.name + " is " + (aggressive_mode) ? "aggressive!" : "non-aggro.");
      this.aggressive = aggressive_mode;
      if (this.fsm == this.fsmStop)   { this.fsm = this.fsmGuard }
      if (this.fsm == this.fsmMove)   { this.fsm = this.fsmPatrol }
      if (this.fsm == this.fsmGuard)  { this.fsm = this.fsmStop }
      if (this.fsm == this.fsmPatrol) { this.fsm = this.fsmMove }
    }
  }

  orderHalt () {
    let my_loc = { 
      x: Math.round(this.obj.x / 32),
      y: Math.round(this.obj.y / 32)
    }
    this.aiTarget = my_loc;
    this.fsm = (this.aggressive) ? this.fsmGuard : this.fsmStop;
  }

  orderMove (grid_loc) {
    this.aiTarget = grid_loc;
    this.fsm = (this.aggressive) ? this.fsmPatrol : this.fsmMove;
  }

  orderAttack(enemy_name) {
    this.aiTarget = enemy_name;
    this.fsm = this.fsmAttack;
  }

  update () {
    super.update();
    this.updateCooldown();

    if (this.dead == false) {
      this.fsm();
    }
  }

}

class BlueSoldier extends SmartSprite {
  constructor (army, scene) {
    super(army, scene, 'blue_soldier', 'sprites/characters/blue_soldier.png');
    this.isLargeSpritesheet = true;
  }
}

class BlueMage extends SmartSprite {
  constructor (army, scene) {
    super(army, scene, 'blue_mage', 'sprites/characters/blue_mage.png');
    this.isLargeSpritesheet = false;
  }
}

class BlueArcher extends SmartSprite {
  constructor (army, scene) {
    super(army, scene, 'blue_archer', 'sprites/characters/river_archer.png');
    this.isLargeSpritesheet = false;
  }
}



class RedSoldier extends SmartSprite {
  constructor (army, scene) {
    super(army, scene, 'red_soldier', 'sprites/characters/zombie_soldier.png');    
    this.isLargeSpritesheet = true;
  }
}

class RedMage extends SmartSprite {
  constructor (army, scene) {
    super(army, scene, 'red_mage', 'sprites/characters/ogre_mage.png');    
    this.isLargeSpritesheet = false;
  }
}

class RedArcher extends SmartSprite {
  constructor (army, scene) {
    super(army, scene, 'red_archer', 'sprites/characters/skel_archer.png');    
    this.isLargeSpritesheet = false;
  }
}

