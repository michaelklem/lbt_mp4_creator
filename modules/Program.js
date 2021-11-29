const DataModel = require('./DataModel');
const ImageModel = require('./ImageModel');
var Logger = require('./Logger');
var logger = Logger.logger();
const config = require('../config.json');
const fs = require('fs');
const spawn = require('await-spawn')
const axios = require('axios');
const HTMLUtil = require('./HTMLUtil');

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
  
  	// keeps track of all the image and audio files that have been merged
    this.combineMPGFiles = []
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
      this.pageCounter = 0;

      try {
        logger.info('xxxxx')
        await this.dm.startProcessing( story.data.story_id )
        logger.info('xxxxx2')
        this.story_id = story.data.story_id
        this.user_id = story.data.user_id
        this.setStoryDirectories()
        this.createDirectories()

        // cover page + audio
        let image_file_name = this.tempImagesDirectoryPrefix + this.pageCounter + ".png";
        let audio_file_name = this.pageCounter + ".flv";
        // let audio_file_name = this.tempAudioDirectoryPrefix + this.pageCounter + ".flv";
        
        await this.createImage(
          HTMLUtil.removeHTML(story.data.title),
          this.tempStoryDirectoryPrefix + "text" + story.data.story_id + ".png",
          this.storyImagesDirectoryPrefix + story.data.image_path,
          image_file_name);
        // await this.createImage(
        //   HTMLUtil.removeHTML(story.data.title),
        //   this.tempStoryDirectoryPrefix + "text" + story.data.story_id + ".png",
        //   this.storyImagesDirectoryPrefix + story.data.image_path,
        //   this.tempStoryDirectoryPrefix + story.data.story_id + ".png");

        await this.createAudioFile(
          this.storyAudioDirectoryPrefix + story.data.audio_path,
          this.tempAudioDirectoryPrefix,
          this.remoteAudioFilePath + story.data.audio_path,
          audio_file_name);
        // await this.createAudioFile(
        //   this.storyAudioDirectoryPrefix + story.data.audio_path,
        //   this.tempAudioDirectoryPrefix,
        //   this.remoteAudioFilePath + story.data.audio_path,
        //   `story${story.data.story_id}.flv`);

        // await this.createCopies(this.tempStoryDirectoryPrefix + story.data.story_id + ".png", this.duration);
        await this.combineImageAndAudio(image_file_name, this.tempAudioDirectoryPrefix + audio_file_name);

        logger.info('Processing pages...')
        let _storyPages = [];
        if (false) {
          const storyPages = await this.dm.getPages(story.data.story_id);
          for (let page of storyPages) {
            console.log('xxxxx page: ' + JSON.stringify(page))
            this.duration = 0;

            image_file_name = this.tempImagesDirectoryPrefix + this.pageCounter + ".png";
            audio_file_name = this.tempAudioDirectoryPrefix + this.pageCounter + ".flv";

            await this.createImage(
              HTMLUtil.removeHTML(page.body),
              this.tempStoryDirectoryPrefix + "text" + page.page_num + ".png",
              this.storyImagesDirectoryPrefix + page.image_path,
              image_file_name);
            // await this.createImage(
            //   HTMLUtil.removeHTML(page.body),
            //   this.tempStoryDirectoryPrefix + "text" + page.page_num + ".png",
            //   this.storyImagesDirectoryPrefix + page.image_path,
            //   this.tempStoryDirectoryPrefix + "combine" + page.story_page_id + ".png");

            await this.createAudioFile(
              this.storyAudioDirectoryPrefix + page.audio_path,
              this.tempAudioDirectoryPrefix,
              this.remoteAudioFilePath + page.audio_path,
              audio_file_name);
            // await this.createAudioFile(
            //   this.storyAudioDirectoryPrefix + page.audio_path,
            //   this.tempAudioDirectoryPrefix,
            //   this.remoteAudioFilePath + page.audio_path,
            //   `page${page.story_page_id}.flv`);

            // await this.createCopies(this.tempStoryDirectoryPrefix + "combine" + page.story_page_id + ".png", this.duration);
            await this.combineImageAndAudio(image_file_name, audio_file_name)

          } // for       
        } // if true
        logger.info('Done processing pages')

        // if (fs.existsSync(this.lastImagePath)) {
        //   await this.createAudioFile(null, this.tempAudioDirectoryPrefix+ "last" + story.data.story_id + ".flv", null);
        //   // this.createCopies(this.lastImagePath, 0);
        // }

        this.mergeAudio(story.data.story_id)
      }
      catch(err) {
        logger.info(`[Program.compileVideo] Error: ${err.stack}`)
      }
    } // this.isProcessing
    else {
      logger.info(`Story: ${story.data.story_id} is already being processed.`)
    }
  } // compileVideo

  setStoryDirectories() {
    try {
      this.storyDirectoryPrefix = this.directoryPrefix + this.user_id + "/";
      this.remoteUsersdirectory = config.remoteUsersdirectory + this.user_id + "/";
      this.storyImagesDirectoryPrefix = this.storyDirectoryPrefix + "images/";
      this.storyAudioDirectoryPrefix = this.storyDirectoryPrefix + "audio/";
      this.storyVideoDirectoryPrefix = this.storyDirectoryPrefix + "video/";
      this.remoteAudioFilePath = this.remoteUsersdirectory + "audio/";
      this.remoteImageFilePath = this.remoteUsersdirectory + "images/";

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
      this.tempImagesDirectoryPrefix = this.tempStoryDirectoryPrefix + "images/";
      this.tempAudioDirectoryPrefix = this.tempStoryDirectoryPrefix + "audio/";
 		  this.tempVideoDirectoryPrefix = this.tempStoryDirectoryPrefix + "video/";
     if (fs.existsSync(this.tempStoryDirectoryPrefix)) {
        logger.info('[createDirectories] Deleting directory: ' + this.tempStoryDirectoryPrefix);
        fs.rmSync(this.tempStoryDirectoryPrefix, { recursive: true })
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

      if (! fs.existsSync(this.tempVideoDirectoryPrefix)) {
        fs.mkdirSync(this.tempVideoDirectoryPrefix, { recursive: true })
        logger.info('[createDirectories] Created video directory: ' + this.tempVideoDirectoryPrefix)
      }
    }
    catch(err){
      logger.info('[createDirectories] Error: ' + err)    
    }
  } // create directories

  async createAudioFile(sourcePath, destPath, remoteFile, destFileName) {
    try {
      if (sourcePath != null && sourcePath != "") {
        logger.info('[createAudioFile] sourcePath: ' + sourcePath);
        logger.info('[createAudioFile] destPath: ' + destPath);
        logger.info('[createAudioFile] remoteFile: ' + remoteFile);
        logger.info('[createAudioFile] destFileName: ' + destFileName);

        console.log(`[createAudioFile] Downloading audio file: ${remoteFile} to ${destPath}`)
        try {
          const payload = {"bucketName": "lbtassets232304", 
          "sourceFile": remoteFile, 
          "sourceFileMed": '',
          "sourceFileSml": '',

          "destinationFileDirectory": destPath, 
          "destinationFileName": destFileName, 
          "destinationFileNameMed": '', 
          "destinationFileNameSml": '', 
          };

          const url = `${config.storj_service_url}downloadSelectedImage`;
          console.log(`[createAudioFile] download file url: ${url}`);
          const response = await axios.post(url, payload)
          console.log('[createAudioFile] response' + JSON.stringify(response.data));
        } catch (error) {
          console.log('[createAudioFile] Downloading error ' + error);
        }

        sourcePath = destPath + destFileName
        this.duration = await this.getDuration(sourcePath);
        if (this.duration === 0) {
          sourcePath = this.emptyAudio;
        }
      }
      else
      {
        sourcePath = this.emptyAudio;
        // Copy the source to the temp directory to be worked on
        // logger.info(`[createAudioFile] copying ${sourcePath} to ${destPath}`);
        await fs.copyFileSync(sourcePath, destPath);
      }

      this.audioFiles.push(sourcePath)
    }
    catch(err){
      logger.info('[createAudioFile] Error: ' + err.stack)
    }
  }

  // call system command to get duration:
  // ffprobe -v quiet -print_format compact=print_section=0:nokey=1:escape=csv -show_entries format=duration "/opt/mp4_utility/testAudio.flv"
  // which returns duration in seconds 5.434000 for 5.43 seconds
  async getDuration(filePath) {
    let duration = 0;

    try {
      logger.info('[getDuration] filePath: ' + filePath)

      let args = [
          '-i', filePath,
          '-v','quiet',
          '-print_format','compact=print_section=0:nokey=1:escape=csv',
          '-show_entries', 'format=duration'
      ];

      duration = await spawn('/usr/bin/ffprobe', args);
      console.log('[getDuration] duration: ' + duration)
      return Math.ceil(duration)
    } 
    catch (e) {
      console.log('[getDuration] Error: ' + e.stderr.toString())
      throw e
    }
  }

  async createImage(text, textImage, taleImage, combineImage) {
    this.mm.text = text;
    this.mm.textImage = textImage;
    this.mm.taleImage = taleImage;
    this.mm.textBG = this.textBG;
    this.mm.combineImage = combineImage;
    await this.mm.TextOverlay();
    this.mm.CreateImage();

    logger.info("createImage: text: " + text);
    logger.info("createImage: textImage: " + textImage);
    logger.info("createImage: taleImage: " + taleImage);
    logger.info("createImage: combineImage: " + combineImage);
  }

  // performs this ffmpeg command:
  // -loop 1 -shortest -y -i %image_file% -i %audio_file% -b:v 1200K -ac 2 %output_file%
  async combineImageAndAudio(image_file, audio_file) { //666
    try {
      logger.info("[combineImageAndAudio] image "+ image_file);
      logger.info("[combineImageAndAudio] audio "+ audio_file);
      let output_file = this.tempVideoDirectoryPrefix + this.pageCounter +".mpg";
      logger.info("[combineImageAndAudio] output_file "+ output_file);
      let command = config.ffmpeg_merge_commandline;
      command = command.replace("%image_file%", image_file);
      command = command.replace("%audio_file%", audio_file);
      command = command.replace("%output_file%", output_file);

      if (await fs.existsSync(image_file)) {
        logger.info("[combineImageAndAudio] image_file exists "+ image_file);
      }

      if (await fs.existsSync(audio_file)) {
        logger.info("[combineImageAndAudio] audio_file exists "+ audio_file);
      }

      let args = [
        '-loop','1',
        '-y',
        '-i',image_file,
        '-i',audio_file,
        '-b:v','1200K',
        '-ac','2',
        '-shortest',
        output_file
      ];

      try {
        await spawn(`/usr/local/bin/ffmpeg`, args)

        // await spawn(`/usr/local/bin/ffmpeg ${command}`, []);
        this.combineMPGFiles.push(output_file);
      }
      catch(err) {
        console.log('Spawn error: ' + err)
      }
    }
    catch(err) {
      logger.info('[combineImageAndAudio] Error: ' + err.stack)
    }
  }
  
  async createCopies(imagePath, duration) {
    logger.info('[createCopies] duration: ' + duration)
    let numberofCopies = 0;

    if (duration !== 0) {
      const miliseconds = 1000;
      const minutes = duration/60;
      // think 54 is supposed to be 5 seconds so 54 * 12 = 648 per minute?
      numberofCopies = Math.ceil(minutes * 648);
    }
    else {
      numberofCopies=54;
    }

    logger.info('[createCopies] numberofCopies: ' + numberofCopies)

    for (let i=0; i < numberofCopies; i++) {
      const destination = `${this.tempImagesDirectoryPrefix}${this.imageCount}.png`;
      // logger.info(`[createCopies] copying: ${imagePath} to ${destination}`)

      await fs.copyFileSync(imagePath, destination);
      this.imageCount++;
    }
  } //

  async mergeAudio(storyId) {
    let mergecmdPart= '';
    let codecPart=" -oac copy -ovc copy ";
    let tempOutFilePart=  this.tempAudioDirectoryPrefix + "mergeAudio.mp3 " ;
    let OutAudioFilePart=  this.tempAudioDirectoryPrefix + "mergeAudio_MP3WRAP.mp3 " ;
    let OutAudioFilePartRaw=  this.tempAudioDirectoryPrefix + "mergeAudio_MP3WRAP.mp3 " ;
    let tempVOutFilePart=   this.tempAudioDirectoryPrefix + storyId +".mp4 " ;
    let OutFilePart=   this.storyVideoDirectoryPrefix + storyId +".mp4 " ;
    let command = "";

    try {
      for (let audioFile of this.audioFiles) {
        logger.info(`Processing audio file: ${audioFile}`);
        const infilename = audioFile.substring(0,audioFile.length-4);
        const outfilename = infilename +".mp3  ";
        logger.info(`[mergeAudio] infilename: ${infilename}`)
        logger.info(`[mergeAudio] outfilename: ${outfilename}`)

        let args = [
            '-i', `${infilename}.flv`,
            '-acodec', 'libmp3lame',
            '-y',outfilename
        ];

        await spawn('/usr/local/bin/ffmpeg', args);
        mergecmdPart += outfilename



        // command = ffmpegPath + " -f image2 -r 10 -i " +  tempImagesDirectoryPrefix+"%05d.png"+ " -i " + OutAudioFilePart +  " -vcodec libx264 -vpre slow -acodec libfaac -y " + tempVOutFilePart;
        args = [
            '-f', 'image2',
            '-r', '10',
            '-i',`${this.tempImagesDirectoryPrefix}%05d.png`, 
            '-i', OutAudioFilePart,
            '-vcodec', 'libx264',
            '-vpre','slow',
            '-acodec', 'libfaac',
            '-y', tempVOutFilePart
        ];

        await spawn('/usr/local/bin/ffmpeg', args);

        // deleteDirectory tempStoryDirectoryPrefix
      } // for
    }
    catch(err) {
      logger.info(`[mergeAudio] Error: ${err.stack}`)
    }
  }
}

module.exports = Program;
