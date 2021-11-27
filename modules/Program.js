const DataModel = require('./DataModel');
const ImageModel = require('./ImageModel');
var Logger = require('./Logger');
var logger = Logger.logger();
const config = require('../config.json');

class Program {

  constructor() {
    this.isProcessing = false;
    this.audioFiles = [];
    this.imageCount = 0;
    this.duration = 0;
    this.dm = new DataModel();
    this.mm = new ImageModel();
  }

  async process() {
    const story = await this.dm.getNextStory()
    if (story) {
      logger.info(`Story id found to process: ${story.data.story_id}`);
    
    }
    else {
      logger.info('No story found to process.');
    }
  }

}

module.exports = Program;
