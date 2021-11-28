var Logger = require('./Logger');
var logger = Logger.logger();
const fs = require('fs');
const textToImage = require('text-to-image');
const HTMLUtil = require('./HTMLUtil');

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
      // this.text = '   <foo><br/> this is a long piece of lame ass text to see how this module works. Actually it is an npm module. My mistake.<div>sef</div>\r\n  '
      logger.info('[TextOverlay] before html: ' + this.text)
      this.text = HTMLUtil.removeHTML(this.text)
      logger.info('[TextOverlay] after html: ' + this.text)
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
      logger.info('[TextOverlay] text to image data: ' + dataUri)

      // strip off the data: url prefix to get just the base64-encoded bytes
      const data = dataUri.replace(/^data:image\/\w+;base64,/, "");
      const buf = Buffer.from(data, 'base64');
      fs.writeFileSync(this.textImage, buf);    
      logger.info('[TextOverlay] text image file save to: ' + this.textImage)
    }
    catch(err) {
      logger.info('[TextOverlay] Error: ' + err)
      throw err
    }
  }
}