const DataModel = require('./DataModel');
const ImageModel = require('./ImageModel');
var Logger = require('./Logger');
var logger = Logger.logger();
const config = require('../config.json');
const fs = require('fs');
const spawn = require('await-spawn')


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
        await this.dm.startProcessing( story.data.story_id )
        this.story_id = story.data.story_id
        this.user_id = story.data.user_id
        this.setStoryDirectories()
        this.createDirectories()
        // if (fs.existsSync(this.firstImagePath)) {
          // not using this code
        // }

        if (fs.existsSync(this.lastImagePath)) {
          await this.createAudioFile(null, this.tempAudioDirectoryPrefix+ "last" + story.story_id + ".flv");
          // this.createCopies(this.lastImagePath, 0);
        }
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
        fs.mkdirSync(this.storyVideoDirectoryPrefix, { recursive: true })
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
        fs.mkdirSync(this.tempUserDirectoryPrefix, { recursive: true })
        logger.info('[createDirectories] Created user directory: ' + this.tempUserDirectoryPrefix)
      }

      if (! fs.existsSync(this.tempStoryDirectoryPrefix)) {
        fs.mkdirSync(this.tempStoryDirectoryPrefix, { recursive: true })
        logger.info('[createDirectories] Created story directory: ' + this.tempStoryDirectoryPrefix)
      }

      if (! fs.existsSync(this.tempImagesDirectoryPrefix)) {
        fs.mkdirSync(this.tempImagesDirectoryPrefix, { recursive: true })
        logger.info('[createDirectories] Created images directory: ' + this.tempImagesDirectoryPrefix)
      }

      if (! fs.existsSync(this.tempAudioDirectoryPrefix)) {
        fs.mkdirSync(this.tempAudioDirectoryPrefix, { recursive: true })
        logger.info('[createDirectories] Created audio directory: ' + this.tempAudioDirectoryPrefix)
      }
    }
    catch(err){
      logger.info('[createDirectories] Error: ' + err)    
    }
  } // create directories

  async createAudioFile(sourcePath, destPath) {
    try {
      if (sourcePath != null && sourcePath != "") {
        logger.info('[createAudioFile] sourcePath: ' + sourcePath);
        let duration = await this.getDuration(sourcePath);
        if (duration === 0) {
          sourcePath = this.emptyAudio;
        }
      }
      else
      {
        sourcePath = this.emptyAudio;
        let duration = await this.getDuration(sourcePath);

      }

      // Copy the source to the temp directory to be worked on
      logger.info(`[createAudioFile] copying ${sourcePath} to ${destPath}`);
      fs.copyFileSync(sourcePath, destPath);
      this.audioFiles.push(destPath)
    }
    catch(err){
      logger.info('[createAudioFile] Error: ' + err)
    }
  }

  // call system command to get duration:
  // ffprobe -i testAudio.flv -show_entries format=duration -v quiet -of csv="p=0"
  // ffprobe -v quiet -print_format compact=print_section=0:nokey=1:escape=csv -show_entries format=duration "/opt/mp4_utility/testAudio.flv"

  // which returns duration in seconds 5.434000 for 5.43 seconds
  async getDuration(filePath) {
    let duration = 0;

    try {
      logger.info('[getDuration] filePath: ' + filePath)

      let cmd = config.ffprobe_commandline;
      cmd = cmd.replace('%input_file%', filePath);

      logger.info('[getDuration] cmd: ' + cmd);
      let args = [
          '-i', filePath,
          '-v','quiet',
          '-print_format','compact=print_section=0:nokey=1:escape=csv',
          '-show_entries', 'format=duration'
      ];

      duration = await spawn('/usr/bin/ffprobe', args);
      console.log('[getDuration] duration: ' + duration)
      return duration
    } 
    catch (e) {
      console.log('[getDuration] Error: ' + e.stderr.toString())
      throw e
    }
  }
  
}

module.exports = Program;
