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
      logger.info('[TextOverlay] before html: ' + this.text)
      this.text = HTMLUtil.removeHTML(this.text)
      logger.info('[TextOverlay] after html: ' + this.text)

      const textToImage = new UltimateTextToImage(this.text, {
        width: 600,
        maxWidth: 600,
        fontSize: 18,
        minFontSize: 10,
        fontFamily: 'Arial, Sans',
        //lineHeight: 30,
        margin: 5,
        maxHeight: 120,
        height:120,
        backgroundColor: '#f2f2f2',
        align:'center',
        valign:'middle'
      })
      await textToImage.render().toFile(this.textImage);
      const measuredParagraph = textToImage.measuredParagraph; 
      // logger.info(`[XXXXXXXXXXXXXXXXXXX] ${JSON.stringify(measuredParagraph)}`)
      logger.info('[TextOverlay] combined text image file save to: ' + this.textImage)
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

      logger.info('[CreateImage] this.taleImage: ' + this.taleImage)
      logger.info('[CreateImage] this.textImage: ' + this.textImage)

      const dataUri = await mergeImages([
        { src: this.taleImage, x: 0, y: 0 },
        { src: this.textImage, x: 0, y: 421 } // the text image is rendered under the page art
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