class BasicObject {
  constructor (scene) {
    this.scene = scene;
    this.init = this.init.bind(this);
    this.preload = this.preload.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.addObject = this.addObject.bind(this);
    this.objects = {};
  }

  init ()    { Object.keys(this.objects).forEach((key) => this.objects[key].init()); }
  preload () { Object.keys(this.objects).forEach((key) => this.objects[key].preload()); }
  create ()  { Object.keys(this.objects).forEach((key) => this.objects[key].create()); }
  update ()  { Object.keys(this.objects).forEach((key) => this.objects[key].update()); }

  addObject (key, basic_object) {
    this.objects[key] = basic_object;
  }
}


class BasicScene extends Phaser.Scene {
  constructor (key) {
    super(key);
    this.key = key;
    this.init = this.init.bind(this);
    this.preload = this.preload.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.addObject = this.addObject.bind(this);
    this.objects = {};
  }

  addObject (key, basic_object) {
    this.objects[key] = basic_object;
  }

  init ()    { Object.keys(this.objects).forEach((key) => this.objects[key].init()); }
  preload () { Object.keys(this.objects).forEach((key) => this.objects[key].preload()); }
  create ()  { Object.keys(this.objects).forEach((key) => this.objects[key].create()); }
  update ()  { Object.keys(this.objects).forEach((key) => this.objects[key].update()); }
}