var Logger = require('./Logger');
var logger = Logger.logger();
const fs = require('fs');

module.exports = class ImageModel {
  constructor() {
    this.text = '';
    this.textImage = null;
    this.taleImage = null;
    this.textBG = null;
    this.combineImage = null;
    this.image = null;
  }

  TextOverlay() {
    try {
      logger.info(`[TextOverlay] reading: ${this.textBG}`)
      this.image = fs.readFileSync(this.textBG);
    }
    catch(err) {
      logger.info('[TextOverlay] Error: ' + err)    
    }
  }
}