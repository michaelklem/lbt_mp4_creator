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
      const query = `select story_id, mp4_id from mp4_queue where process_as_mp4 = 1 LIMIT 1`;
      let results = await this.query(query);
      if (results && results[0]) {
        const nextStoryId =  results[0].story_id;
        nextStory = await this.getStory( nextStoryId )
        return {"story":nextStory, "mp4_id":results[0].mp4_id};
      }
      else {
        return null;
      }
    } 
    catch(err) {
      logger.error(`[getNextStory]: ${err}`);
      return null;
    }
  }

  async getPages(story_id) {
    let pages = null;

    try {
      const query = `select * from story_pages where story_id = ? and page_num != -1 order by page_num
`;
			let results = await this.query(query,[story_id]);
      if (results) {
        pages =  results;
      }

      return pages;
    } 
    catch(err) {
      logger.error(`[getPages] Error: ${err}`);
      return null;
    }
  }

  async getStory(storyId) {
    const s = new Story(storyId);
    await s.loadStory()
    return s;
  }  

  async startProcessing(storyId) {
    try {
      const query = `update mp4_queue set is_processing = 1 where story_id = ?`
			await this.query(query, [storyId]);
    } 
    catch(err) {
      logger.error(`[startProcessing] Error: ${err}`);
      return null;
    }
  }

  async videoCompiled(story, output_filename){
    try {
      const query = `update mp4_queue 
      set is_processing = 0,
      is_complied = 1,
      date_complied = now(),
      process_as_mp4 = 0,
      mp4_job_completed_date = now(),
      file_name = ?
      where story_id = ?`;

			await this.query(query, [output_filename, story.data.story_id]);

      const story_query = `update stories 
      set file_name = ?
      where story_id = ?`;
			await this.query(story_query, [output_filename, story.data.story_id]);

		// if buyer_user_id == story->user_id
		// then set the process_as_mp4 flag for the story
		// this will prevent the user from re-issuing a story to be processed
    // this does not seem to make sense. Keeping it for legacy purposes.
		if (story.data.buyer_user_id === story.data.user_id)
		{
      const story_query2 = `update stories 
      set process_as_mp4 = 0
      where story_id = ?`;
			await this.query(story_query2, [story.data.story_id]);
		}
    }
    catch(err) {
      logger.error(`[videoCompiled] Error: ${err}`);
    }

  }
}