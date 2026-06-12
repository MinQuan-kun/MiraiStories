import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/webtruyen';
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    seedDatabase();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Define Mongoose Schemas
const StorySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  synopsis: { type: String, required: true, trim: true },
  author: { type: String, default: 'Tác giả ẩn danh' },
  genre: { type: String, required: true },
  cover: { type: String, default: '' }, // JSON string of style details (gradient colors, icon)
  tags: [{ type: String }],
  status: { type: String, enum: ['Đang tiến hành', 'Hoàn thành'], default: 'Đang tiến hành' },
  reads: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  layoutSettings: {
    customPageTitle: { type: String, default: '' },
    customTabTitle: { type: String, default: '' },
    bgColor: { type: String, default: '' },
    marginWidth: { type: String, default: 'medium' }, // narrow, medium, wide
    bgImageUrl: { type: String, default: '' },
    bgImageBlur: { type: Number, default: 0 },
    bgImageOpacity: { type: Number, default: 1 }
  }
});

const ChapterSchema = new mongoose.Schema({
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true }, // Markdown or rich text
  isDraft: { type: Boolean, default: false },
  wordCount: { type: Number, default: 0 },
  order: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const CommentSchema = new mongoose.Schema({
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', default: null }, // Optional: comments on specific chapters
  author: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const GenreSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true }
});

const SettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
});

const Story = mongoose.model('Story', StorySchema);
const Chapter = mongoose.model('Chapter', ChapterSchema);
const Comment = mongoose.model('Comment', CommentSchema);
const Genre = mongoose.model('Genre', GenreSchema);
const Settings = mongoose.model('Settings', SettingsSchema);

// Helper function to escape special SVG XML characters
function escapeSvg(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper function to wrap text for SVG
function wrapText(text, maxChars = 20) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ----------------- API ROUTES -----------------

// Upload file endpoint (Base64 handler)
app.post('/api/upload', async (req, res) => {
  try {
    const { name, type, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ error: 'Thiếu dữ liệu tệp' });
    }

    // Upload base64 string directly to Cloudinary
    const uploadRes = await cloudinary.uploader.upload(data, {
      folder: 'webtruyen'
    });

    // Return secure url from Cloudinary
    res.json({ url: uploadRes.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to extract Cloudinary public ID from URL
function getPublicIdFromUrl(url) {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const parts = url.split('/image/upload/');
    if (parts.length < 2) return null;

    let pathPart = parts[1];

    // Remove version segment (v followed by digits)
    pathPart = pathPart.replace(/^v\d+\//, '');

    // Remove file extension
    const dotIndex = pathPart.lastIndexOf('.');
    if (dotIndex !== -1) {
      pathPart = pathPart.substring(0, dotIndex);
    }

    return pathPart;
  } catch (err) {
    console.error('Error parsing Cloudinary URL:', err);
    return null;
  }
}

// Helper to delete an image from Cloudinary
async function deleteCloudinaryImage(url) {
  const publicId = getPublicIdFromUrl(url);
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted Cloudinary asset: ${publicId}`);
    } catch (err) {
      console.error(`Failed to delete Cloudinary asset: ${publicId}`, err);
    }
  }
}

// Delete file from Cloudinary endpoint
app.post('/api/upload/delete', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Thiếu đường dẫn ảnh' });
    }

    await deleteCloudinaryImage(url);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all genres
app.get('/api/genres', async (req, res) => {
  try {
    const genres = await Genre.find().sort({ name: 1 });
    res.json(genres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new genre
app.post('/api/genres', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tên thể loại không được để trống' });
    }
    const existing = await Genre.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ error: 'Thể loại này đã tồn tại' });
    }
    const newGenre = new Genre({ name: name.trim() });
    await newGenre.save();
    res.status(201).json(newGenre);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a genre
app.delete('/api/genres/:id', async (req, res) => {
  try {
    const genre = await Genre.findByIdAndDelete(req.params.id);
    if (!genre) return res.status(404).json({ error: 'Không tìm thấy thể loại' });
    res.json({ success: true, message: 'Đã xóa thể loại thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a setting by key
app.get('/api/settings/:key', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });
    if (!setting) return res.json({ value: null });
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save/update a setting
app.post('/api/settings/:key', async (req, res) => {
  try {
    const { value } = req.body;

    // Find old setting
    const oldSetting = await Settings.findOne({ key: req.params.key });

    const setting = await Settings.findOneAndUpdate(
      { key: req.params.key },
      { value },
      { upsert: true, new: true }
    );

    // Cleanup old image if key is globalLayout
    if (req.params.key === 'globalLayout' && oldSetting && oldSetting.value) {
      const oldBgUrl = oldSetting.value.bgImageUrl;
      const newBgUrl = value && value.bgImageUrl;
      if (oldBgUrl && oldBgUrl !== newBgUrl) {
        await deleteCloudinaryImage(oldBgUrl);
      }
    }

    res.json(setting);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get author statistics
app.get('/api/stats', async (req, res) => {
  try {
    const totalStories = await Story.countDocuments();
    const totalChapters = await Chapter.countDocuments({ isDraft: false });

    const wordSum = await Chapter.aggregate([
      { $group: { _id: null, total: { $sum: '$wordCount' } } }
    ]);
    const totalWords = wordSum.length > 0 ? wordSum[0].total : 0;

    const readSum = await Story.aggregate([
      { $group: { _id: null, total: { $sum: '$reads' } } }
    ]);
    const totalReads = readSum.length > 0 ? readSum[0].total : 0;

    res.json({ totalStories, totalChapters, totalWords, totalReads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all stories
app.get('/api/stories', async (req, res) => {
  try {
    const stories = await Story.find().sort({ createdAt: -1 });
    res.json(stories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new story
app.post('/api/stories', async (req, res) => {
  try {
    const { title, synopsis, author, genre, cover, tags, status, layoutSettings } = req.body;
    const newStory = new Story({ title, synopsis, author, genre, cover, tags, status, layoutSettings });
    await newStory.save();
    res.status(201).json(newStory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get story details by ID
app.get('/api/stories/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Không tìm thấy truyện' });

    // Fetch chapters for the story (order by 'order' ascending)
    const chapters = await Chapter.find({ storyId: story._id }).sort({ order: 1 });

    res.json({ story, chapters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update story
app.put('/api/stories/:id', async (req, res) => {
  try {
    const { title, synopsis, author, genre, cover, tags, status, layoutSettings } = req.body;

    // Find old story
    const oldStory = await Story.findById(req.params.id);
    if (!oldStory) return res.status(404).json({ error: 'Không tìm thấy truyện' });

    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { title, synopsis, author, genre, cover, tags, status, layoutSettings },
      { new: true }
    );

    // Compare and clean up old cover / custom icon / bgImage on Cloudinary
    const urlsToDelete = [];

    // 1. Cover / Custom Icon change detection
    let oldCoverUrl = null;
    let oldIconUrl = null;
    if (oldStory.cover) {
      if (oldStory.cover.startsWith('http')) {
        oldCoverUrl = oldStory.cover;
      } else {
        try {
          const coverData = JSON.parse(oldStory.cover);
          if (coverData.icon && coverData.icon.startsWith('http')) {
            oldIconUrl = coverData.icon;
          }
        } catch (e) { }
      }
    }

    let newCoverUrl = null;
    let newIconUrl = null;
    if (cover) {
      if (cover.startsWith('http')) {
        newCoverUrl = cover;
      } else {
        try {
          const coverData = JSON.parse(cover);
          if (coverData.icon && coverData.icon.startsWith('http')) {
            newIconUrl = coverData.icon;
          }
        } catch (e) { }
      }
    }

    if (oldCoverUrl && oldCoverUrl !== newCoverUrl) {
      urlsToDelete.push(oldCoverUrl);
    }
    if (oldIconUrl && oldIconUrl !== newIconUrl) {
      urlsToDelete.push(oldIconUrl);
    }

    // 2. Background Image change detection
    const oldBgUrl = oldStory.layoutSettings && oldStory.layoutSettings.bgImageUrl;
    const newBgUrl = layoutSettings && layoutSettings.bgImageUrl;
    if (oldBgUrl && oldBgUrl !== newBgUrl) {
      urlsToDelete.push(oldBgUrl);
    }

    // Delete unique URLs
    for (const url of [...new Set(urlsToDelete)]) {
      await deleteCloudinaryImage(url);
    }

    res.json(story);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete story and all its chapters & comments
app.delete('/api/stories/:id', async (req, res) => {
  try {
    const storyId = req.params.id;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ error: 'Không tìm thấy truyện' });

    // Find all chapters to extract their image URLs
    const chapters = await Chapter.find({ storyId });

    // Perform cleanup of images on Cloudinary
    const urlsToDelete = [];

    // Cover image
    if (story.cover) {
      if (story.cover.startsWith('http')) {
        urlsToDelete.push(story.cover);
      } else {
        try {
          const coverData = JSON.parse(story.cover);
          if (coverData.icon && coverData.icon.startsWith('http')) {
            urlsToDelete.push(coverData.icon);
          }
        } catch (e) { }
      }
    }

    // Background image
    if (story.layoutSettings && story.layoutSettings.bgImageUrl) {
      urlsToDelete.push(story.layoutSettings.bgImageUrl);
    }

    // Chapter images (using markdown image regex)
    const imageRegex = /!\[.*?\]\((https?:\/\/res\.cloudinary\.com\/.*?)\)/g;
    for (const ch of chapters) {
      if (ch.content) {
        let match;
        imageRegex.lastIndex = 0;
        while ((match = imageRegex.exec(ch.content)) !== null) {
          urlsToDelete.push(match[1]);
        }
      }
    }

    // Delete unique URLs
    const uniqueUrls = [...new Set(urlsToDelete)];
    for (const url of uniqueUrls) {
      await deleteCloudinaryImage(url);
    }

    // Now perform the database deletion
    await Story.findByIdAndDelete(storyId);
    await Chapter.deleteMany({ storyId });
    await Comment.deleteMany({ storyId });

    res.json({ success: true, message: 'Đã xóa truyện và toàn bộ dữ liệu đi kèm' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Increment story reads/likes
app.post('/api/stories/:id/increment/:field', async (req, res) => {
  try {
    const { field } = req.params;
    if (field !== 'reads' && field !== 'likes') {
      return res.status(400).json({ error: 'Trường tăng không hợp lệ' });
    }
    const update = {};
    update[field] = 1;
    const story = await Story.findByIdAndUpdate(req.params.id, { $inc: update }, { new: true });
    if (!story) return res.status(404).json({ error: 'Không tìm thấy truyện' });
    res.json(story);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get chapters for story (both drafts and published)
app.get('/api/stories/:id/chapters', async (req, res) => {
  try {
    const chapters = await Chapter.find({ storyId: req.params.id }).sort({ order: 1 });
    res.json(chapters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a chapter
app.post('/api/stories/:id/chapters', async (req, res) => {
  try {
    const { title, content, isDraft } = req.body;
    const storyId = req.params.id;

    // Find highest order to place next
    const lastChapter = await Chapter.findOne({ storyId }).sort({ order: -1 });
    const order = lastChapter ? lastChapter.order + 1 : 1;

    const wordCount = content ? content.trim().split(/\s+/).length : 0;

    const newChapter = new Chapter({
      storyId,
      title,
      content,
      isDraft,
      wordCount,
      order
    });

    await newChapter.save();
    res.status(201).json(newChapter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get specific chapter
app.get('/api/chapters/:chapterId', async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.chapterId);
    if (!chapter) return res.status(404).json({ error: 'Không tìm thấy chương' });
    res.json(chapter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update specific chapter
app.put('/api/chapters/:chapterId', async (req, res) => {
  try {
    const { title, content, isDraft } = req.body;

    // Find old chapter to compare contents
    const oldChapter = await Chapter.findById(req.params.chapterId);
    if (!oldChapter) return res.status(404).json({ error: 'Không tìm thấy chương' });

    const wordCount = content ? content.trim().split(/\s+/).length : 0;

    const chapter = await Chapter.findByIdAndUpdate(
      req.params.chapterId,
      { title, content, isDraft, wordCount },
      { new: true }
    );

    // Compare and cleanup images
    const oldUrls = [];
    const newUrls = [];
    const imageRegex = /!\[.*?\]\((https?:\/\/res\.cloudinary\.com\/.*?)\)/g;

    if (oldChapter.content) {
      let match;
      imageRegex.lastIndex = 0;
      while ((match = imageRegex.exec(oldChapter.content)) !== null) {
        oldUrls.push(match[1]);
      }
    }

    if (content) {
      let match;
      imageRegex.lastIndex = 0;
      while ((match = imageRegex.exec(content)) !== null) {
        newUrls.push(match[1]);
      }
    }

    // Find URLs that were in old content but not in new content
    const deletedUrls = oldUrls.filter(url => !newUrls.includes(url));
    for (const url of [...new Set(deletedUrls)]) {
      await deleteCloudinaryImage(url);
    }

    res.json(chapter);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reorder chapters
app.put('/api/stories/:id/chapters/reorder', async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id: chapterId, order: newOrderNumber }
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'Dữ liệu sắp xếp không hợp lệ' });
    }

    const promises = orders.map(item =>
      Chapter.findByIdAndUpdate(item.id, { order: item.order })
    );

    await Promise.all(promises);
    res.json({ success: true, message: 'Đã cập nhật thứ tự chương' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete chapter
app.delete('/api/chapters/:chapterId', async (req, res) => {
  try {
    const chapter = await Chapter.findByIdAndDelete(req.params.chapterId);
    if (!chapter) return res.status(404).json({ error: 'Không tìm thấy chương' });

    // Clean up images in chapter content from Cloudinary
    if (chapter.content) {
      const urlsToDelete = [];
      const imageRegex = /!\[.*?\]\((https?:\/\/res\.cloudinary\.com\/.*?)\)/g;
      let match;
      imageRegex.lastIndex = 0;
      while ((match = imageRegex.exec(chapter.content)) !== null) {
        urlsToDelete.push(match[1]);
      }
      for (const url of [...new Set(urlsToDelete)]) {
        await deleteCloudinaryImage(url);
      }
    }

    // Shift other chapters' orders to close the gap
    await Chapter.updateMany(
      { storyId: chapter.storyId, order: { $gt: chapter.order } },
      { $inc: { order: -1 } }
    );

    res.json({ success: true, message: 'Đã xóa chương' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get comments for a story
app.get('/api/stories/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ storyId: req.params.id }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment to a story
app.post('/api/stories/:id/comments', async (req, res) => {
  try {
    const { author, content, chapterId } = req.body;
    const newComment = new Comment({
      storyId: req.params.id,
      chapterId: chapterId || null,
      author: author || 'Độc giả',
      content
    });
    await newComment.save();
    res.status(201).json(newComment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Dynamic SVG Cover Image generator
app.get('/api/stories/:id/cover.svg', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).send('Not found');

    let colors = ['#6366f1', '#a855f7']; // Indigo - Purple
    let icon = '📖';
    if (story.cover) {
      try {
        const coverData = JSON.parse(story.cover);
        if (coverData.colors && coverData.colors.length >= 2) colors = coverData.colors;
        if (coverData.icon) icon = coverData.icon;
      } catch (e) { }
    }

    // Text Wrapping for Title
    const titleLines = wrapText(story.title, 18);
    let titleSvgText = '';
    const startY = 400 - ((titleLines.length - 1) * 35);
    titleLines.forEach((line, index) => {
      titleSvgText += `<text x="300" y="${startY + (index * 70)}" class="title">${escapeSvg(line)}</text>`;
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
      <defs>
        <linearGradient id="grad-${story._id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
        </linearGradient>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&amp;family=Outfit:wght@400;600&amp;display=swap');
          .title { font-family: 'Playfair Display', Georgia, serif; font-weight: 700; fill: #ffffff; font-size: 54px; text-anchor: middle; }
          .author { font-family: 'Outfit', sans-serif; font-weight: 600; fill: rgba(255,255,255,0.85); font-size: 26px; text-anchor: middle; letter-spacing: 3px; text-transform: uppercase; }
          .genre { font-family: 'Outfit', sans-serif; font-weight: 400; fill: #ffffff; font-size: 18px; text-anchor: middle; }
          .icon { font-size: 80px; text-anchor: middle; }
        </style>
      </defs>
      
      <!-- Background -->
      <rect width="100%" height="100%" fill="url(#grad-${story._id})" />
      
      <!-- Styled inner border -->
      <rect x="30" y="30" width="540" height="840" rx="15" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
      <rect x="45" y="45" width="510" height="810" rx="10" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
      
      <!-- Decorative Icon -->
      ${(icon.startsWith('/') || icon.startsWith('http'))
        ? `<image href="${icon.startsWith('http') ? icon : APP_URL + icon}" x="250" y="130" width="100" height="100" />`
        : `<text x="300" y="220" class="icon">${escapeSvg(icon)}</text>`}
      
      <!-- Title -->
      ${titleSvgText}
      
      <!-- Horizontal divider -->
      <line x1="220" y1="520" x2="380" y2="520" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round" />
      
      <!-- Author -->
      <text x="300" y="585" class="author">${escapeSvg(story.author || 'Tác giả')}</text>
      
      <!-- Bottom Badge (Genre) -->
      <g transform="translate(300, 720)">
        <rect x="-100" y="-22" width="200" height="44" rx="22" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
        <text y="6" class="genre">${escapeSvg(story.genre)}</text>
      </g>
      
      <!-- Sparkles decoration -->
      <circle cx="150" cy="150" r="3" fill="rgba(255,255,255,0.4)" />
      <circle cx="450" cy="150" r="4" fill="rgba(255,255,255,0.3)" />
      <circle cx="120" cy="780" r="5" fill="rgba(255,255,255,0.2)" />
      <circle cx="480" cy="780" r="3" fill="rgba(255,255,255,0.4)" />
    </svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  } catch (err) {
    res.status(500).send('Error generating cover');
  }
});

// ----------------- SEO AND STATIC ROUTING -----------------

// Helper to inject SEO tags into raw index.html
function injectSEO(html, { title, description, ogImage, ogUrl, jsonLdSchema, hostUrl }) {
  let injected = html;

  const finalHost = hostUrl || APP_URL;
  // Default values
  const finalTitle = title ? `${title} - MiraiStories` : 'MiraiStories';
  const finalDesc = description ? description.substring(0, 160).replace(/<[^>]*>/g, '') : 'Nền tảng viết truyện trực tuyến và chia sẻ tác phẩm cá nhân tuyệt đẹp với trải nghiệm đọc cao cấp.';
  const finalImage = ogImage || `${finalHost}/default-cover.png`;
  const finalUrl = ogUrl || finalHost;

  // Create OG meta tags string
  const ogTags = `
    <meta property="og:title" content="${finalTitle}">
    <meta property="og:description" content="${finalDesc}">
    <meta property="og:image" content="${finalImage}">
    <meta property="og:url" content="${finalUrl}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${finalTitle}">
    <meta name="twitter:description" content="${finalDesc}">
    <meta name="twitter:image" content="${finalImage}">
  `;

  const schemaScript = jsonLdSchema ? `<script type="application/ld+json">${JSON.stringify(jsonLdSchema)}</script>` : '';

  injected = injected.replace('<!-- SEO_TITLE -->', finalTitle);
  injected = injected.replace('<!-- SEO_DESC -->', finalDesc);
  injected = injected.replace('<!-- SEO_META_TAGS -->', ogTags);
  injected = injected.replace('<!-- SEO_SCHEMA -->', schemaScript);

  return injected;
}

// Load html template once or on request (on request is better in dev, once is better in prod)
const getIndexHtml = () => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  return `<!DOCTYPE html><html><head><title>WebTruyen</title></head><body>File index.html not ready yet.</body></html>`;
};

// Sitemap.xml route
app.get('/sitemap.xml', async (req, res) => {
  try {
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const stories = await Story.find();
    let urls = [
      `<url><loc>${hostUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
      `<url><loc>${hostUrl}/dashboard</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`
    ];

    for (const story of stories) {
      urls.push(`<url><loc>${hostUrl}/story/${story._id}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
      const chapters = await Chapter.find({ storyId: story._id, isDraft: false });
      for (const ch of chapters) {
        urls.push(`<url><loc>${hostUrl}/story/${story._id}/chapter/${ch._id}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>`);
      }
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('\n  ')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

// Robots.txt route
app.get('/robots.txt', (req, res) => {
  const hostUrl = `${req.protocol}://${req.get('host')}`;
  const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${hostUrl}/sitemap.xml`;
  res.setHeader('Content-Type', 'text/plain');
  res.send(robots);
});

// Server side SEO render for stories
app.get('/story/:id', async (req, res) => {
  try {
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const storyId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(404).send(injectSEO(getIndexHtml(), { title: 'Không tìm thấy truyện', hostUrl }));
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).send(injectSEO(getIndexHtml(), { title: 'Không tìm thấy truyện', hostUrl }));
    }

    const ogImage = (story.cover && (story.cover.startsWith('/') || story.cover.startsWith('http')))
      ? (story.cover.startsWith('http') ? story.cover : `${hostUrl}${story.cover}`)
      : `${hostUrl}/api/stories/${story._id}/cover.svg`;
    const ogUrl = `${hostUrl}/story/${story._id}`;

    const jsonLdSchema = {
      "@context": "https://schema.org",
      "@type": "Book",
      "@id": ogUrl,
      "name": story.title,
      "description": story.synopsis,
      "genre": story.genre,
      "author": {
        "@type": "Person",
        "name": story.author
      },
      "creativeWorkStatus": story.status,
      "interactionStatistic": {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/ViewAction",
        "userInteractionCount": story.reads
      }
    };

    const html = getIndexHtml();
    const seoHtml = injectSEO(html, {
      title: story.title,
      description: story.synopsis,
      ogImage,
      ogUrl,
      jsonLdSchema,
      hostUrl
    });

    res.send(seoHtml);
  } catch (err) {
    res.status(500).send('Internal server error');
  }
});

// Server side SEO render for chapters
app.get('/story/:storyId/chapter/:chapterId', async (req, res) => {
  try {
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    const { storyId, chapterId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storyId) || !mongoose.Types.ObjectId.isValid(chapterId)) {
      return res.status(404).send(injectSEO(getIndexHtml(), { title: 'Không tìm thấy chương', hostUrl }));
    }

    const story = await Story.findById(storyId);
    const chapter = await Chapter.findById(chapterId);

    if (!story || !chapter) {
      return res.status(404).send(injectSEO(getIndexHtml(), { title: 'Không tìm thấy trang', hostUrl }));
    }

    const ogImage = (story.cover && (story.cover.startsWith('/') || story.cover.startsWith('http')))
      ? (story.cover.startsWith('http') ? story.cover : `${hostUrl}${story.cover}`)
      : `${hostUrl}/api/stories/${story._id}/cover.svg`;
    const ogUrl = `${hostUrl}/story/${story._id}/chapter/${chapter._id}`;

    const excerpt = chapter.content ? chapter.content.substring(0, 160) + '...' : '';

    const jsonLdSchema = {
      "@context": "https://schema.org",
      "@type": "Chapter",
      "@id": ogUrl,
      "name": chapter.title,
      "headline": chapter.title,
      "position": chapter.order,
      "isPartOf": {
        "@type": "Book",
        "@id": `${hostUrl}/story/${story._id}`,
        "name": story.title
      },
      "wordCount": chapter.wordCount,
      "description": excerpt
    };

    const html = getIndexHtml();
    const seoHtml = injectSEO(html, {
      title: `${chapter.title} - ${story.title}`,
      description: excerpt,
      ogImage,
      ogUrl,
      jsonLdSchema,
      hostUrl
    });

    res.send(seoHtml);
  } catch (err) {
    res.status(500).send('Internal server error');
  }
});

// Creator Studio page route
app.get(['/creator', '/creator/*'], (req, res) => {
  const filePath = path.join(__dirname, 'public', 'creator.html');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Creator Studio template not ready.');
  }
});

// Serves the rest of the application
app.use(express.static(path.join(__dirname, 'public')));

// Fallback all non-file requests to index.html with default SEO (client handles routing)
app.get('*', (req, res) => {
  // If it's looking for a file that doesn't exist, return 404
  if (path.extname(req.path)) {
    return res.status(404).send('Not found');
  }
  const hostUrl = `${req.protocol}://${req.get('host')}`;
  res.send(injectSEO(getIndexHtml(), { hostUrl }));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running at ${APP_URL}`);
});

async function seedDatabase() {
  try {
    const genreCount = await Genre.countDocuments();
    if (genreCount === 0) {
      console.log('Seeding default genres...');
      const defaultGenres = [
        { name: 'Kỳ ảo / Tiên hiệp' },
        { name: 'Triết lý / Tâm linh' },
        { name: 'Lãng mạn / Ngôn tình' },
        { name: 'Đô thị / Đời thường' },
        { name: 'Khoa học viễn tưởng' },
        { name: 'Trinh thám / Huyền bí' }
      ];
      await Genre.insertMany(defaultGenres);
      console.log('Seeded default genres.');
    } else {
      console.log('Database already has genres. Skipping seeding to preserve custom data.');
    }
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}
