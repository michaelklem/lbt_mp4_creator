const QueryRunner = require('./QueryRunner.js');
const Story = require('./Story.js');
var Logger = require('./Logger');
var logger = Logger.logger();

module.exports = class DataModel extends QueryRunner {
  constructor() {
    super();
  }

  async getNextStory() {
    let nextStory = null;

    try {
      const query = `select story_id from mp4_queue where is_complied = 0 AND is_processing = 0 AND is_error=0 LIMIT 1`;
			let results = await this.query(query);
      if (results && results[0]) {
        const nextStoryId =  results[0].story_id;
        nextStory = await this.getStory( nextStoryId )
      }

      return nextStory;
    } 
    catch(err) {
      logger.error(`[getNextStory] Error: ${err}`);
      return null;
    }
  }

  async getStory(storyId) {
    try {
      const s = new Story(storyId);
      await s.loadStory()
      return s;
    } 
    catch(err) {
      logger.error(`[getNextStory] Error: ${err}`);
      return null;
    }
  }  
}