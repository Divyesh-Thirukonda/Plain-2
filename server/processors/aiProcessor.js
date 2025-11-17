const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Transcribe audio using OpenAI Whisper
 */
async function transcribeAudio(audioPath) {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log('⚠️  OpenAI API key not configured. Skipping transcription.');
      return 'Transcription unavailable - please configure OpenAI API key';
    }

    const audioFile = fs.createReadStream(audioPath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en'
    });

    return transcription.text;
  } catch (error) {
    console.error('Transcription error:', error.message);
    return 'Transcription failed';
  }
}

/**
 * Generate relevant tags for a clip using GPT
 */
async function generateTags(transcript, title) {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return ['onboarding', 'workflow'];
    }

    const prompt = `Analyze this onboarding video transcript and generate 3-5 relevant tags.
Title: ${title}
Transcript: ${transcript}

Return only tags as a JSON array of strings. Focus on: technologies mentioned, tasks performed, skills demonstrated, and workflow types.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that analyzes video transcripts and generates relevant tags.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const response = completion.choices[0].message.content.trim();
    
    // Parse JSON response
    const tags = JSON.parse(response);
    return Array.isArray(tags) ? tags : ['onboarding', 'workflow'];

  } catch (error) {
    console.error('Tag generation error:', error.message);
    return ['onboarding', 'workflow', 'tutorial'];
  }
}

/**
 * Suggest role categorization based on content
 */
async function suggestRole(transcript, title) {
  try {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      return 'general';
    }

    const prompt = `Based on this video content, suggest the most appropriate role category:
Title: ${title}
Transcript: ${transcript}

Choose ONE from: frontend, backend, devops, design, product, qa, general

Return only the role name in lowercase.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 10
    });

    const role = completion.choices[0].message.content.trim().toLowerCase();
    const validRoles = ['frontend', 'backend', 'devops', 'design', 'product', 'qa', 'general'];
    
    return validRoles.includes(role) ? role : 'general';

  } catch (error) {
    console.error('Role suggestion error:', error.message);
    return 'general';
  }
}

module.exports = {
  transcribeAudio,
  generateTags,
  suggestRole
};
