var Logger = require('./Logger');
var logger = Logger.logger();
const QueryRunner = require('./QueryRunner.js');

class Story extends QueryRunner {

  constructor(story_id) {
    super();
    this.story_id = story_id;
  }


  async loadStory() {
    try {      
      // const query = `select * from stories where story_id = ?`;
      const query = `select s.*, u.bucket_path from stories s
      join users u on u.user_id = s.user_id
      where s.story_id = ?`;
			let results = await this.query(query, [this.story_id]);
      if (results && results[0]) {
        logger.info(`story data: ${JSON.stringify(results[0])}`)
      }

      this.data = results[0];

      return this;
    } 
    catch(err) {
      logger.error(`[getNextStory] Error: ${err}`);
      return null;
    }  
  }

  async setFilename(title) {
    try {      
      const query = `update stories set file_name = ? where story_id = ?`;
			await this.query(query, [title, this.story_id]);
    } 
    catch(err) {
      logger.error(`[getNextStory] Error: ${err}`);
      return null;
    }  
  }
}

module.exports = Story;
