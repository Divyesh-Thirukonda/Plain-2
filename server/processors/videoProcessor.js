const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const { transcribeAudio, generateTags } = require('./aiProcessor');

const CLIP_DURATION = 30; // seconds per clip
const outputDir = path.join(process.env.UPLOAD_DIR || './uploads', 'clips');

// Ensure clips directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Process a recording into multiple clips
 */
async function processRecording(recordingId) {
  return new Promise((resolve, reject) => {
    // Get recording info
    db.get('SELECT * FROM recordings WHERE id = ?', [recordingId], async (err, recording) => {
      if (err) return reject(err);
      if (!recording) return reject(new Error('Recording not found'));

      console.log(`📹 Processing recording: ${recording.title}`);

      try {
        // Get video duration
        const duration = await getVideoDuration(recording.file_path);
        console.log(`⏱️  Duration: ${duration}s`);

        // Update recording duration
        db.run('UPDATE recordings SET duration = ? WHERE id = ?', [duration, recordingId]);

        // Split into clips
        const numClips = Math.ceil(duration / CLIP_DURATION);
        const clips = [];

        for (let i = 0; i < numClips; i++) {
          const startTime = i * CLIP_DURATION;
          const endTime = Math.min((i + 1) * CLIP_DURATION, duration);
          
          const clip = await createClip(recording, startTime, endTime, i + 1);
          clips.push(clip);
          
          console.log(`✂️  Created clip ${i + 1}/${numClips}`);
        }

        // Process clips with AI (transcription and tagging)
        for (const clip of clips) {
          await enhanceClipWithAI(clip);
        }

        // Mark recording as processed
        db.run('UPDATE recordings SET processed = 1 WHERE id = ?', [recordingId]);

        console.log(`✅ Processing complete! Created ${clips.length} clips`);
        resolve(clips);

      } catch (error) {
        console.error('Error processing recording:', error);
        reject(error);
      }
    });
  });
}

/**
 * Get video duration
 */
function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration);
    });
  });
}

/**
 * Create a clip from a recording
 */
function createClip(recording, startTime, endTime, clipNumber) {
  return new Promise((resolve, reject) => {
    const clipId = uuidv4();
    const clipFilename = `${clipId}.mp4`;
    const clipPath = path.join(outputDir, clipFilename);

    ffmpeg(recording.file_path)
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .output(clipPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .on('end', () => {
        // Save clip to database
        const clipTitle = `${recording.title} - Part ${clipNumber}`;
        
        db.run(
          `INSERT INTO clips (id, recording_id, title, start_time, end_time, file_path, role) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [clipId, recording.id, clipTitle, startTime, endTime, clipPath, 'general'],
          function(err) {
            if (err) return reject(err);
            resolve({
              id: clipId,
              recording_id: recording.id,
              title: clipTitle,
              start_time: startTime,
              end_time: endTime,
              file_path: clipPath
            });
          }
        );
      })
      .on('error', reject)
      .run();
  });
}

/**
 * Enhance clip with AI transcription and tagging
 */
async function enhanceClipWithAI(clip) {
  try {
    // Extract audio for transcription
    const audioPath = clip.file_path.replace('.mp4', '.mp3');
    
    await extractAudio(clip.file_path, audioPath);
    
    // Transcribe audio
    const transcript = await transcribeAudio(audioPath);
    
    // Generate tags based on transcript
    const tags = await generateTags(transcript, clip.title);
    
    // Update clip with transcript and tags
    db.run(
      'UPDATE clips SET transcript = ?, tags = ? WHERE id = ?',
      [transcript, JSON.stringify(tags), clip.id],
      (err) => {
        if (err) console.error('Error updating clip:', err);
      }
    );

    // Clean up temporary audio file
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }

    console.log(`🎯 Enhanced clip with AI: ${clip.title}`);
  } catch (error) {
    console.error('Error enhancing clip:', error);
  }
}

/**
 * Extract audio from video
 */
function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(audioPath)
      .audioCodec('libmp3lame')
      .noVideo()
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

/**
 * Detect scene changes for smarter clip boundaries
 */
function detectSceneChanges(videoPath) {
  return new Promise((resolve, reject) => {
    const scenes = [];
    
    ffmpeg(videoPath)
      .outputOptions([
        '-filter:v',
        'select=\'gt(scene,0.3)\',showinfo',
        '-f',
        'null'
      ])
      .on('stderr', (stderrLine) => {
        // Parse scene change timestamps from ffmpeg output
        const match = stderrLine.match(/pts_time:(\d+\.?\d*)/);
        if (match) {
          scenes.push(parseFloat(match[1]));
        }
      })
      .on('end', () => resolve(scenes))
      .on('error', reject)
      .output('-')
      .run();
  });
}

module.exports = {
  processRecording,
  getVideoDuration,
  detectSceneChanges
};
