import axios from 'axios';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Constants for transcript processing
const MAX_TRANSCRIPT_CHARS = 100000; // 100k characters max
const CHUNK_SIZE = 25000; // ~6k tokens per chunk for safe processing
const MAX_SUMMARY_TOKENS = 10000;
const MAX_FINAL_TOKENS = 20000;

// Available image models - GPT Image models (always return base64, not URLs)
const IMAGE_MODELS = {
  'gpt-image-1': { model: 'gpt-image-1', size: '1536x1024' },
  'gpt-image-1.5': { model: 'gpt-image-1.5', size: '1536x1024' },
  'gpt-image-1-mini': { model: 'gpt-image-1-mini', size: '1024x1024' }
};

class OpenAIService {
  constructor() {
    this.apiKey = null;
    this.imageModel = 'gpt-image-1'; // Default model
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  getApiKey() {
    return this.apiKey;
  }

  setImageModel(modelName) {
    if (IMAGE_MODELS[modelName]) {
      this.imageModel = modelName;
    }
  }

  getImageModel() {
    return this.imageModel;
  }

  getAvailableImageModels() {
    return Object.keys(IMAGE_MODELS);
  }

  async summarizeText(text, videoTitle) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for summarization');
    }

    const prompt = `You are an educational content summarizer. Please create a comprehensive summary of the following YouTube video content.

Video Title: ${videoTitle}

Content:
${text.substring(0, 12000)}

Please provide:
1. A brief overview (2-3 sentences)
2. Key topics covered (bullet points)
3. Main takeaways and learning points
4. Potential applications or use cases (if applicable)

Format your response in a clear, structured way that helps someone understand what they'll learn from this video.`;

    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that creates educational summaries of video content.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      if (response.data.choices && response.data.choices.length > 0) {
        return response.data.choices[0].message.content;
      }

      throw new Error('No summary generated');
    } catch (error) {
      console.error('Error generating summary:', error);
      if (error.response) {
        throw new Error(error.response.data.error?.message || 'Failed to generate summary');
      }
      throw error;
    }
  }

  async summarizeVideoFromDescription(videoTitle, videoDescription) {
    if (!videoDescription || videoDescription.trim().length === 0) {
      throw new Error('Video description is empty. Cannot generate summary.');
    }

    return this.summarizeText(videoDescription, videoTitle);
  }

  // Helper function to chunk transcript into parts
  chunkTranscript(transcript, chunkSize = CHUNK_SIZE) {
    const chunks = [];
    for (let i = 0; i < transcript.length; i += chunkSize) {
      chunks.push(transcript.substring(i, i + chunkSize));
    }
    return chunks;
  }

  // Summarize a single chunk of transcript
  async summarizeChunk(videoTitle, chunk, chunkIndex, totalChunks) {
    const prompt = `You are an expert educational content analyst. Summarize this PART ${chunkIndex + 1} of ${totalChunks} of a YouTube video transcript.

Video Title: ${videoTitle}

Transcript Part ${chunkIndex + 1}/${totalChunks}:
${chunk}

Create a detailed summary of THIS PART including:
- Key points and concepts discussed
- Direct quotes that are insightful (format as: > "quote")
- Important terminology introduced
- Any actionable insights

Be thorough and preserve all important details. Use markdown formatting.`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content analyst. Create detailed summaries preserving all key information and direct quotes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: MAX_SUMMARY_TOKENS,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    if (response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    }
    throw new Error(`Failed to summarize chunk ${chunkIndex + 1}`);
  }

  // Merge multiple chunk summaries into a final document
  async mergeSummaries(videoTitle, summaries) {
    const combinedSummaries = summaries.map((s, i) => `### Part ${i + 1} Summary:\n${s}`).join('\n\n---\n\n');

    const prompt = `You are an expert educational content analyst. You have been given ${summaries.length} partial summaries from different parts of a YouTube video transcript. Create ONE COMPREHENSIVE, UNIFIED document that:

1. Merges all information logically
2. Removes duplications while preserving unique details
3. Reorders content into a coherent structure
4. Preserves ALL direct quotes and citations
5. Maintains all key terminology and concepts

Video Title: ${videoTitle}

Partial Summaries:
${combinedSummaries}

Create the FINAL unified document with these sections:

## Executive Summary
A comprehensive 4-5 sentence overview capturing the full essence of the video.

## Key Themes & Topics
List and explain ALL main themes covered across the entire video, with detailed descriptions.

## Detailed Key Points
For EACH major point discussed throughout the video:
- **Point Title**: Thorough explanation of the concept
- Include ALL relevant direct quotes from the transcript (format as: > "exact quote")
- Explain the significance, implications, and connections to other points

## Notable Quotes & Insights
Compile the 5-10 most impactful direct quotes from across all parts:
> "Quote here" - with context of why this matters

## Practical Applications
- Comprehensive list of how this knowledge can be applied
- All actionable takeaways from the entire video

## Key Terminology & Concepts
Define ALL important terms or concepts introduced throughout the video.

## Conclusion & Final Thoughts
Synthesize the main message and its broader implications, drawing from all parts.

Be EXTREMELY thorough and detailed. Do NOT lose any important information. Use markdown formatting for readability.`;

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content analyst who creates comprehensive, unified documents from multiple sources. You preserve all details while organizing content logically and removing only true duplications.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: MAX_FINAL_TOKENS,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    if (response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    }
    throw new Error('Failed to merge summaries');
  }

  async summarizeFromTranscript(videoTitle, transcript, onProgress = null) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript available for summarization');
    }

    // Limit transcript to max allowed
    const limitedTranscript = transcript.substring(0, MAX_TRANSCRIPT_CHARS);
    const wasLimited = transcript.length > MAX_TRANSCRIPT_CHARS;

    // Check if chunking is needed
    const chunks = this.chunkTranscript(limitedTranscript);
    const numChunks = chunks.length;

    // Notify about chunking if callback provided
    if (onProgress) {
      const info = {
        transcriptLength: transcript.length,
        wasLimited,
        limitedTo: wasLimited ? MAX_TRANSCRIPT_CHARS : transcript.length,
        numChunks,
        message: numChunks > 1
          ? `Transcript is ${transcript.length.toLocaleString()} characters. Breaking into ${numChunks} parts for processing.`
          : `Processing transcript (${transcript.length.toLocaleString()} characters).`
      };
      if (wasLimited) {
        info.message = `Transcript exceeds ${MAX_TRANSCRIPT_CHARS.toLocaleString()} character limit. Processing first ${MAX_TRANSCRIPT_CHARS.toLocaleString()} characters in ${numChunks} parts.`;
      }
      onProgress('info', info);
    }

    try {
      if (numChunks === 1) {
        // Single chunk - process directly with full prompt
        const prompt = `You are an expert educational content analyst. Create a COMPREHENSIVE, DETAILED structured document summarizing this YouTube video based on its transcript.

Video Title: ${videoTitle}

Transcript:
${limitedTranscript}

Create a thorough structured document with the following sections:

## Executive Summary
A concise 4-5 sentence overview capturing the essence of the video.

## Key Themes & Topics
List and explain the main themes covered, with detailed descriptions of each.

## Detailed Key Points
For each major point discussed in the video:
- **Point Title**: Clear, thorough explanation of the concept
- Include direct quotes from the transcript where they add emphasis or clarity (format as: > "exact quote from transcript")
- Explain the significance or implications

## Notable Quotes & Insights
Extract 5-10 most impactful direct quotes from the transcript that capture key insights:
> "Quote here" - with brief context of why this matters

## Practical Applications
- How can this knowledge be applied?
- What are all the actionable takeaways?

## Key Terminology & Concepts
Define any important terms or concepts introduced (if applicable).

## Conclusion & Final Thoughts
Summarize the main message and its broader implications.

Be EXTREMELY thorough and detailed. Use markdown formatting for readability. Include many direct citations from the transcript to support key points.`;

        const response = await axios.post(
          OPENAI_API_URL,
          {
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an expert educational content analyst who creates comprehensive, well-structured document summaries with direct citations. Your summaries are thorough, insightful, and actionable.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.5,
            max_tokens: MAX_SUMMARY_TOKENS,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
          }
        );

        if (response.data.choices && response.data.choices.length > 0) {
          return response.data.choices[0].message.content;
        }
        throw new Error('No summary generated');
      }

      // Multiple chunks - process each and merge
      const chunkSummaries = [];
      for (let i = 0; i < chunks.length; i++) {
        if (onProgress) {
          onProgress('chunk', { current: i + 1, total: numChunks });
        }
        const chunkSummary = await this.summarizeChunk(videoTitle, chunks[i], i, numChunks);
        chunkSummaries.push(chunkSummary);

        // Rate limiting delay between chunks
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Merge all chunk summaries into final document
      if (onProgress) {
        onProgress('merging', { message: 'Merging summaries into final document...' });
      }
      const finalSummary = await this.mergeSummaries(videoTitle, chunkSummaries);
      return finalSummary;

    } catch (error) {
      console.error('Error generating summary from transcript:', error);
      if (error.response) {
        throw new Error(error.response.data.error?.message || 'Failed to generate summary');
      }
      throw error;
    }
  }

  async generateSketchnote(summary, videoTitle, modelName = null) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!summary || summary.trim().length === 0) {
      throw new Error('No summary available for sketchnote generation');
    }

    // Use provided model or default
    const selectedModel = modelName || this.imageModel;
    const modelConfig = IMAGE_MODELS[selectedModel] || IMAGE_MODELS['gpt-image-1'];

    // Extract structured content from summary for the sketchnote
    const structuredPrompt = `Analyze this summary and create a structured breakdown for a sketchnote visualization. Extract:

1. MAIN TITLE (5 words max)
2. 3-5 KEY THEMES (2-3 words each)
3. 6-8 KEY CONCEPTS with brief explanations (concept: one-line explanation)
4. 3-4 NOTABLE QUOTES (short, impactful phrases)
5. 3-4 ACTIONABLE TAKEAWAYS (verb + object format)

Summary to analyze:
${summary.substring(0, 6000)}

Format your response as structured data that can be visualized in a sketchnote.`;

    try {
      // Get structured content from summary
      const structuredResponse = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You extract key information from summaries for visual representation. Be concise and impactful.'
            },
            {
              role: 'user',
              content: structuredPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 800,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      const structuredContent = structuredResponse.data.choices[0].message.content.trim();

      // Create comprehensive image prompt with actual summary content
      const imagePrompt = `Create a hand-drawn sketchnote visual summary for this educational content. Use a pristine white paper background (no lines). The art style should be 'graphic recording' or 'visual thinking' using black ink fine-liners for clear outlines and text. Use colored markers (specifically teal, orange, and muted red) for simple shading and accents.

TITLE: "${videoTitle.substring(0, 60)}"
Center this title in a 3D-style rectangular box at the top.

CONTENT TO VISUALIZE:
${structuredContent.substring(0, 1500)}

LAYOUT INSTRUCTIONS:
- Surround the title with radially distributed sections for each theme
- Use simple doodles, icons, stick figures, and diagrams to illustrate concepts
- Include key quotes in speech bubbles or callout boxes
- Draw arrows connecting related ideas
- Add small icons representing actionable takeaways at the bottom
- The text should be distinct, handwritten, all-caps printing, legible
- Organize like a professional brainstorming/graphic recording session
- 16:9 aspect ratio`;

      // Build request body for GPT Image models
      // GPT Image models always return base64, don't support quality parameter
      const imageRequestBody = {
        model: modelConfig.model,
        prompt: imagePrompt,
        n: 1,
        size: modelConfig.size,
        output_format: 'png',  // GPT image models use output_format, not response_format
      };

      const imageResponse = await axios.post(
        'https://api.openai.com/v1/images/generations',
        imageRequestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      if (imageResponse.data.data && imageResponse.data.data.length > 0) {
        // GPT Image models return base64 data, not URLs
        const imageData = imageResponse.data.data[0];

        // Check if we got base64 data (GPT image models) or URL (DALL-E)
        if (imageData.b64_json) {
          // Convert base64 to data URL for display in browser
          return `data:image/png;base64,${imageData.b64_json}`;
        } else if (imageData.url) {
          return imageData.url;
        }
      }

      throw new Error('No sketchnote generated');
    } catch (error) {
      console.error('Error generating sketchnote:', error);
      if (error.response) {
        throw new Error(error.response.data.error?.message || 'Failed to generate sketchnote');
      }
      throw error;
    }
  }

  async autoCategorizeVideos(videos, systemPrompt) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!videos || videos.length === 0) {
      throw new Error('No videos provided for categorization');
    }

    // Create a list of videos with their titles and channels
    const videoList = videos.map((v, idx) =>
      `${idx + 1}. "${v.title}" by ${v.channelTitle}`
    ).join('\n');

    const prompt = `${systemPrompt}

Here are the videos to categorize:

${videoList}

Please respond with ONLY the category names, one per line, nothing else.`;

    try {
      console.log('Generating categories with OpenAI...');
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that categorizes videos into meaningful groups.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 200,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      if (response.data.choices && response.data.choices.length > 0) {
        const categoryText = response.data.choices[0].message.content;
        console.log('Raw OpenAI response:', categoryText);

        // Parse category names (one per line)
        const categoryNames = categoryText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => {
            // Remove numbered prefixes like "1.", "1)", "1:"
            let cleaned = line.replace(/^\d+[\.\)\:]\s*/, '');
            // Remove bullet points like "-", "*", "•"
            cleaned = cleaned.replace(/^[-*•]\s*/, '');
            return cleaned.trim();
          })
          .filter(line => line.length > 0); // Remove any empty lines after cleaning

        console.log('Parsed categories:', categoryNames);
        return categoryNames;
      }

      throw new Error('No categories generated');
    } catch (error) {
      console.error('Error generating categories:', error);
      if (error.response) {
        throw new Error(error.response.data.error?.message || 'Failed to generate categories');
      }
      throw error;
    }
  }

  async assignVideoToCategories(video, categoryNames) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Given these categories:
${categoryNames.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Which category or categories (maximum 2) best fit this video?

Video: "${video.title}" by ${video.channelTitle}

Respond with ONLY the category numbers (e.g., "1" or "1, 3"), nothing else.`;

    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that assigns videos to appropriate categories.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 10,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      if (response.data.choices && response.data.choices.length > 0) {
        const result = response.data.choices[0].message.content.trim();
        // Parse the numbers
        const categoryIndices = result
          .split(/[,\s]+/)
          .map(s => parseInt(s.trim()))
          .filter(n => !isNaN(n) && n > 0 && n <= categoryNames.length)
          .map(n => n - 1); // Convert to 0-based index

        return categoryIndices;
      }

      return []; // No category assigned
    } catch (error) {
      console.error('Error assigning video to category:', error);
      return []; // Return empty on error
    }
  }

  async batchSummarize(videos, onProgress) {
    const results = [];
    const total = videos.length;

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      try {
        const summary = await this.summarizeVideoFromDescription(
          video.title,
          video.description
        );
        results.push({
          videoId: video.id,
          success: true,
          summary,
        });
        if (onProgress) {
          onProgress(i + 1, total, true);
        }
      } catch (error) {
        results.push({
          videoId: video.id,
          success: false,
          error: error.message,
        });
        if (onProgress) {
          onProgress(i + 1, total, false);
        }
      }

      if (i < videos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export default new OpenAIService();
