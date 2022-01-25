var Logger = require('./Logger');
var logger = Logger.logger();
const fs = require('fs');
// const textToImage = require('text-to-image');
const HTMLUtil = require('./HTMLUtil');
const {UltimateTextToImage} = require("ultimate-text-to-image");
const config = require('../config.json');
const mergeImages = require('merge-images');
const { Canvas, Image } = require('canvas');
 

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
      // const dataUri = await textToImage.generate(this.text,{
      //   maxWidth: 600,
      //   fontSize: 24,
      //   fontFamily: 'Arial',
      //   lineHeight: 30,
      //   margin: 5,
      //   customHeight: 120
      //   });
      // logger.info('[TextOverlay] text to image data: ' + dataUri)

      // // strip off the data: url prefix to get just the base64-encoded bytes
      // const data = dataUri.replace(/^data:image\/\w+;base64,/, "");
      // const buf = Buffer.from(data, 'base64');
      // fs.writeFileSync(this.textImage, buf);    

      const textToImage = new UltimateTextToImage(this.text, {
        width: 600,
        maxWidth: 600,
        fontSize: 24,
        // fontFamily: 'Arial',
        lineHeight: 30,
        margin: 5,
        maxHeight: 120,
        height:120,
        backgroundColor: '#ffffff',
        align:'center',
        valign:'middle'
      })
      await textToImage.render().toFile(this.textImage);

      logger.info('[TextOverlay] text image file save to: ' + this.textImage)
    }
    catch(err) {
      logger.info('[TextOverlay] Error: ' + err)
      throw err
    }
  }

  // combines the page art and text image
  async CreateImage() {
    try {
      if (! fs.existsSync(this.taleImage)) {
        this.taleImage = config.defaultimagepath
      }

      const dataUri = await mergeImages([
        { src: this.taleImage, x: 0, y: 0 },
        { src: this.textImage, x: 0, y: 420 } // the text image is rendered under the page art
      ], {
        Canvas: Canvas,
        Image: Image,
        height:420 + 120 // height of art and text images
      })

      // strip off the data: url prefix to get just the base64-encoded bytes
      const data = dataUri.replace(/^data:image\/\w+;base64,/, "");
      const buf = Buffer.from(data, 'base64');
      await fs.writeFileSync(this.combineImage, buf);    
      logger.info('[CreateImage] combined file: ' + this.combineImage)
    }
    catch(err) {
      logger.info('[CreateImage] Error: ' + err)
      throw err
    }
  }
}