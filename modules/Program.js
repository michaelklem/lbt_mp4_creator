const DataModel = require('./DataModel');
const ImageModel = require('./ImageModel');
var Logger = require('./Logger');
var logger = Logger.logger();
const config = require('../config.json');
const fs = require('fs');
const spawn = require('await-spawn')
const axios = require('axios');
const HTMLUtil = require('./HTMLUtil');
const { execSync } = require('child_process');

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
    const json = await this.dm.getNextStory()
    if (json) {
      const story = json.story;
      const mp4_id = json.mp4_id;
      await this.compileVideo(story, mp4_id)
      process.exit()
    }
    else {
      logger.info('[Program.process] No story found to process.');
      process.exit();
    }
  }

  async compileVideo(story, mp4_id) {
    logger.info(`[Program.compileVideo] processing story id: ${story.data.story_id}`)
    if (! this.isProcessing) {
      this.isProcessing = true;
      this.audioFiles = [];
      this.duration = 0;
      this.imageCount = 0;
      this.pageCounter = 0;

      try {
        await this.dm.startProcessing( story.data.story_id )
        this.story_id = story.data.story_id
        this.user_id = story.data.user_id
        this.user_bucket_path = `${story.data.bucket_path}/${story.data.user_id}`
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
          this.tempImagesDirectoryPrefix + story.data.image_path,
          this.remoteImageFilePath + story.data.image_path,
          image_file_name, this.pageCounter + ".png");

        await this.createAudioFile(
          this.storyAudioDirectoryPrefix + story.data.audio_path,
          this.tempAudioDirectoryPrefix + story.data.audio_path,
          this.remoteAudioFilePath + story.data.audio_path,
          audio_file_name);

        // await this.combineImageAndAudio(this.tempImagesDirectoryPrefix + story.data.image_path, this.tempAudioDirectoryPrefix + story.data.audio_path);
        await this.combineImageAndAudio(this.mm.combineImage, this.tempAudioDirectoryPrefix + story.data.audio_path);

        logger.info('Processing pages...')
        let _storyPages = [];
        if (true) {
          const storyPages = await this.dm.getPages(story.data.story_id);
          for (let page of storyPages) {
            this.duration = 0;
            ++this.pageCounter;

            image_file_name = this.tempImagesDirectoryPrefix + this.pageCounter + ".png";
            audio_file_name = this.pageCounter + ".flv";

            await this.createImage(
              HTMLUtil.removeHTML(page.body),
              this.tempStoryDirectoryPrefix + "text" + page.page_num + ".png",
              this.storyImagesDirectoryPrefix + page.image_path,
              this.tempImagesDirectoryPrefix + page.image_path,
              this.remoteImageFilePath + page.image_path,
              image_file_name, this.pageCounter + ".png", page.image_path);

            await this.createAudioFile(
              this.storyAudioDirectoryPrefix + page.audio_path,
              this.tempAudioDirectoryPrefix + page.audio_path,
              this.remoteAudioFilePath + page.audio_path,
              audio_file_name);

            await this.combineImageAndAudio(this.mm.combineImage, this.tempAudioDirectoryPrefix + page.audio_path);

          } // for       
        } // if true
        logger.info('Done processing pages')

        if (fs.existsSync(this.lastImagePath)) {
            // await this.createImage(
            //   HTMLUtil.removeHTML(page.body),
            //   this.tempStoryDirectoryPrefix + "text" + page.page_num + ".png",
            //   this.storyImagesDirectoryPrefix + page.image_path,
            //   this.tempImagesDirectoryPrefix + page.image_path,
            //   this.remoteImageFilePath + page.image_path,
            //   image_file_name, this.pageCounter + ".png", page.image_path);
            
            // //666
            // await this.createAudioFile(
            //   null,
            //   this.tempAudioDirectoryPrefix,
            //   null,
            //   "last.flv");

            await this.combineImageAndAudio(this.lastImagePath, null);

            // createImage(text, textImage, taleImage*, destPath*, remoteFile "last", combineImage, destFileName)

        }

        // concatenate all image and audio mpg files into a single mpg file
        const output_filename = await this.buildMP4( this.concatenateFiles(), story );

				await this.dm.videoCompiled(story, output_filename);
      }
      catch(err) {
        logger.info(`[Program.compileVideo] Error: ${err.stack}`)
      }

      // tell the web site that we are done
			await this.sendMessageToWebSite(story, mp4_id);

    } // this.isProcessing
    else {
      logger.info(`Story: ${story.data.story_id} is already being processed.`)
    }
  } // compileVideo

  async sendMessageToWebSite(story, mp4_id) {
    try {
      const url = `https://${config.hostname}/tales/mp4Completed/mp4file_id/${mp4_id}`;
      logger.info('[sendMessageToWebSite] url: ' + url);
      await axios.post(url)
      logger.info('[sendMessageToWebSite] success');    
        // .then((response) =>{
        //   logger.info('[sendMessageToWebSite] sucess: ');    
        // })
        // .catch((error) =>{
        //   logger.info('[sendMessageToWebSite] error: ' + err.stack);
        // })
    }
    catch(err )
    {
      logger.info('[sendMessageToWebSite] Error: ' + err.stack);
    }
  }

  setStoryDirectories() {
    try {
      // this.storyDirectoryPrefix = this.directoryPrefix + this.user_id + "/"; 
      this.storyDirectoryPrefix = this.directoryPrefix + this.user_bucket_path + "/";
      this.remoteUsersdirectory = config.remoteUsersdirectory + this.user_id + "/";
      this.storyImagesDirectoryPrefix = this.storyDirectoryPrefix + "images/";
      this.storyAudioDirectoryPrefix = this.storyDirectoryPrefix + "audio/";
      this.storyVideoDirectoryPrefix = this.storyDirectoryPrefix + "video/";
      this.storyVideoDirectoryPrefix = this.directoryPrefix + "video/";
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
    logger.info('[createAudioFile] sourcePath: ' + sourcePath);
    logger.info('[createAudioFile] destPath: ' + destPath);
    logger.info('[createAudioFile] remoteFile: ' + remoteFile);
    logger.info('[createAudioFile] destFileName: ' + destFileName);

    try {
      if (sourcePath === null || sourcePath === "" || sourcePath.endsWith("null") || !sourcePath.endsWith(".flv")) {
        logger.info('[createAudioFile] using empty audio file: ' + this.emptyAudio)
        sourcePath = this.emptyAudio;
        await fs.copyFileSync(sourcePath, destPath+destFileName);
      }
      else {
        logger.info(`[createAudioFile] Downloading audio file: ${remoteFile} to ${destPath}`)
        try {
          fs.copyFileSync(sourcePath, destPath);

          // const payload = {"bucketName": "littlebirdtales", 
          // "sourceFile": remoteFile, 
          // "sourceFileMed": '',
          // "sourceFileSml": '',

          // "destinationFileDirectory": destPath, 
          // "destinationFileName": destFileName, 
          // "destinationFileNameMed": '', 
          // "destinationFileNameSml": '', 
          // };

          // const url = `${config.storj_service_url}downloadSelectedImage`;
          // logger.info(`[createAudioFile] download file url: ${url}`);
          // const response = await axios.post(url, payload)
          // logger.info('[createAudioFile] response' + JSON.stringify(response.data));
        } catch (error) {
          logger.info('[createAudioFile] Downloading error ' + error);
        }

        sourcePath = destPath + destFileName
      }
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

  async createImage(text, textImage, taleImage, destPath, remoteFile, combineImage, destFileName) {
    logger.info(`[createImage] text: ${text}`);
    logger.info(`[createImage] textImage: ${textImage}`);
    logger.info(`[createImage] taleImage: ${taleImage}`);
    logger.info(`[createImage] destPath: ${destPath}`);
    logger.info(`[createImage] remoteFile: ${remoteFile}`);
    logger.info(`[createImage] destFileName: ${destFileName}`);

    if (remoteFile.endsWith('null')) {
      taleImage = this.defaultImagePath;    }
    else {
      logger.info(`[createImage] Downloading image file: ${remoteFile} to ${destPath}`)
      try {
        await fs.copyFileSync(taleImage, destPath);

        // const payload = {"bucketName": "littlebirdtales", 
        // "sourceFile": remoteFile, 
        // "sourceFileMed": '',
        // "sourceFileSml": '',

        // "destinationFileDirectory": destPath, 
        // "destinationFileName": destFileName, 
        // "destinationFileNameMed": '', 
        // "destinationFileNameSml": '', 
        // };

        // const url = `${config.storj_service_url}downloadSelectedImage`;
        // logger.info(`[createImage] download file url: ${url}`);
        // const response = await axios.post(url, payload)
        // logger.info('[createImage] response' + JSON.stringify(response.data));
      } catch (error) {
        logger.info('[createImage] Downloading error ' + error);
      }
    }

    taleImage = destPath //+ destFileName
    logger.info(`[createImage] taleImage: ${taleImage}`);

    this.mm.text = text;
    this.mm.textImage = textImage;
    this.mm.taleImage = taleImage;
    this.mm.textBG = this.textBG;
    this.mm.combineImage = combineImage;
    await this.mm.TextOverlay();
    await this.mm.CreateImage();

    logger.info("[createImage] text: " + text);
    logger.info("[createImage] textImage: " + textImage);
    logger.info("[createImage] taleImage: " + taleImage);
    logger.info("[createImage] combineImage: " + combineImage);
  }

  // performs this ffmpeg command:
  // -loop 1 -shortest -y -i %image_file% -i %audio_file% -b:v 1200K -ac 2 %output_file%
  async combineImageAndAudio(image_file, audio_file) {
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

      if (audio_file === null || audio_file === "" || audio_file.endsWith("null") || !audio_file.endsWith(".flv")) {
        logger.info('[combineImageAndAudio] using empty audio file: ' + this.emptyAudio)
        audio_file = this.emptyAudio;
      }

      if (await fs.existsSync(audio_file)) {
        logger.info("[combineImageAndAudio] audio_file exists "+ audio_file);
      }

      try {
        execSync(`/usr/local/bin/ffmpeg -loop 1 -y -i ${image_file} -i ${audio_file} -b:v 1200K -ac 2 -shortest ${output_file}`, { stdio: 'ignore' });
        this.combineMPGFiles.push(output_file);
      }
      catch(err) {
        console.log('[combineImageAndAudio] Spawn error: ' + err)
        throw err;
      }
    }
    catch(err) {
      logger.info('[combineImageAndAudio] Error: ' + err.stack)
      throw err;
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

	// iterate over all files in combineMPGFiles and cat them together
	concatenateFiles() {
    const output_filename = this.tempVideoDirectoryPrefix + "combined.mpg";
    logger.info("[concatenateFiles] output_filename: " + output_filename);

    let buffer = '';
    for (let i=0; i < this.combineMPGFiles.length; i++)
		{
      const temp = this.combineMPGFiles[i];
			logger.info("[concatenateFiles] combining file " + temp);
			buffer += `${temp} `;
		}

    // write these file names to the output file
    logger.info("[concatenateFiles] data: " + buffer);
    execSync(`/usr/bin/cat ${buffer} >  ${output_filename}`, { stdio: 'ignore' });
    // fs.writeFileSync(output_filename, buffer);
    
    logger.info("[concatenateFiles] Done");
    return output_filename;
  }

  async buildMP4(combined_mpg_files, story) {
    let filename = this.cleanFileName(story.data.title);
    logger.info(`[buildMP4] combined_mpg_files: ${combined_mpg_files}`);
    logger.info(`[buildMP4] mp4 title: ${filename}`);
    await story.setFilename(filename);

    let temp_output_file = this.storyVideoDirectoryPrefix + filename +"_temp.mp4 ";
    let output_file = this.storyVideoDirectoryPrefix + filename +".mp4 ";
    try {
      let command = config.ffmpeg_build_commandline;
      command = command.replace("%combined_mpg_files%", combined_mpg_files);
      command = command.replace("%output_file%", temp_output_file);

			logger.info ("FFMPEG ================ " + command);
			logger.info ("MP4 file can be found here ================ " + output_file);

      execSync(`/usr/local/bin/ffmpeg ${command}`, { stdio: 'ignore' });

      // https://stackoverflow.com/questions/28429526/ffmpeg-h-264-encoding-for-html5-and-ultimately-mpeg-dash
      execSync(`/usr/local/bin/ffmpeg -i ${temp_output_file} -c:v libx264 -c:a aac -profile:v baseline -level:v 13 -g 250 -r 25 -keyint_min 250 -strict experimental -b:a 96k ${output_file}`);

      return filename;
    }
    catch(err) {
      logger.info('[buildMP4] Error: ' + err.stack);
    }
  }

  cleanFileName(curStoryTitle)
	{
		return "littlebirdtales_movie-" + new Date().getTime();
  }
}

module.exports = Program;
