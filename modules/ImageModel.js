var Logger = require('./Logger');
var logger = Logger.logger();
const fs = require('fs');
const textToImage = require('text-to-image');

module.exports = class ImageModel {
  constructor() {
    this.text = '';
    this.textImage = null;
    this.taleImage = null;
    this.textBG = null;
    this.combineImage = null;
    this.image = null;
  }

  async TextOverlay() {
    try {
      this.text = 'this is a long piece of lame ass text to see how this module works. Actually it is an npm module. My mistake.'
      // logger.info(`[TextOverlay] reading: ${this.textBG}`)
      // this.image = fs.readFileSync(this.textBG);
      // image = process(image);
      const dataUri = await textToImage.generate(this.text,{
        maxWidth: 600,
        fontSize: 24,
        fontFamily: 'Arial',
        lineHeight: 30,
        margin: 5,
        customHeight: 120
        });
      logger.info('[TextOverlay] dataUri: ' + dataUri)

      // strip off the data: url prefix to get just the base64-encoded bytes
      var data = dataUri.replace(/^data:image\/\w+;base64,/, "");
      var buf = Buffer.from(data, 'base64');
      fs.writeFileSync(this.textImage, buf);    
      logger.info('[TextOverlay] file save to: ' + this.textImage)
    }
    catch(err) {
      logger.info('[TextOverlay] Error: ' + err)
      throw err
    }
  }
}