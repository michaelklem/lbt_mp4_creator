const DataModel = require('./DataModel');
const ImageModel = require('./ImageModel');
var Logger = require('./Logger');
var logger = Logger.logger();
const config = require('../config.json');
const fs = require('fs');

class Program {

  constructor() {
    this.isProcessing = false;
    this.audioFiles = [];
    this.imageCount = 0;
    this.duration = 0;
    this.dm = new DataModel();
    this.mm = new ImageModel();
    this.directoryPrefix = config.userdirectory;
    this.emptyAudio = config.emptyaudio;
    this.tempDirectoryPrefix = config.tempdirectory;
    this.storyDirectoryPrefix = "";
    this.storyImagesDirectoryPrefix = "";
    this.storyAudioDirectoryPrefix = "";
    this.storyVideoDirectoryPrefix = "";
    this.tempStoryDirectoryPrefix = "";
    this.tempImagesDirectoryPrefix = "";
    this.tempAudioDirectoryPrefix = "";
    this.tempUserDirectoryPrefix = "";
    this.firstImagePath = config.firstimage;
    this.lastImagePath = config.lastimage;
    this.textBG = config.textbg;
    this.ffmpegPath = config.ffmpegpath;
    this.mp4BoxPath = config.mp4boxpath;
    this.flvBindPath = config.flvbindpath;
    this.defaultImagePath = config.defaultimagepath;
  }

  async process() {
    const story = await this.dm.getNextStory()
    if (story) {
      await this.compileVideo(story)
    }
    else {
      logger.info('[Program.process] No story found to process.');
    }
  }

  async compileVideo(story) {
    logger.info(`[Program.compileVideo] processing story id: ${story.data.story_id}`)
    if (! this.isProcessing) {
      this.isProcessing = true;
      this.audioFiles = [];
      this.duration = 0;
      this.imageCount = 0;

      try {
        this.dm.startProcessing( story.data.story_id )
        this.story_id = story.data.story_id
        this.user_id = story.data.user_id
        this.setStoryDirectories()
        this.createDirectories()
      }
      catch(err) {
        logger.info(`[Program.compileVideo] Error: ${err}`)
      }
    } // this.isProcessing
    else {
      logger.info(`Story: ${story.data.story_id} is already being processed.`)
    }
  } // compileVideo

  setStoryDirectories() {
    try {
      this.storyDirectoryPrefix = this.directoryPrefix + this.user_id + "/";
      this.storyImagesDirectoryPrefix = this.storyDirectoryPrefix + "images/";
      this.storyAudioDirectoryPrefix = this.storyDirectoryPrefix + "audio/";
      this.storyVideoDirectoryPrefix = this.storyDirectoryPrefix + "video/";
      logger.info('[setStoryDirectories] exists test: ' + this.storyVideoDirectoryPrefix)
      if (! fs.existsSync(this.storyVideoDirectoryPrefix)) {
        fs.mkdirSync(this.storyVideoDirectoryPrefix)
        logger.info('Created directory: ' + this.storyVideoDirectoryPrefix)
      }
    }
    catch(err){
      logger.info('[setStoryDirectories] Error: ' + err)
    }
  }

  createDirectories() {
    try {
      if (! fs.existsSync(this.tempDirectoryPrefix)) {
        fs.mkdirSync(this.tempDirectoryPrefix)
      }

      this.tempUserDirectoryPrefix = this.tempDirectoryPrefix + this.user_id +"/";
      this.tempStoryDirectoryPrefix = this.tempDirectoryPrefix + this.user_id +"/" + this.story_id + "/";
      this.tempImagesDirectoryPrefix = this.tempStoryDirectoryPrefix + "Images/";
      this.tempAudioDirectoryPrefix = this.tempStoryDirectoryPrefix + "Audio/";
      if (fs.existsSync(this.tempStoryDirectoryPrefix)) {
        logger.info('[createDirectories] Deleting directory: ' + this.tempStoryDirectoryPrefix);
        fs.rmdirSync(this.tempStoryDirectoryPrefix, { recursive: true });
      }

      if (! fs.existsSync(this.tempUserDirectoryPrefix)) {
        fs.mkdirSync(this.tempUserDirectoryPrefix)
        logger.info('[createDirectories] Created user directory: ' + this.tempUserDirectoryPrefix)
      }

      if (! fs.existsSync(this.tempStoryDirectoryPrefix)) {
        fs.mkdirSync(this.tempStoryDirectoryPrefix)
        logger.info('[createDirectories] Created story directory: ' + this.tempStoryDirectoryPrefix)
      }

      if (! fs.existsSync(this.tempImagesDirectoryPrefix)) {
        fs.mkdirSync(this.tempImagesDirectoryPrefix)
        logger.info('[createDirectories] Created images directory: ' + this.tempImagesDirectoryPrefix)
      }

      if (! fs.existsSync(this.tempAudioDirectoryPrefix)) {
        fs.mkdirSync(this.tempAudioDirectoryPrefix)
        logger.info('[createDirectories] Created audio directory: ' + this.tempAudioDirectoryPrefix)
      }
    }
    catch(err){
      logger.info('[createDirectories] Error: ' + err)    
    }
  }
}

module.exports = Program;
