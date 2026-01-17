import { useState } from 'react';
import { useVideos } from '../contexts/VideoContext';
import { FiPlus, FiEdit2, FiTrash2, FiX, FiCheck, FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import openaiService from '../services/openaiService';
import './CategoryManager.css';

const CategoryManager = () => {
  const { categories, addCategory, updateCategory, deleteCategory, videos, updateVideo, settings } = useVideos();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: '#667eea' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [showCategoryList, setShowCategoryList] = useState(false);

  const colorPresets = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe',
    '#43e97b', '#fa709a', '#fee140', '#30cfd0',
    '#a8edea', '#ff6b6b', '#4ecdc4', '#45b7d1'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingId) {
      updateCategory(editingId, formData);
      setEditingId(null);
    } else {
      addCategory(formData);
    }

    setFormData({ name: '', color: '#667eea' });
    setShowAddForm(false);
  };

  const handleEdit = (category) => {
    setFormData({ name: category.name, color: category.color });
    setEditingId(category.id);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setFormData({ name: '', color: '#667eea' });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleDelete = (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? It will be removed from all videos.')) {
      deleteCategory(categoryId);
    }
  };

  const handleAutoCategorize = async () => {
    if (!settings.openaiApiKey) {
      alert('Please configure your OpenAI API key in Settings first.');
      return;
    }

    if (videos.length === 0) {
      alert('No videos to categorize. Please sync videos first.');
      return;
    }

    if (!window.confirm(`This will:\n1. Delete all existing categories\n2. Generate ${settings.categorizationPrompt.includes('6') ? '6' : 'new'} categories using AI\n3. Automatically assign all ${videos.length} videos to these categories\n\nContinue?`)) {
      return;
    }

    setIsUpdating(true);
    setUpdateMessage('Deleting existing categories...');

    try {
      // Step 1: Delete all existing categories
      console.log('Deleting existing categories:', categories.length);
      for (const category of categories) {
        deleteCategory(category.id);
      }

      // Clear all video category assignments
      console.log('Clearing video category assignments...');
      for (const video of videos) {
        updateVideo(video.id, { category: [] });
      }

      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Generate category names
      setUpdateMessage('Generating categories with OpenAI...');
      const categoryNames = await openaiService.autoCategorizeVideos(
        videos,
        settings.categorizationPrompt
      );

      console.log('Generated category names:', categoryNames);
      setUpdateMessage(`Created ${categoryNames.length} categories. Adding to system...`);

      // Step 3: Create new categories and collect their IDs
      const newCategoryIds = [];
      for (let i = 0; i < categoryNames.length; i++) {
        const categoryData = {
          name: categoryNames[i],
          color: colorPresets[i % colorPresets.length],
        };
        const newCategory = addCategory(categoryData);
        newCategoryIds.push(newCategory.id);
        console.log(`Created category: ${categoryNames[i]} with ID: ${newCategory.id}`);
      }

      // Wait for categories to be added
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Assign each video to categories
      setUpdateMessage('Assigning videos to categories...');
      let assignedCount = 0;

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        console.log(`Processing video ${i + 1}/${videos.length}: ${video.title}`);

        try {
          const categoryIndices = await openaiService.assignVideoToCategories(
            video,
            categoryNames
          );

          console.log(`Video "${video.title}" assigned to category indices:`, categoryIndices);

          if (categoryIndices.length > 0) {
            const categoryIds = categoryIndices.map(idx => newCategoryIds[idx]).filter(Boolean);
            console.log(`Assigning category IDs to video:`, categoryIds);
            updateVideo(video.id, { category: categoryIds });
            assignedCount++;
          } else {
            console.log(`No categories assigned for video: ${video.title}`);
          }

          setUpdateMessage(`Assigning videos: ${assignedCount}/${videos.length}`);

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error assigning video "${video.title}":`, error);
        }
      }

      setUpdateMessage(`Success! Categorized ${assignedCount} videos into ${categoryNames.length} categories.`);
      setTimeout(() => setUpdateMessage(''), 5000);
    } catch (error) {
      console.error('Auto-categorization error:', error);
      setUpdateMessage(`Error: ${error.message}`);
      setTimeout(() => setUpdateMessage(''), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="category-manager">
      <div className="category-header">
        <div className="header-left">
          <h3>Categories ({categories.length})</h3>
          <button
            onClick={() => setShowCategoryList(!showCategoryList)}
            className="toggle-list-btn"
            title={showCategoryList ? 'Hide categories' : 'Show categories'}
          >
            {showCategoryList ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        </div>
        <div className="header-actions">
          {!showAddForm && (
            <>
              <button
                onClick={handleAutoCategorize}
                className="update-categories-btn"
                disabled={isUpdating}
                title="Auto-generate categories using OpenAI"
              >
                {isUpdating ? <FiRefreshCw className="spinning" /> : <FiRefreshCw />}
                Update Categories
              </button>
              <button onClick={() => setShowAddForm(true)} className="add-category-btn">
                <FiPlus /> Add Category
              </button>
            </>
          )}
        </div>
      </div>

      {updateMessage && (
        <div className={`update-message ${updateMessage.includes('Error') ? 'error' : updateMessage.includes('Success') ? 'success' : 'info'}`}>
          {updateMessage}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="category-form">
          <div className="form-group">
            <label htmlFor="category-name">Category Name</label>
            <input
              id="category-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Programming, Design, Marketing"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="color-picker">
              {colorPresets.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.color === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">
              <FiCheck /> {editingId ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={handleCancel} className="cancel-btn">
              <FiX /> Cancel
            </button>
          </div>
        </form>
      )}

      {showCategoryList && (
        <div className="category-list">
          {categories.length === 0 ? (
            <p className="empty-message">No categories yet. Create one to get started!</p>
          ) : (
            categories.map(category => (
              <div key={category.id} className="category-item">
                <div className="category-info">
                  <span
                    className="category-color"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="category-name">{category.name}</span>
                  <span className="category-count">{category.videoCount || 0} videos</span>
                </div>
                <div className="category-actions">
                  <button
                    onClick={() => handleEdit(category)}
                    className="edit-btn"
                    title="Edit category"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="delete-btn"
                    title="Delete category"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
